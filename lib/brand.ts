import type { Product } from '@/lib/mock-data'

/** Manufacturer value the store uses for its own gear (WooCommerce `Εταιρία` attribute). */
export const MEISTER_BRAND = 'Meister'

/**
 * True only when the product is explicitly branded Meister. Products with an
 * unset brand are treated as third-party — the homepage category rail is a
 * Meister showcase, so "unknown" should not leak in.
 */
export function isMeisterMade(product: Pick<Product, 'brand'>): boolean {
  return product.brand === MEISTER_BRAND
}
