import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { getRedis } from '@/lib/redis'
import { createOrder, type WcAddress } from '@/lib/woocommerce/queries/create-order'

// Stripe's SDK needs Node crypto for signature verification, not Edge.
export const runtime = 'nodejs'

interface CartLineMeta {
  p: string
  v?: string
  q: number
}

function addressFromMetadata(metadata: Stripe.Metadata): WcAddress {
  return {
    first_name: metadata.ship_first_name ?? '',
    last_name: metadata.ship_last_name ?? '',
    address_1: metadata.ship_address1 ?? '',
    address_2: metadata.ship_address2 || undefined,
    city: metadata.ship_city ?? '',
    postcode: metadata.ship_postcode ?? '',
    country: metadata.ship_country ?? '',
    phone: metadata.ship_phone ?? '',
  }
}

/**
 * Webhook-authoritative order creation: the client-side payment confirmation
 * (`components/checkout/payment-form.tsx`) never creates the order itself —
 * only a verified, paid Checkout Session event here does. This is the only
 * place a real WooCommerce order gets created from a paid checkout.
 *
 * Listens for both `checkout.session.completed` (the normal case) and
 * `checkout.session.async_payment_succeeded` (delayed payment methods that
 * complete after the session itself closes) — Stripe's own guidance for
 * Checkout Sessions fulfillment, gated on `payment_status` rather than
 * trusting the event type alone.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ received: true })
  }

  const checkoutSession = event.data.object as Stripe.Checkout.Session
  if (checkoutSession.payment_status === 'unpaid') {
    return NextResponse.json({ received: true, note: 'unpaid' })
  }

  const paymentIntentId =
    typeof checkoutSession.payment_intent === 'string'
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id

  if (!paymentIntentId) {
    console.error('[stripe webhook] paid session has no payment_intent:', checkoutSession.id)
    return NextResponse.json({ error: 'missing payment intent' }, { status: 400 })
  }

  const redis = getRedis()
  const lockKey = `stripe:pi:${paymentIntentId}`

  // Idempotency guard — Stripe's webhook delivery is at-least-once, so the
  // same event can arrive more than once. This is the only thing Redis is
  // used for anywhere in this app.
  const acquired = await redis.set(lockKey, 'processing', { nx: true, ex: 60 * 10 })
  if (!acquired) {
    const state = await redis.get(lockKey)
    return NextResponse.json({ received: true, note: state === 'done' ? 'duplicate' : 'in-flight' })
  }

  try {
    const metadata = checkoutSession.metadata ?? {}
    const wcCustomerId = Number(metadata.wcCustomerId)
    const lines = JSON.parse(metadata.cartLines ?? '[]') as CartLineMeta[]
    const address = addressFromMetadata(metadata)

    if (!wcCustomerId || lines.length === 0) {
      throw new Error('Checkout Session metadata is missing required checkout data')
    }

    const order = await createOrder({
      customerId: wcCustomerId,
      lineItems: lines.map((line) => ({
        productId: Number(line.p),
        variationId: line.v ? Number(line.v) : undefined,
        quantity: line.q,
      })),
      billing: address,
      shipping: address,
      transactionId: paymentIntentId,
    })

    // Marked 'done' only after real success — a failed attempt below
    // releases the lock instead, so Stripe's own retry can attempt again.
    await redis.set(lockKey, 'done', { ex: 60 * 60 * 24 * 7 })
    return NextResponse.json({ received: true, orderId: order.id })
  } catch (error) {
    await redis.del(lockKey)
    console.error('[stripe webhook] order creation failed:', error)
    // Non-2xx tells Stripe to retry per its own backoff schedule.
    return NextResponse.json({ error: 'order creation failed' }, { status: 500 })
  }
}
