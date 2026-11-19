import { getRedis } from '@/lib/redis'
import type { ResetRecord, ResetStore } from './password-reset'

const tokenKey = (hash: string) => `auth:reset:${hash}`
const customerKey = (customerId: number) => `auth:reset-for:${customerId}`

const parse = (value: unknown): ResetRecord | null => {
  try {
    const record = (typeof value === 'string' ? JSON.parse(value) : value) as ResetRecord | null
    return record && Number.isSafeInteger(record.customerId) && typeof record.email === 'string' ? record : null
  } catch { return null }
}

/** Only a hash of the link's token is stored, so a Redis leak cannot be used to reset anyone's password. */
export const redisResetStore: ResetStore = {
  async save(hash, record, ttl) {
    const redis = getRedis()
    // One live link per customer: a new request replaces the previous one.
    const previous = await redis.get<string>(customerKey(record.customerId))
    if (previous && previous !== hash) await redis.del(tokenKey(previous))
    await redis.set(tokenKey(hash), JSON.stringify(record), { ex: ttl })
    await redis.set(customerKey(record.customerId), hash, { ex: ttl })
  },
  async peek(hash) { return parse(await getRedis().get(tokenKey(hash))) },
  async consume(hash) {
    const record = parse(await getRedis().getdel(tokenKey(hash)))
    if (record) await getRedis().del(customerKey(record.customerId))
    return record
  },
  async restore(hash, record, ttl) {
    const redis = getRedis()
    await redis.set(tokenKey(hash), JSON.stringify(record), { ex: ttl })
    await redis.set(customerKey(record.customerId), hash, { ex: ttl })
  },
  async drop(hash) {
    const redis = getRedis()
    const record = parse(await redis.getdel(tokenKey(hash)))
    if (record) await redis.del(customerKey(record.customerId))
  },
}
