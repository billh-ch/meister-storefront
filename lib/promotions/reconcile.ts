import 'server-only'
import { getStripe } from '@/lib/stripe'
import { promotionBackend } from './client'
import { attemptSchema } from './schema'
import { reconciliationEventType } from './reconciliation-state'
import { promotionEventFacts, PROMOTION_PROTOCOL } from './events'
import type Stripe from 'stripe'

export async function reconcilePromotions(): Promise<{ checked: number }> {
  const raw = await promotionBackend<unknown[]>('pending', {})
  const stripe = getStripe()
  let checked = 0
  let failed = 0
  const checkedIds: string[] = []
  for (const value of raw) {
    try {
    const attempt = attemptSchema.parse(value)
    if (attempt.quote.backendId !== process.env.PROMOTIONS_BACKEND_ID || attempt.origin !== process.env.STRIPE_CHECKOUT_ORIGIN || attempt.mode !== process.env.STRIPE_EXPECTED_MODE) throw new Error('Foreign checkout attempt in reconciliation')
    let session: Stripe.Checkout.Session | undefined
    if (attempt.sessionId) session = await stripe.checkout.sessions.retrieve(attempt.sessionId)
    else {
      // Recover a Session creation with a lost bind. Bound work; do not release an ambiguous hold.
      let after: string | undefined
      let exhausted = false
      for (let page = 0; page < 10; page++) {
        const result = await stripe.checkout.sessions.list({ created: { gte: attempt.createdAt - 60, lte: attempt.expiresAt + 120 }, limit: 100, ...(after ? { starting_after: after } : {}) })
        session = result.data.find(s => s.metadata?.protocol === PROMOTION_PROTOCOL && s.metadata.attemptId === attempt.attemptId)
        if (session) break
        if (!result.has_more) { exhausted = true; break }
        after = result.data.at(-1)?.id
      }
      if (!session) {
        // A zero-total prepare or a crashed caller may not have reached Stripe. A delayed caller could still create a Session within the original preparation window.
        if (!exhausted || Date.now() / 1000 < attempt.expiresAt + 120) { checkedIds.push(attempt.attemptId); continue }
        await promotionBackend('event', { attemptId: attempt.attemptId, sessionId: `uncreated_${attempt.attemptId}`, amount: attempt.quote.total, currency: 'eur', paymentStatus: 'unpaid', paymentIntent: '', state: 'expired', mode: attempt.mode, terminalConfirmed: true })
        checked++; checkedIds.push(attempt.attemptId); continue
      }
      // Binding is recovered by the verified event; an open session will be found again on the next run.
    }
    const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
    const intent = session.status === 'complete' && session.payment_status === 'unpaid' && intentId ? await stripe.paymentIntents.retrieve(intentId) : undefined
    const type = reconciliationEventType(session, intent?.status)
    if (type) {
      const facts = promotionEventFacts(type, session, { backendId: attempt.quote.backendId, origin: attempt.origin, mode: attempt.mode })
      await promotionBackend('event', facts)
    }
    checked++; checkedIds.push(attempt.attemptId)
    } catch { failed++ }
  }
  await promotionBackend('heartbeat', { attemptIds: checkedIds, healthy: failed === 0 })
  if (failed) throw new Error(`${failed} checkout attempts need reconciliation attention`)
  return { checked }
}
