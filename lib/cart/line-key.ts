import type { CartItem } from './schema'

/**
 * The identity of a cart line. Two adds collapse into one line only when
 * this string matches — so the same product in a different size/colour, or
 * even the same `variationId` with different "Any …" axis picks (WooCommerce
 * leaves those off the variation), stays a separate line the shopper can see
 * and edit on its own.
 *
 * Shared by `lib/cart/actions.ts` (merge/update/remove) and
 * `lib/cart/resolve.ts` (dedup) so the two can never disagree about which
 * cookie entries are "the same line".
 */
export function cartLineKey(
  item: Pick<CartItem, 'productId' | 'variationId' | 'selectedOptions'>,
): string {
  return `${item.productId}:${item.variationId ?? ''}:${serializeOptions(item.selectedOptions)}`
}

/** Deterministic (key-sorted) so `{a,b}` and `{b,a}` produce the same string. */
function serializeOptions(options: Record<string, string> | undefined): string {
  if (!options) return ''
  const keys = Object.keys(options).sort()
  if (keys.length === 0) return ''
  return keys.map((key) => `${key}=${options[key]}`).join('|')
}
