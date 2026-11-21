import { getRedis } from '@/lib/redis'
import { getStripe } from '@/lib/stripe'
import { wcFetch, wcFetchOrNull, wcMutate } from '@/lib/woocommerce/client'
import { addOrderNote } from '@/lib/woocommerce/queries/create-order'
import { notifyCustomerCancelled } from '@/lib/email/notify'
import type { EmailOrder } from '@/lib/email/order'
import { CANCEL_MARKER_KEY, CANCEL_REFUND_SOURCE, cancelWindowMs, type CancelDeps } from './cancel'

export const realCancelDeps = (): CancelDeps => ({
  getOrder: orderId => wcFetchOrNull<EmailOrder & { transaction_id?: string }>(`/orders/${orderId}`),

  lock: async (key, ttl) => {
    try { return Boolean(await getRedis().set(key, '1', { nx: true, ex: ttl })) } catch { return false }
  },
  unlock: async key => { await getRedis().del(key) },

  refund: async ({ orderId, paymentIntentId, reason }) => {
    // Same key on a retry returns the same refund instead of refunding twice.
    const refund = await getStripe().refunds.create(
      { payment_intent: paymentIntentId, reason: 'requested_by_customer', metadata: { source: CANCEL_REFUND_SOURCE, order_id: String(orderId), cancel_reason: reason } },
      { idempotencyKey: `customer-cancel-${orderId}` },
    )
    if (refund.status === 'failed' || refund.status === 'canceled') throw new Error(`Refund ${refund.status}`)
    return { id: refund.id, amountCents: refund.amount }
  },

  recordedRefundIds: async orderId => {
    const refunds = await wcFetch<{ meta_data?: { key: string; value: unknown }[] }[]>(`/orders/${orderId}/refunds`)
    return refunds.flatMap(r => (r.meta_data ?? []).filter(m => m.key === 'stripe_refund_id').map(m => String(m.value)))
  },

  // api_refund:false: the money already moved in Stripe. restock_items:false: the
  // status change to Cancelled restores stock, so restocking here would double it.
  recordWooRefund: async (orderId, refund) => {
    await wcMutate(`/orders/${orderId}/refunds`, 'POST', {
      amount: (refund.amountCents / 100).toFixed(2),
      reason: `Cancelled by the customer; refunded in Stripe (${refund.stripeRefundId})`,
      api_refund: false,
      restock_items: false,
      meta_data: [{ key: 'stripe_refund_id', value: refund.stripeRefundId }],
    })
  },

  markCancelled: async (orderId, reason) => {
    await wcMutate(`/orders/${orderId}`, 'PUT', {
      status: 'cancelled',
      meta_data: [{ key: CANCEL_MARKER_KEY, value: reason }, { key: 'meister_customer_cancel_at', value: new Date().toISOString() }],
    })
  },

  note: (orderId, text) => addOrderNote(orderId, text),

  email: (order, refund, problems) =>
    notifyCustomerCancelled(order as EmailOrder, { refundId: refund.id, amountCents: refund.amountCents, reason: refund.reason, problems }),

  now: () => Date.now(),
  windowMs: cancelWindowMs(),
})
