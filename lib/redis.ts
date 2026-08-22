import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

/**
 * Lazy singleton. Used for exactly one thing in this app: Stripe-webhook
 * idempotency (`app/api/webhooks/stripe/route.ts`) — nothing else touches
 * Redis, by design.
 *
 * Env var names: this project's Upstash Marketplace product provisions
 * `KV_REST_API_URL`/`KV_REST_API_TOKEN` (the "Upstash for Redis" product),
 * not the generic `UPSTASH_REDIS_REST_URL`/`_TOKEN` pair `Redis.fromEnv()`
 * looks for — so this constructs the client explicitly instead.
 */
export function getRedis(): Redis {
  if (_redis) return _redis

  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) {
    throw new Error('KV_REST_API_URL/KV_REST_API_TOKEN are not configured')
  }

  _redis = new Redis({ url, token })
  return _redis
}
