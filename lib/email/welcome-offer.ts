import { fetchCoupon } from '@/lib/coupons/validate'
import type { WelcomeOffer } from './templates/account'

/**
 * The welcome discount is an ordinary WooCommerce coupon named by
 * WELCOME_COUPON_CODE. It is only advertised while that coupon is currently
 * usable as a percentage discount, so an expired or disabled coupon never
 * makes the email promise something checkout would refuse.
 */
export async function currentWelcomeOffer(now = Date.now()): Promise<WelcomeOffer | null> {
  const code = process.env.WELCOME_COUPON_CODE?.trim()
  if (!code) return null
  try {
    const coupon = await fetchCoupon(code)
    if (!coupon || coupon.status !== 'publish' || coupon.discount_type !== 'percent') return null
    if (coupon.date_expires_gmt && now > Date.parse(`${coupon.date_expires_gmt}Z`)) return null
    if ((coupon.usage_limit ?? 0) > 0 && (coupon.usage_count ?? 0) >= coupon.usage_limit!) return null
    const percent = Number.parseFloat(coupon.amount)
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null
    return { code: coupon.code, percent: Number.isInteger(percent) ? percent : Math.round(percent * 100) / 100 }
  } catch {
    return null
  }
}
