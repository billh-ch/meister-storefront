import type { Product, ProductDetail } from '@/lib/mock-data'
import { products as mockProducts, toMockProductDetail } from '@/lib/mock-data'
import { fetchProducts } from './queries/get-products'
import { fetchProductBySlug, fetchVariations } from './queries/get-product-by-slug'
import { mapProduct } from './mappers/map-product'
import { mapProductDetail } from './mappers/map-product-detail'

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
