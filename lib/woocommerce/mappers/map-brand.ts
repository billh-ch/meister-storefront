import type { WcProductAttribute } from '../queries/get-products'

/**
 * The store records manufacturer as a non-variation product attribute named
 * `Εταιρία` (taxonomy slug `pa_εταιρία`), single value, e.g. `Meister`,
 * `Mares`, `Pathos`. Returns `null` when the attribute is absent or empty.
 */
const BRAND_ATTRIBUTE_SLUG = 'pa_εταιρία'
const BRAND_ATTRIBUTE_NAME = 'εταιρία'

export function mapBrand(
  attributes: readonly WcProductAttribute[] | undefined,
  brands?: readonly { name?: string }[] | undefined,
): string | null {
  // WooCommerce's built-in Brands taxonomy (used by the new catalog) wins.
  const native = brands?.find(brand => brand.name?.trim())?.name?.trim()
  if (native) return native

  const attribute = attributes?.find(
    (candidate) =>
      candidate.slug?.toLowerCase() === BRAND_ATTRIBUTE_SLUG ||
      candidate.name?.trim().toLowerCase() === BRAND_ATTRIBUTE_NAME,
  )

  return attribute?.options?.[0]?.trim() || null
}
