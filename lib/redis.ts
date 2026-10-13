import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

/**
 * Lazy singleton for Stripe-webhook locks and order confirmation receipts.
 *
 * Env var names: this project's Upstash Marketplace product provisions
 * `KV_REST_API_URL`/`KV_REST_API_TOKEN` (the "Upstash for Redis" product),
 * not the generic `UPSTASH_REDIS_REST_URL`/`_TOKEN` pair `Redis.fromEnv()`
 * looks for — so this constructs the client explicitly instead.
 * A Marketplace connection can add a prefix; select that complete pair
 * using REDIS_ENV_PREFIX rather than falling back to an archived database.
 */
export function getRedis(): Redis {
  if (_redis) return _redis

  const prefix = process.env.REDIS_ENV_PREFIX ?? ''
  const urlKey = `${prefix}KV_REST_API_URL`
  const tokenKey = `${prefix}KV_REST_API_TOKEN`
  const url = process.env[urlKey]
  const token = process.env[tokenKey]
  if (!url || !token) {
    throw new Error(`${urlKey}/${tokenKey} are not configured`)
  }

  _redis = new Redis({ url, token })
  return _redis
}
