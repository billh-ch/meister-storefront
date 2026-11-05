import type Stripe from 'stripe'
export function reconciliationEventType(session: Pick<Stripe.Checkout.Session, 'status' | 'payment_status'>, paymentIntentStatus?: string): string | undefined {
  if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') return 'checkout.session.completed'
  if (session.status === 'expired') return 'checkout.session.expired'
  if (session.status === 'complete') {
    if (paymentIntentStatus === 'requires_payment_method' || paymentIntentStatus === 'canceled') return 'checkout.session.async_payment_failed'
    return 'checkout.session.completed'
  }
  return undefined
}
