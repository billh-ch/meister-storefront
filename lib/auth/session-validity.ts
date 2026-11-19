import { getRedis } from '@/lib/redis'

/** Sessions are stateless cookies, so a password reset records a cut-off time
 *  instead: sessions issued before it stop counting as signed in. */
const KEY = (customerId: number) => `auth:valid-after:${customerId}`
const TTL_SECONDS = 60 * 60 * 24 * 60

interface RedisLike {
  get(key: string): Promise<unknown>
  set(key: string, value: string, options: { ex: number }): Promise<unknown>
}

export async function revokeSessionsBefore(customerId: number, at: number, redis: RedisLike = getRedis()): Promise<void> {
  await redis.set(KEY(customerId), String(at), { ex: TTL_SECONDS })
}

/** Fails open: a Redis outage must not sign every customer out. */
export async function isSessionRevoked(customerId: number, issuedAt: number | undefined, redis?: RedisLike): Promise<boolean> {
  try {
    const cutoff = Number(await (redis ?? getRedis()).get(KEY(customerId)))
    if (!Number.isFinite(cutoff) || cutoff <= 0) return false
    return !issuedAt || issuedAt < cutoff
  } catch {
    return false
  }
}
