import type { Product, ProductDetail } from '@/lib/mock-data'
import { products as mockProducts, toMockProductDetail } from '@/lib/mock-data'
import type { Order } from '@/lib/orders'
import { fetchProducts } from './queries/get-products'
import { fetchProductBySlug, fetchVariations } from './queries/get-product-by-slug'
import { fetchProductById } from './queries/get-product-by-id'
import { fetchOrdersByCustomer } from './queries/get-orders-by-customer'
import { fetchWcCustomerById, type WcCustomerWithAddress } from './queries/get-customer-by-id'
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
