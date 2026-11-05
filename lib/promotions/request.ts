import 'server-only'
import { createHash } from 'node:crypto'
import { getRedis } from '@/lib/redis'
export const promotionHeaders = { 'Cache-Control': 'private, no-store' }
export async function promotionRequest(request: Request, owner: string, limit = 60): Promise<unknown> {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new Error('Invalid request origin')
  const body = await request.text()
  if (body.length > 8192) throw new Error('Request too large')
  const window = Math.floor(Date.now() / 60_000)
  const identity = createHash('sha256').update(request.headers.get('cf-connecting-ip') || owner).digest('hex')
  const key = `promotions:rate:${identity}:${window}`
  const count = await getRedis().eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],120) end; return n", [key], [])
  if (typeof count !== 'number' || count > limit) throw new Error('Please wait before trying another code')
  return JSON.parse(body)
}
