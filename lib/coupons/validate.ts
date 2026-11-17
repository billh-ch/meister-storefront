import { wcFetch } from '@/lib/woocommerce/client'
import type { ResolvedCart } from '@/lib/cart/resolve'
import { evaluateCoupon, normalizeCouponCode, type CouponResult, type WcCoupon } from './evaluate'

/** Live lookup: coupon state (expiry, usage) must never come from a cache. */
async function fetchCoupon(code: string): Promise<WcCoupon | null> {
  const coupons = await wcFetch<WcCoupon[]>('/coupons', { code, per_page: '10' })
  return coupons.find(coupon => coupon.code.toLowerCase() === code.toLowerCase()) ?? null
}

/**
 * Validates a shopper's code against WooCommerce and the resolved cart.
 * Anything not definitively valid is a failure — including a WooCommerce
 * outage, which must never grant a discount.
 */
export async function validateCoupon(
  rawCode: unknown,
  cart: ResolvedCart,
  context: { email?: string; customerId?: number },
): Promise<CouponResult> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
    return { ok: false, error: 'Discount codes are unavailable in demo mode.' }
  }
  const code = normalizeCouponCode(rawCode)
  if (!code) return { ok: false, error: "This discount code isn't valid." }

  let coupon: WcCoupon | null
  try {
    coupon = await fetchCoupon(code)
  } catch {
    return { ok: false, error: 'Could not check this discount code. Please try again.' }
  }
  if (!coupon) return { ok: false, error: "This discount code isn't valid." }

  return evaluateCoupon(
    coupon,
    cart.lines.map(line => ({
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      onSale: line.onSale,
      purchasable: line.purchasable,
    })),
    { now: Date.now(), ...context },
  )
}
