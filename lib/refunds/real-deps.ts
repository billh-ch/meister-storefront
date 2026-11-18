import { getRedis } from '@/lib/redis'
import { getStripe } from '@/lib/stripe'
import { wcFetch, wcFetchOrNull, wcFetchWithMeta, wcMutate } from '@/lib/woocommerce/client'
import { realDeps } from '@/lib/email/notify'
import type { EmailOrder } from '@/lib/email/order'
import type { RefundDeps } from './handle-refund'

/** PaymentIntent → WooCommerce order id, written by the paid-order webhook. Kept for over a year. */
export const ORDER_BY_PAYMENT_TTL = 60 * 60 * 24 * 400
export const orderByPaymentKey = (paymentIntentId: string) => `stripe:order-by-pi:${paymentIntentId}`

export const realRefundDeps: RefundDeps = {
  orderIdForPayment: async paymentIntentId => {
    try {
      const value = await getRedis().get(orderByPaymentKey(paymentIntentId))
      const id = Number(value)
      return Number.isSafeInteger(id) && id > 0 ? id : null
    } catch { return null }
  },

  // Orders made before the lookup existed: find them by the customer's email and the PaymentIntent id.
  orderIdByScan: async paymentIntentId => {
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] })
    const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null
    const email = charge?.billing_details?.email || intent.receipt_email
    if (!email) return null
    for (let page = 1; page <= 10; page++) {
      const result = await wcFetchWithMeta<{ id: number; transaction_id?: string }[]>('/orders', {
        search: email, after: new Date((intent.created - 86400) * 1000).toISOString(), per_page: '100', page: String(page), orderby: 'date', order: 'desc',
      })
      const match = result.data.find(order => order.transaction_id === paymentIntentId)
      if (match) return match.id
      if (result.data.length < 100 || (result.total > 0 && page * 100 >= result.total)) return null
    }
    return null
  },

  getOrder: orderId => wcFetchOrNull<EmailOrder>(`/orders/${orderId}`),

  recordedRefundIds: async orderId => {
    const refunds = await wcFetch<{ meta_data?: { key: string; value: unknown }[] }[]>(`/orders/${orderId}/refunds`)
    return refunds.flatMap(refund => (refund.meta_data ?? []).filter(meta => meta.key === 'stripe_refund_id').map(meta => String(meta.value)))
  },

  // api_refund:false — the money already moved in Stripe; WooCommerce only records it.
  createWooRefund: async (orderId, refund) => {
    await wcMutate(`/orders/${orderId}/refunds`, 'POST', {
      amount: (refund.amountCents / 100).toFixed(2),
      reason: `Refunded in Stripe (${refund.stripeRefundId})`,
      api_refund: false,
      meta_data: [{ key: 'stripe_refund_id', value: refund.stripeRefundId }],
    })
  },

  notify: realDeps,
}
