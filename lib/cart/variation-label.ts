/**
 * Renders a resolved cart line's variation attributes as one human-readable
 * string, e.g. `"Μέγεθος: L · Χρώμα: Μαύρο"`. Returns `''` for a simple
 * product (no variation), so callers can `label && <…>`.
 *
 * Shared by the cart page, the checkout order summary, and the Stripe
 * line-item names. UI callers can translate labels without changing the raw
 * default used by integrations or any stored attribute identity.
 */
export function formatVariationLabel(
  attributes: Record<string, string>,
  separator = ' · ',
  displayName: (name: string) => string = name => name,
): string {
  return Object.entries(attributes)
    .map(([name, value]) => `${displayName(name)}: ${value}`)
    .join(separator)
}
