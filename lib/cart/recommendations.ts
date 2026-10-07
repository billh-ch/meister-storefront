import type { Product } from '../mock-data'

/** Category-based suggestions, never claimed to be purchase-history data. */
export function selectCartRecommendations(products: Product[], cartProductIds: string[]): Product[] {
  if (cartProductIds.length === 0) return []
  const excluded = new Set(cartProductIds)
  const categories = new Set(products.filter(product => excluded.has(product.id)).map(product => product.category))
  const seen = new Set<string>()
  return products
    .filter(product => {
      if (excluded.has(product.id) || seen.has(product.id) || product.stockStatus === 'outofstock') return false
      seen.add(product.id)
      return true
    })
    .sort((a, b) => Number(categories.has(b.category)) - Number(categories.has(a.category)))
    .slice(0, 6)
}
