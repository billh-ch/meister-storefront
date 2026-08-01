import type { Product } from '@/lib/mock-data'
import type { WcProduct } from '../queries/get-products'
import { mapCategorySlug } from './category-map'

/**
 * WooCommerce returns media URLs on the store's internal siteurl (e.g. a
 * LocalWP `*.local` domain), which only resolves on the machine running
 * WordPress. Rewrite to the WC base URL's origin (the ngrok tunnel) so
 * images are reachable from wherever this app runs.
 */
function resolveImageUrl(rawUrl: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_WC_URL
  if (!baseUrl || !rawUrl) return rawUrl

  try {
    const image = new URL(rawUrl)
    const base = new URL(baseUrl)
    image.protocol = base.protocol
    image.host = base.host
    return image.toString()
  } catch {
    return rawUrl
  }
}

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
