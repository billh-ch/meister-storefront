import type { Product } from '@/lib/mock-data'
import type { WcProduct } from '../queries/get-products'
import { mapCategorySlug } from './category-map'
import { resolveImageUrl } from './resolve-image-url'

export function mapProduct(product: WcProduct): Product {
  return {
    id: String(product.id),
    slug: product.slug,
    name: product.name,
    price: Number.parseFloat(product.price) || 0,
    // Phase 1 (homepage): variations aren't fetched, so size/color options
    // and swatches stay empty. ProductCard renders both defensively.
    options: '',
    image: resolveImageUrl(product.images[0]?.src ?? ''),
    swatches: [],
    category: mapCategorySlug(product.categories.map(c => c.id)),
  }
}
