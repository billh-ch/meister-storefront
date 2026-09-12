export interface StoreApiCartItemInput {
  productId: number
  quantity: number
  /** Full attribute name→value map for a variation line (from
   *  `ResolvedCartLine.attributes`, `lib/cart/resolve.ts`) — the Store API
   *  needs every "used for variations" axis specified, even ones the
   *  variation itself leaves "Any …", or it 400s with a "required field"
   *  error. Omitted (or empty) for a simple, non-variable product. */
  variationAttributes?: Record<string, string>
}

export interface StoreApiAddress {
  country: string
  city?: string
  postcode?: string
  address1?: string
}

export interface StoreApiShippingRate {
  rate_id: string
  method_id: string
  name: string
  /** Minor-unit integer string, e.g. `"200"` — divide by
   *  `10 ** currency_minor_unit` for the real amount. */
  price: string
  currency_minor_unit: number
}

interface StoreApiCartResponse {
  shipping_rates: { shipping_rates: StoreApiShippingRate[] }[]
}

interface StoreApiSession {
  nonce: string
  cartToken: string
}

function storeApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_WC_URL
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_WC_URL is not configured')
  }
  return `${baseUrl.replace(/\/$/, '')}/wp-json/wc/store/v1${path}`
}

/** The Store API is stateless via the `Nonce`/`Cart-Token` headers alone —
 *  no cookies needed, confirmed against the live store — so a throwaway
 *  session here never touches this app's own `mm_cart` cookie. */
async function storeApiRequest<T>(
  path: string,
  session: StoreApiSession | null,
  body?: unknown,
): Promise<{ data: T; session: StoreApiSession }> {
  const response = await fetch(storeApiUrl(path), {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(session && { Nonce: session.nonce, 'Cart-Token': session.cartToken }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })

  if (!response.ok) {
    throw new Error(`WooCommerce Store API request failed: ${response.status} ${response.statusText}`)
  }

  return {
    data: (await response.json()) as T,
    session: {
      nonce: response.headers.get('x-wc-store-api-nonce') ?? session?.nonce ?? '',
      cartToken: response.headers.get('cart-token') ?? session?.cartToken ?? '',
    },
  }
}

/**
 * Runs the shopper's real cart + shipping address through WooCommerce's own
 * live rate calculation — the Store API, the same engine the block-based
 * WooCommerce checkout itself uses — rather than reading each shipping
 * method's admin-configured settings and reimplementing zone/eligibility
 * logic ourselves.
 *
 * That reimplementation approach (this file's previous version) breaks for
 * a method like the BOX NOW Delivery plugin: it computes its price at
 * runtime and the regular `/shipping/zones/.../methods` endpoint returns an
 * empty settings object for it (confirmed against the live store) — the
 * Store API is the only place that price is ever actually available, and
 * it works uniformly for every method type (flat rate, free shipping,
 * pickup, a courier plugin) with no per-method special-casing here.
 */
export async function fetchShippingRates(
  items: StoreApiCartItemInput[],
  address: StoreApiAddress,
): Promise<StoreApiShippingRate[]> {
  if (items.length === 0) return []

  let session: StoreApiSession
  {
    const initial = await storeApiRequest<unknown>('/cart', null)
    session = initial.session
  }

  for (const item of items) {
    const variation =
      item.variationAttributes && Object.keys(item.variationAttributes).length > 0
        ? Object.entries(item.variationAttributes).map(([attribute, value]) => ({ attribute, value }))
        : undefined

    const added = await storeApiRequest<unknown>('/cart/add-item', session, {
      id: item.productId,
      quantity: item.quantity,
      ...(variation && { variation }),
    })
    session = added.session
  }

  const { data } = await storeApiRequest<StoreApiCartResponse>('/cart/update-customer', session, {
    shipping_address: {
      country: address.country,
      city: address.city ?? '',
      postcode: address.postcode ?? '',
      address_1: address.address1 ?? '',
    },
  })

  return data.shipping_rates?.[0]?.shipping_rates ?? []
}
