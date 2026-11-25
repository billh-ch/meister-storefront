/**
 * After the paid webhook creates the WooCommerce order, WooCommerce has
 * priced it itself. Whenever that pricing is not a plain copy of the product
 * price (a discount code, or add-ons priced by the meister-product-addons
 * plugin), check it agrees with what Stripe actually charged.
 *
 * Returns the private note for the shop team on a difference, or `null`.
 * Compared in whole cents: euro floats can turn a one-cent difference into
 * 0.00999…. A difference never blocks the order — the customer has paid.
 */
export function orderTotalCheck(input: {
  orderTotal: string | undefined
  amountTotalCents: number | null | undefined
  couponCode?: string
  hasAddons: boolean
}): string | null {
  if (!input.couponCode && !input.hasAddons) return null
  if (typeof input.amountTotalCents !== 'number' || !Number.isInteger(input.amountTotalCents)) return null
  const parsed = Number.parseFloat(input.orderTotal ?? '')
  const wooCents = Number.isFinite(parsed) ? Math.round(parsed * 100) : Number.NaN
  if (wooCents === input.amountTotalCents) return null
  const paid = (input.amountTotalCents / 100).toFixed(2)
  const woo = Number.isFinite(wooCents) ? (wooCents / 100).toFixed(2) : 'an unreadable amount'
  const reasons = [
    ...(input.couponCode ? [`discount code ${input.couponCode}`] : []),
    ...(input.hasAddons ? ['product add-ons'] : []),
  ].join(' and ')
  return `Total check: Stripe charged €${paid} but WooCommerce computed €${woo} for this order with ${reasons}. Please review before fulfilling.`
}
