import 'server-only'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { randomUUID, createHash } from 'node:crypto'
import { getSessionPassword } from '@/lib/auth/session-options'
import type { CartItem } from '@/lib/cart/schema'

export interface PromotionSession {
  owner?: string
  checkoutNonce?: string
  code?: string
  manual?: boolean
  dismissed?: string[]
  pending?: { attemptId: string; cartKey: string }
}
export async function getPromotionSession() {
  return getIronSession<PromotionSession>(await cookies(), {
    cookieName: 'mm_promotions', password: getSessionPassword(), ttl: 60 * 60 * 24 * 30,
    cookieOptions: { secure: process.env.NODE_ENV === 'production', sameSite: 'lax', httpOnly: true, path: '/' },
  })
}
export async function ensurePromotionSession() {
  const session = await getPromotionSession()
  if (!session.owner) { session.owner = randomUUID(); await session.save() }
  return session
}
export function promotionCartKey(cart: CartItem[]): string {
  const items = cart.map(item => [item.productId, item.variationId ?? '', item.quantity, Object.entries(item.selectedOptions ?? {}).sort()])
  return createHash('sha256').update(JSON.stringify(items)).digest('hex')
}
export function campaignKey(code: string): string { return createHash('sha256').update(code).digest('hex') }
