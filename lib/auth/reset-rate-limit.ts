import { createHash } from 'node:crypto'
import { getRedis } from '@/lib/redis'

/** Counts attempts in a fixed window. Fails CLOSED: this protects a
 *  credential-changing flow and an inbox, so "unknown" must mean "no". */
async function within(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const redis = getRedis()
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSeconds)
    return count <= max
  } catch {
    return false
  }
}

const digest = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 32)

export const allowResetRequestFromClient = (client: string) => within(`auth:reset-req:client:${digest(client)}`, 5, 3600)
export const allowResetRequestForEmail = (email: string) => within(`auth:reset-req:email:${digest(email)}`, 3, 3600)
export const allowResetSubmitFromClient = (client: string) => within(`auth:reset-do:client:${digest(client)}`, 10, 3600)
