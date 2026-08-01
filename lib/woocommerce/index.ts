import type { Product } from '@/lib/mock-data'
import { products as mockProducts } from '@/lib/mock-data'
import { fetchProducts } from './queries/get-products'
import { mapProduct } from './mappers/map-product'

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
