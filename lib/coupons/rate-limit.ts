import { getRedis } from '@/lib/redis'

const WINDOW_SECONDS = 600
const MAX_ATTEMPTS = 20

/** Client address as set by the hosting proxy; one shared bucket if absent. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (forwarded || request.headers.get('x-real-ip') || 'unknown').slice(0, 64)
}

/**
 * Coupon checks hit WooCommerce and reveal whether a code exists, so cap how
 * fast one client can guess. Fails open: a Redis outage must not stop honest
 * shoppers from checking out.
 */
export async function allowCouponAttempt(request: Request): Promise<boolean> {
  try {
    const redis = getRedis()
    const key = `coupon:attempts:${clientKey(request)}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, WINDOW_SECONDS)
    return count <= MAX_ATTEMPTS
  } catch {
    return true
  }
}
