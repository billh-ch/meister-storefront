import type { Product, CategoryDetail } from '@/lib/mock-data'
import {
  products as mockProducts,
  categoryDetails as mockCategoryDetails,
} from '@/lib/mock-data'
import { fetchProducts } from './queries/get-products'
import { fetchCategories } from './queries/get-all-categories'
import { mapProduct } from './mappers/map-product'
import { mapCategory } from './mappers/map-category'

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

export async function getProducts(): Promise<Product[]> {
  if (useMock) return mockProducts

  try {
    const bcProducts = await fetchProducts()
    return bcProducts.map(mapProduct)
  } catch (error) {
    console.error('[BigCommerce] Failed to fetch products, falling back to mock data:', error)
    return mockProducts
  }
}

export async function getCategoryDetails(): Promise<readonly CategoryDetail[]> {
  if (useMock) return mockCategoryDetails

  try {
    const bcCategories = await fetchCategories()
    return bcCategories.map(mapCategory)
  } catch (error) {
    console.error('[BigCommerce] Failed to fetch categories, falling back to mock data:', error)
    return mockCategoryDetails
  }
}
