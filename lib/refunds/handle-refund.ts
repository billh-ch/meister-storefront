import type Stripe from 'stripe'
import type { EmailOrder } from '@/lib/email/order'
import { notifyOrderRefunded, type NotifyDeps } from '@/lib/email/notify'

export type RefundResult =
  | { status: 'ignored'; reason: string }
  | { status: 'order_not_found' }
  | { status: 'duplicate' }
  | { status: 'processed'; orderId: number; wooSynced: boolean; email: string }

export interface RefundDeps {
  /** Durable payment → order lookup written when the order was created. */
  orderIdForPayment: (paymentIntentId: string) => Promise<number | null>
  /** Slower fallback for orders created before that lookup existed. */
  orderIdByScan: (paymentIntentId: string) => Promise<number | null>
  getOrder: (orderId: number) => Promise<EmailOrder | null>
  /** Stripe refund ids already recorded on the WooCommerce order. */
  recordedRefundIds: (orderId: number) => Promise<string[]>
  createWooRefund: (orderId: number, refund: { stripeRefundId: string; amountCents: number }) => Promise<void>
  notify: NotifyDeps
}

/**
 * A refund was issued in the Stripe dashboard: mirror it on the WooCommerce
 * order (no money moves there) and email the customer once. Safe to retry:
 * each step is idempotent per Stripe refund id. Throws only when Stripe
 * should redeliver the event.
 */
export async function handleRefundCreated(refund: Stripe.Refund, deps: RefundDeps): Promise<RefundResult> {
  if (refund.status === 'failed' || refund.status === 'canceled') return { status: 'ignored', reason: `refund ${refund.status}` }
  if (refund.currency?.toLowerCase() !== 'eur') return { status: 'ignored', reason: 'unsupported currency' }
  const paymentIntentId = typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id
  if (!paymentIntentId) return { status: 'ignored', reason: 'no payment intent' }
  if (!Number.isInteger(refund.amount) || refund.amount <= 0) return { status: 'ignored', reason: 'no amount' }

  const orderId = (await deps.orderIdForPayment(paymentIntentId)) ?? (await deps.orderIdByScan(paymentIntentId))
  if (!orderId) return { status: 'order_not_found' }

  const claimKey = `refund:handled:${refund.id}`
  if (!(await deps.notify.claim(claimKey, 60 * 60 * 24 * 90))) return { status: 'duplicate' }
  try {
    let wooSynced = true
    try {
      if (!(await deps.recordedRefundIds(orderId)).includes(refund.id)) {
        await deps.createWooRefund(orderId, { stripeRefundId: refund.id, amountCents: refund.amount })
      }
    } catch {
      // The customer is refunded in Stripe regardless: still email them, and leave the shop team a note.
      wooSynced = false
      await deps.notify.note(orderId, `Stripe refund ${refund.id} (€${(refund.amount / 100).toFixed(2)}) could not be recorded in WooCommerce. Please add it manually.`)
    }
    const order = await deps.getOrder(orderId)
    if (!order) throw new Error('Order disappeared')
    const email = await notifyOrderRefunded(order, { id: refund.id, amountCents: refund.amount }, deps.notify)
    return { status: 'processed', orderId, wooSynced, email }
  } catch (error) {
    await deps.notify.release(claimKey)
    throw error
  }
}
