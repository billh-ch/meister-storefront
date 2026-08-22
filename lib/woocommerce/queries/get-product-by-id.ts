import { wcFetchOrNull } from '../client'
import type { WcProductDetail } from './get-product-by-slug'

/** Same ISR window as `fetchProductBySlug` — see get-product-by-slug.ts. */
const DETAIL_REVALIDATE = 30

/**
 * Fetches a single product by its numeric WooCommerce id — used to
 * re-resolve cart lines (which only ever store an id, never a cached
 * name/price). Returns `null` on a genuine 404 (the id no longer exists),
 * which callers must treat as "drop this line", not as a transient failure.
 */
export async function fetchProductById(id: string): Promise<WcProductDetail | null> {
  return wcFetchOrNull<WcProductDetail>(`/products/${id}`, undefined, {
    revalidate: DETAIL_REVALIDATE,
    tags: ['products', `product:${id}`],
  })
}
