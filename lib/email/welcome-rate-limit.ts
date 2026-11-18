import { getRedis } from '@/lib/redis'

const WINDOW_SECONDS = 3600
const MAX_PER_WINDOW = 5

/**
 * Sign-up does not verify email ownership, so anyone could aim our welcome
 * email at someone else's address. Cap how many one client can trigger.
 * Fails open: a Redis outage must not block sign-up or its welcome email.
 */
export async function allowWelcomeEmail(clientKey: string): Promise<boolean> {
  try {
    const redis = getRedis()
    const key = `welcome:attempts:${clientKey.slice(0, 64)}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, WINDOW_SECONDS)
    return count <= MAX_PER_WINDOW
  } catch {
    return true
  }
}
