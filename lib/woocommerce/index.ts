import type { Product, ProductDetail } from '@/lib/mock-data'
import { products as mockProducts, toMockProductDetail } from '@/lib/mock-data'
import type { Order } from '@/lib/orders'
import { fetchProducts } from './queries/get-products'
import { fetchProductBySlug, fetchVariations } from './queries/get-product-by-slug'
import { fetchProductById } from './queries/get-product-by-id'
import { fetchOrdersByCustomer } from './queries/get-orders-by-customer'
import { fetchWcCustomerById, type WcCustomerWithAddress } from './queries/get-customer-by-id'
import {
  fetchShippingZones,
  fetchShippingZoneLocations,
  fetchShippingZoneMethods,
  fetchContinentCountries,
  WC_FALLBACK_ZONE_ID,
  type WcShippingZone,
  type WcShippingMethod,
} from './queries/get-shipping-zones'
import { mapProduct } from './mappers/map-product'
import { mapProductDetail } from './mappers/map-product-detail'
import { mapOrder } from './mappers/map-order'

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

export async function getProducts(): Promise<Product[]> {
  if (useMock) return mockProducts

  try {
    const wcProducts = await fetchProducts()
    return wcProducts.map(mapProduct)
  } catch (error) {
    console.error('[WooCommerce] Failed to fetch products, falling back to mock data:', error)
    return mockProducts
  }
}

function findMockDetail(slug: string): ProductDetail | null {
  const product = mockProducts.find((candidate) => candidate.slug === slug)
  return product ? toMockProductDetail(product) : null
}

/**
 * The error handling here is deliberately asymmetric:
 *
 * - A `null` from WooCommerce means the product genuinely doesn't exist, so
 *   it propagates as `null` and the route renders a real 404. Falling back
 *   to mock data on a genuine miss would resurrect deleted products as
 *   phantom pages that search engines would happily index.
 * - A *thrown* error means the store is unreachable (tunnel down, bad
 *   credentials), so it falls back to mock data exactly like getProducts().
 */
export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  if (useMock) return findMockDetail(slug)

  try {
    const wcProduct = await fetchProductBySlug(slug)
    if (!wcProduct) return null

    const variations =
      wcProduct.type === 'variable' ? await fetchVariations(wcProduct.id) : []

    return mapProductDetail(wcProduct, variations)
  } catch (error) {
    console.error(
      `[WooCommerce] Failed to fetch product "${slug}", falling back to mock data:`,
      error,
    )
    return findMockDetail(slug)
  }
}

/**
 * Fetches a single product by numeric id — used to re-resolve cart lines
 * against live price/stock. Deliberately **no mock-data fallback on a
 * thrown error**, unlike `getProducts`/`getProductBySlug` above: silently
 * repricing a real shopper's cart against fake data on a WooCommerce outage
 * is worse than the read-only browsing fallback those use. A thrown error
 * here should surface as an explicit "couldn't verify your cart" state.
 */
export async function getProductById(id: string): Promise<ProductDetail | null> {
  if (useMock) {
    const product = mockProducts.find((candidate) => candidate.id === id)
    return product ? toMockProductDetail(product) : null
  }

  const wcProduct = await fetchProductById(id)
  if (!wcProduct) return null

  const variations =
    wcProduct.type === 'variable' ? await fetchVariations(wcProduct.id) : []

  return mapProductDetail(wcProduct, variations)
}

/** No mock fallback and no mock data at all here — there's no real order
 *  history to fabricate for a mock signed-in shopper. */
export async function getOrdersByCustomer(customerId: number): Promise<Order[]> {
  if (useMock) return []

  const orders = await fetchOrdersByCustomer(customerId)
  return orders.map(mapOrder)
}

/** No mock fallback — same reasoning as getOrdersByCustomer/getProductById:
 *  never fabricate a signed-in customer's own saved address. */
export async function getWcCustomerById(id: number): Promise<WcCustomerWithAddress | null> {
  if (useMock) return null
  return fetchWcCustomerById(id)
}

/** Customer-facing delivery choice, resolved from whatever a shop admin has
 *  actually configured in WooCommerce → Settings → Shipping — no method
 *  type is hardcoded beyond recognizing `local_pickup` for pickup-specific
 *  UI, so a courier method, a future "BoxNow" locker method, or anything
 *  else an admin adds shows up automatically with its real title/cost. */
export interface ShippingMethod {
  /** Unique across zones (`${zoneId}:${instanceId}`) — only used to identify
   *  the shopper's selection through the checkout form and re-validate it
   *  server-side; never sent to WooCommerce. */
  id: string
  /** WooCommerce's method *type* (`flat_rate`, `free_shipping`,
   *  `local_pickup`, or a plugin's own slug) — this is what an order's
   *  `shipping_lines[].method_id` expects. */
  wcMethodId: string
  title: string
  cost: number
  isPickup: boolean
}

/** A single flat-rate placeholder for mock-data mode — there's no mock
 *  WooCommerce shipping config to read, and checkout must still render
 *  something. Never reached against the live store. */
const MOCK_SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'mock:1', wcMethodId: 'flat_rate', title: 'Standard Delivery', cost: 5, isPickup: false },
]

/**
 * Resolves the delivery methods a shopper can actually pick for their
 * shipping country and current cart subtotal — mirrors how WooCommerce
 * itself would price the cart at checkout, so what's shown here is exactly
 * what `createCheckoutSessionAction` (`lib/checkout/actions.ts`) re-validates
 * and charges.
 *
 * Zone matching: an exact country match wins; failing that, a zone scoped by
 * continent (e.g. "Europe") wins if the country belongs to it; failing that,
 * WooCommerce's own catch-all zone 0. This mirrors WooCommerce's own
 * most-specific-wins behavior closely enough for a store with one zone per
 * country/continent — it does not attempt WooCommerce's full state/postcode
 * zone-priority rules, since this storefront never collects a state.
 */
export async function getShippingMethods(
  countryCode: string,
  subtotal: number,
): Promise<ShippingMethod[]> {
  if (useMock) return MOCK_SHIPPING_METHODS

  const zones = await fetchShippingZones()
  const zoneId = await resolveShippingZoneId(zones, countryCode)
  const methods = await fetchShippingZoneMethods(zoneId)

  return methods
    .filter((method) => method.enabled && isShippingMethodEligible(method, subtotal))
    .map((method) => toShippingMethod(zoneId, method))
}

async function resolveShippingZoneId(zones: WcShippingZone[], countryCode: string): Promise<number> {
  const candidates = zones.filter((zone) => zone.id !== WC_FALLBACK_ZONE_ID)
  const withLocations = await Promise.all(
    candidates.map(async (zone) => ({ zone, locations: await fetchShippingZoneLocations(zone.id) })),
  )

  const countryMatch = withLocations.find(({ locations }) =>
    locations.some((location) => location.type === 'country' && location.code === countryCode),
  )
  if (countryMatch) return countryMatch.zone.id

  for (const { zone, locations } of withLocations) {
    const continentLocation = locations.find((location) => location.type === 'continent')
    if (!continentLocation) continue
    const countries = await fetchContinentCountries(continentLocation.code)
    if (countries.includes(countryCode)) return zone.id
  }

  return WC_FALLBACK_ZONE_ID
}

/** `free_shipping`'s own "requires" setting decides whether the current
 *  subtotal actually qualifies — never offer it as a choice the order won't
 *  really get for free. Coupons aren't implemented in this storefront, so a
 *  `coupon`-only requirement can never be satisfied here. */
function isShippingMethodEligible(method: WcShippingMethod, subtotal: number): boolean {
  if (method.method_id !== 'free_shipping') return true

  const requires = method.settings.requires?.value ?? ''
  if (requires === 'coupon') return false

  const minAmount = Number.parseFloat(method.settings.min_amount?.value ?? '0') || 0
  return subtotal >= minAmount
}

function toShippingMethod(zoneId: number, method: WcShippingMethod): ShippingMethod {
  const cost = Number.parseFloat(method.settings.cost?.value ?? '0') || 0
  const title = method.settings.title?.value || method.title || method.method_title

  return {
    id: `${zoneId}:${method.instance_id}`,
    wcMethodId: method.method_id,
    title,
    cost,
    isPickup: method.method_id === 'local_pickup',
  }
}
