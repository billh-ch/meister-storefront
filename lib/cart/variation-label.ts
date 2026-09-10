/**
 * Renders a resolved cart line's variation attributes as one human-readable
 * string, e.g. `"Μέγεθος: L · Χρώμα: Μαύρο"`. Returns `''` for a simple
 * product (no variation), so callers can `label && <…>`.
 *
 * Shared by the cart page, the checkout order summary, and the Stripe
 * line-item names so the three can't drift apart.
 */
export function formatVariationLabel(
  attributes: Record<string, string>,
  separator = ' · ',
): string {
  return Object.entries(attributes)
    .map(([name, value]) => `${name}: ${value}`)
    .join(separator)
}
