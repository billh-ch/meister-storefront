import type Stripe from 'stripe'
import { promotionBackend } from './client'
import { getStripe } from '@/lib/stripe'

export const PROMOTION_PROTOCOL = 'meister_promotions_v1'
const relevant = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'])
export function promotionEventFacts(type: string, session: Stripe.Checkout.Session, expected: { backendId: string; origin: string; mode: string }) {
  if (session.metadata?.protocol !== PROMOTION_PROTOCOL) return null
  if (!relevant.has(type)) return null
  if (session.metadata.backendId !== expected.backendId || session.metadata.storefrontOrigin !== expected.origin || session.livemode !== (expected.mode === 'live')) throw new Error('Foreign promotion payment')
  const attemptId = session.metadata.attemptId
  if (!/^[a-f0-9]{64}$/.test(attemptId ?? '') || session.currency !== 'eur' || !Number.isSafeInteger(session.amount_total) || session.amount_total! < 0) throw new Error('Invalid promotion payment facts')
  const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? ''
  if (paid && session.amount_total! > 0 && !paymentIntent) throw new Error('Paid session is missing its transaction')
  let state: 'paid' | 'processing' | 'expired' | 'failed'
  if (paid) state = 'paid'
  else if (session.status === 'expired') state = 'expired'
  else if (type === 'checkout.session.async_payment_failed' && session.status === 'complete') state = 'failed'
  else if (type === 'checkout.session.completed' && session.status === 'complete') state = 'processing'
  else throw new Error('Session is not terminal')
  return { attemptId, sessionId: session.id, amount: session.amount_total!, currency: session.currency, paymentStatus: session.payment_status, paymentIntent, state, mode: expected.mode, terminalConfirmed: state === 'expired' || state === 'failed' }
}
export async function handlePromotionEvent(event: Stripe.Event): Promise<boolean> {
  const original = event.data.object as Stripe.Checkout.Session
  if (original.metadata?.protocol !== PROMOTION_PROTOCOL) return false
  if (!relevant.has(event.type)) return true
  // These checks are independent of the feature flag: in-flight orders survive rollback.
  if (!process.env.PROMOTIONS_BACKEND_ID || !process.env.STRIPE_CHECKOUT_ORIGIN || !process.env.STRIPE_EXPECTED_MODE) throw new Error('Promotion event ownership is not configured')
  if (original.metadata.backendId !== process.env.PROMOTIONS_BACKEND_ID || original.metadata.storefrontOrigin !== process.env.STRIPE_CHECKOUT_ORIGIN || original.livemode !== (process.env.STRIPE_EXPECTED_MODE === 'live')) return true
  const session = await getStripe().checkout.sessions.retrieve(original.id)
  if (event.type === 'checkout.session.async_payment_failed' && session.payment_status === 'unpaid') {
    const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
    const intent = pi ? await getStripe().paymentIntents.retrieve(pi) : undefined
    if (!intent || !['requires_payment_method', 'canceled'].includes(intent.status)) throw new Error('Asynchronous failure is not confirmed terminal')
  }
  const facts = promotionEventFacts(event.type, session, { backendId: process.env.PROMOTIONS_BACKEND_ID, origin: process.env.STRIPE_CHECKOUT_ORIGIN, mode: process.env.STRIPE_EXPECTED_MODE })
  if (facts) await promotionBackend('event', facts)
  return true
}
