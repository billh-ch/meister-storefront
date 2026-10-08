import { wcFetchOrNull } from '../client'
import type { WcProductDetail } from './get-product-by-slug'

/**
 * Fetches a single product by its numeric WooCommerce id — used to
 * re-resolve cart lines (which only ever store an id, never a cached
 * name/price). Always fetched fresh for payment/stock validation. Returns
 * `null` on a genuine 404 (the id no longer exists),
 * which callers must treat as "drop this line", not as a transient failure.
 */
export async function fetchProductById(id: string): Promise<WcProductDetail | null> {
  return wcFetchOrNull<WcProductDetail>(`/products/${id}`, undefined, {
    revalidate: 0,
  })
}
