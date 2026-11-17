/**
 * Pure coupon rules. No network, no WooCommerce client — everything the
 * decision needs is passed in, so it is exhaustively unit-testable.
 *
 * Deliberately a small, honest subset of WooCommerce's coupon engine:
 * percentage and fixed-cart discounts, expiry, usage limits, spend limits and
 * product restrictions. Anything else is *rejected*, never silently ignored,
 * so a shop admin can never believe a restriction is being enforced when it
 * is not. Discounts apply to products only — never to delivery.
 */

/** Subset of WooCommerce's REST v3 coupon resource that this module reads. */
export interface WcCoupon {
  id: number
  code: string
  status: string
  discount_type: string
  amount: string
  date_expires_gmt?: string | null
  usage_count?: number
  usage_limit?: number | null
  usage_limit_per_user?: number | null
  free_shipping?: boolean
  exclude_sale_items?: boolean
  minimum_amount?: string
  maximum_amount?: string
  product_ids?: number[]
  excluded_product_ids?: number[]
  product_categories?: number[]
  excluded_product_categories?: number[]
  email_restrictions?: string[]
  used_by?: string[]
}

export interface CouponLine {
  productId: string
  quantity: number
  /** Gross unit price in euros, as charged. */
  unitPrice: number
  onSale: boolean
  purchasable: boolean
}

export interface CouponContext {
  /** Epoch milliseconds. Injected so expiry is testable. */
  now: number
  /** Known at payment time; may be missing while the shopper is still typing. */
  email?: string
  customerId?: number
}

export type CouponResult =
  | { ok: true; code: string; discountCents: number }
  | { ok: false; error: string; values?: Record<string, string | number> }

/** Printable, bounded and free of control characters. WooCommerce matches case-insensitively. */
const CODE_PATTERN = /^[\p{L}\p{N}_\-. ]{1,50}$/u

export function normalizeCouponCode(input: unknown): string | null {
  if (typeof input !== 'string') return null
  if (/[\u0000-\u001f\u007f]/.test(input)) return null
  const code = input.trim().replace(/ {2,}/g, ' ')
  return CODE_PATTERN.test(code) ? code : null
}

const toCents = (value: string | number | undefined | null): number => {
  const number = typeof value === 'number' ? value : Number.parseFloat(value ?? '')
  return Number.isFinite(number) ? Math.round(number * 100) : 0
}

const euros = (cents: number) => `€${(cents / 100).toFixed(2)}`
const INVALID = { ok: false as const, error: "This discount code isn't valid." }

export function evaluateCoupon(coupon: WcCoupon, lines: CouponLine[], context: CouponContext): CouponResult {
  if (coupon.status !== 'publish') return INVALID

  // Reject unsupported configuration instead of ignoring it.
  const unsupported =
    coupon.free_shipping === true ||
    (coupon.discount_type !== 'percent' && coupon.discount_type !== 'fixed_cart') ||
    (coupon.product_categories?.length ?? 0) > 0 ||
    (coupon.excluded_product_categories?.length ?? 0) > 0 ||
    (coupon.email_restrictions?.length ?? 0) > 0
  if (unsupported) return { ok: false, error: "This discount code can't be used online." }

  if (coupon.date_expires_gmt) {
    const expires = Date.parse(`${coupon.date_expires_gmt}Z`)
    if (Number.isFinite(expires) && context.now > expires) return { ok: false, error: 'This discount code has expired.' }
  }

  const limit = coupon.usage_limit ?? 0
  if (limit > 0 && (coupon.usage_count ?? 0) >= limit) {
    return { ok: false, error: 'This discount code has reached its usage limit.' }
  }

  const perUser = coupon.usage_limit_per_user ?? 0
  if (perUser > 0) {
    const identities = new Set<string>()
    if (context.email) identities.add(context.email.trim().toLowerCase())
    if (context.customerId) identities.add(String(context.customerId))
    const used = (coupon.used_by ?? []).filter(entry => identities.has(String(entry).trim().toLowerCase())).length
    if (used >= perUser) return { ok: false, error: 'You have already used this discount code.' }
  }

  const purchasable = lines.filter(line => line.purchasable)
  const cents = (line: CouponLine) => Math.round(line.unitPrice * 100) * line.quantity
  const cartCents = purchasable.reduce((sum, line) => sum + cents(line), 0)

  const minimum = toCents(coupon.minimum_amount)
  if (minimum > 0 && cartCents < minimum) {
    return { ok: false, error: 'Spend at least {amount} to use this code.', values: { amount: euros(minimum) } }
  }
  const maximum = toCents(coupon.maximum_amount)
  if (maximum > 0 && cartCents > maximum) {
    return { ok: false, error: 'This code only applies to orders up to {amount}.', values: { amount: euros(maximum) } }
  }

  const only = new Set((coupon.product_ids ?? []).map(String))
  const excluded = new Set((coupon.excluded_product_ids ?? []).map(String))
  const eligible = purchasable.filter(line =>
    (only.size === 0 || only.has(line.productId)) &&
    !excluded.has(line.productId) &&
    !(coupon.exclude_sale_items && line.onSale))
  const eligibleCents = eligible.reduce((sum, line) => sum + cents(line), 0)
  if (eligibleCents <= 0) return { ok: false, error: "This code doesn't apply to the items in your cart." }

  const amount = Number.parseFloat(coupon.amount)
  if (!Number.isFinite(amount) || amount <= 0) return INVALID
  const raw = coupon.discount_type === 'percent' ? Math.round(eligibleCents * Math.min(amount, 100) / 100) : toCents(amount)
  const discountCents = Math.min(raw, eligibleCents)
  if (discountCents <= 0) return INVALID

  return { ok: true, code: coupon.code, discountCents }
}
