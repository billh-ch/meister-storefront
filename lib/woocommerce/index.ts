import type { Product, ProductDetail } from '@/lib/mock-data'
import { products as mockProducts, toMockProductDetail } from '@/lib/mock-data'
import type { Order } from '@/lib/orders'
import { fetchProducts } from './queries/get-products'
import { fetchProductBySlug, fetchVariations } from './queries/get-product-by-slug'
import { fetchProductById } from './queries/get-product-by-id'
import { fetchOrdersByCustomer } from './queries/get-orders-by-customer'
import { fetchWcCustomerById, type WcCustomerWithAddress } from './queries/get-customer-by-id'
import { fetchShippingRates, type StoreApiAddress } from './queries/get-shipping-rates'
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
 *  UI, so a courier method, a locker-network plugin (BOX NOW Delivery), or
 *  anything else an admin adds shows up automatically with its real,
 *  live-computed title/cost. */
export interface ShippingMethod {
  /** WooCommerce's own Store API `rate_id` (e.g. `flat_rate:1`,
   *  `box_now_delivery`) — used to identify the shopper's selection through
   *  the checkout form and re-validate it server-side; never itself sent to
   *  the order-creation endpoint (see `wcMethodId` for that). */
  id: string
  /** WooCommerce's method *type* (`flat_rate`, `free_shipping`,
   *  `local_pickup`, or a plugin's own slug) — this is what an order's
   *  `shipping_lines[].method_id` expects. */
  wcMethodId: string
  title: string
  cost: number
  isPickup: boolean
}

export interface ShippingCartItem {
  productId: string
  quantity: number
  /** Every variation axis the shopper picked (`ResolvedCartLine.attributes`)
   *  — empty/omitted for a simple product. */
  attributes?: Record<string, string>
}

/** A single flat-rate placeholder for mock-data mode — there's no mock
 *  WooCommerce shipping config to read, and checkout must still render
 *  something. Never reached against the live store. */
const MOCK_SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'mock:1', wcMethodId: 'flat_rate', title: 'Standard Delivery', cost: 5, isPickup: false },
]

/**
 * Resolves the delivery methods a shopper can actually pick, by running
 * their real cart + shipping address through WooCommerce's own Store API
 * rate calculation (`fetchShippingRates`) — so what's shown here is exactly
 * what `createCheckoutSessionAction` (`lib/checkout/actions.ts`)
 * re-validates and charges, computed the same way a native WooCommerce
 * checkout would compute it (zone matching, free-shipping eligibility, and
 * any plugin's own runtime pricing all handled by WooCommerce itself, not
 * reimplemented here).
 */
export async function getShippingMethods(
  items: ShippingCartItem[],
  address: StoreApiAddress,
): Promise<ShippingMethod[]> {
  if (useMock) return MOCK_SHIPPING_METHODS

  const rates = await fetchShippingRates(
    items.map((item) => ({
      productId: Number(item.productId),
      quantity: item.quantity,
      variationAttributes: item.attributes,
    })),
    address,
  )

  return rates.map((rate) => ({
    id: rate.rate_id,
    wcMethodId: rate.method_id,
    title: rate.name,
    cost: Number.parseInt(rate.price, 10) / 10 ** rate.currency_minor_unit,
    isPickup: rate.method_id === 'local_pickup',
  }))
}
