import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { getRedis } from '@/lib/redis'
import { addOrderNote, createOrder, type WcAddress } from '@/lib/woocommerce/queries/create-order'
import { findOrderByPayment } from '@/lib/woocommerce/queries/find-order-by-payment'
import { randomUUID } from 'node:crypto'
import type { Redis } from '@upstash/redis'
import { lockerFromStripeMetadata, requiresBoxNowLocker } from '@/lib/checkout/box-now'
import { notifyOrderCreated } from '@/lib/email/notify'
import { handleRefundCreated } from '@/lib/refunds/handle-refund'
import { ORDER_BY_PAYMENT_TTL, orderByPaymentKey, realRefundDeps } from '@/lib/refunds/real-deps'
import { decodeAddonRefs } from '@/lib/addons/contract'
import type { CartLineMeta } from '@/lib/checkout/stripe-lines'
import { orderTotalCheck } from '@/lib/checkout/total-check'

// Stripe's SDK needs Node crypto for signature verification, not Edge.
export const runtime = 'nodejs'
export const maxDuration = 60

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
    email: metadata.ship_email || undefined,
  }
}

/**
 * Webhook-authoritative order creation: nothing client-side ever creates
 * the order itself — the customer pays on Stripe's own hosted Checkout
 * page, and only a verified, paid Checkout Session event here does. This
 * is the only place a real WooCommerce order gets created from a paid
 * checkout.
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

  // Refund made in the Stripe dashboard: mirror it in WooCommerce and email the customer.
  if (event.type === 'refund.created') {
    try {
      const result = await handleRefundCreated(event.data.object as Stripe.Refund, realRefundDeps)
      console.info('[stripe webhook]', { eventId: event.id, type: event.type, result: result.status })
      return NextResponse.json({ received: true, result: result.status })
    } catch (error) {
      console.error('[stripe webhook]', { eventId: event.id, type: event.type, error: error instanceof Error ? error.name : 'UnknownError' })
      return NextResponse.json({ error: 'refund handling failed' }, { status: 503 })
    }
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

  const lockKey = `stripe:pi:${paymentIntentId}`
  const owner = randomUUID()
  let redis: Redis | undefined
  let acquired = false
  let stage = 'lock'

  try {
    redis = getRedis()
    acquired = Boolean(await redis.set(lockKey, owner, { nx: true, ex: 60 * 10 }))
    if (!acquired) {
      const state = await redis.get(lockKey)
      if (state === 'done') return NextResponse.json({ received: true, note: 'duplicate' })
      // Acknowledging an unfinished attempt would stop Stripe's retry even
      // if that attempt subsequently crashes without creating an order.
      return NextResponse.json({ error: 'Order is still processing' }, { status: 503 })
    }
    stage = 'metadata'
    const metadata = checkoutSession.metadata ?? {}
    // Blank / absent for a guest checkout → 0 → a real WooCommerce guest
    // order keyed off the billing email.
    const wcCustomerId = metadata.wcCustomerId ? Number(metadata.wcCustomerId) : 0
    const lines = JSON.parse(metadata.cartLines ?? '[]') as CartLineMeta[]
    const address = addressFromMetadata(metadata)

    if (lines.length === 0) {
      throw new Error('Checkout Session metadata is missing the cart contents')
    }
    if (!wcCustomerId && !address.email) {
      throw new Error('Guest checkout Session metadata is missing the billing email')
    }
    if (!Array.isArray(lines) || lines.some(line => !/^\d+$/.test(line.p) || Number(line.p) <= 0 || (line.v && (!/^\d+$/.test(line.v) || Number(line.v) <= 0)) || !Number.isInteger(line.q) || line.q <= 0 || decodeAddonRefs(line.o) === null)) {
      throw new Error('Checkout Session cart contents are invalid')
    }
    const hasAddons = lines.some(line => (decodeAddonRefs(line.o) ?? []).length > 0)

    const couponDiscount = Number(metadata.couponDiscount)
    const coupon = metadata.couponCode && Number.isFinite(couponDiscount) && couponDiscount > 0
      ? { code: metadata.couponCode, discount: couponDiscount }
      : undefined

    const input = {
      customerId: wcCustomerId || undefined,
      coupon,
      locale: metadata.locale,
      lineItems: lines.map((line) => ({
        productId: Number(line.p),
        variationId: line.v ? Number(line.v) : undefined,
        quantity: line.q,
        metaData:
          line.a && Object.keys(line.a).length > 0
            ? Object.entries(line.a).map(([key, value]) => ({ key, value }))
            : undefined,
        addonRefs: decodeAddonRefs(line.o) ?? undefined,
      })),
      billing: address,
      shipping: address,
      transactionId: paymentIntentId,
      boxNowLocker: requiresBoxNowLocker(address.country, metadata.shippingMethodId)
        ? lockerFromStripeMetadata(metadata)
        : undefined,
      shippingLine: metadata.shippingMethodId
        ? {
            methodId: metadata.shippingMethodId,
            methodTitle: metadata.shippingMethodTitle ?? 'Shipping',
            // WooCommerce adds VAT to a shipping line, so it gets the net rate.
            // Sessions created before `shippingNet` existed fall back to the old value.
            total: /^\d+(?:\.\d{1,2})?$/.test(metadata.shippingNet ?? '') ? metadata.shippingNet! : (metadata.shippingCost ?? '0'),
          }
        : undefined,
    }
    stage = 'woo-reconcile'
    const existing = await findOrderByPayment(input, checkoutSession.created)
    stage = 'woo-create'
    const order = existing ?? await createOrder(input)

    // WooCommerce re-prices the order itself, so whenever that is more than
    // a copy of the product price (a discount code, or add-ons priced by the
    // meister-product-addons plugin) check it agrees with what Stripe actually
    // charged. A difference (rounding on VAT-inclusive prices, a changed
    // coupon or add-on, the add-ons plugin not active) never blocks the order;
    // it is flagged on the order for the shop team instead. Best effort.
    const totalNote = existing ? null : orderTotalCheck({
      orderTotal: order.total,
      amountTotalCents: checkoutSession.amount_total,
      couponCode: coupon?.code,
      hasAddons,
    })
    if (totalNote) {
      console.warn('[stripe webhook]', { paymentIntentId, orderId: order.id, note: 'order-total-mismatch' })
      await addOrderNote(order.id, totalNote).catch(() => undefined)
    }

    // Lets the confirmation page resolve a guest's order — it has no session
    // to scope `getOrdersByCustomer` by. Short TTL: only needed for the
    // minute or two the confirmation page polls.
    stage = 'order-receipt'
    await redis.set(
      `stripe:order:${paymentIntentId}`,
      JSON.stringify({ id: order.id, number: order.number }),
      { ex: 60 * 60 * 24 },
    )

    // Durable payment → order lookup, used later to find the order when a
    // refund is issued in Stripe. Best effort: refunds can still fall back to a search.
    await redis.set(orderByPaymentKey(paymentIntentId), String(order.id), { ex: ORDER_BY_PAYMENT_TTL }).catch(() => undefined)

    // Marked 'done' only after real success — a failed attempt below
    // releases the lock instead, so Stripe's own retry can attempt again.
    stage = 'complete'
    const completed = await redis.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('SET', KEYS[1], 'done', 'EX', 604800) else return nil end",
      [lockKey], [owner],
    )
    if (!completed) throw new Error('Order processing lease changed')
    console.info('[stripe webhook]', { eventId: event.id, paymentIntentId, orderId: order.id, stage: 'complete', recovered: Boolean(existing) })
    // After the order is safely recorded: customer confirmation and the
    // owner's alert. Never throws and never changes the response, so an
    // email problem can neither lose an order nor trigger a Stripe retry.
    await notifyOrderCreated(order as Parameters<typeof notifyOrderCreated>[0], {
      locale: metadata.locale,
      fallbackEmail: checkoutSession.customer_details?.email ?? checkoutSession.customer_email ?? undefined,
    })
    return NextResponse.json({ received: true, orderId: order.id })
  } catch (error) {
    // A timed-out POST may still commit at WooCommerce. Keep its lease until
    // expiry so a retry cannot race that in-progress write; the next owner
    // reconciles WooCommerce before attempting another creation.
    if (acquired && redis && stage !== 'woo-create') {
      await redis.eval("if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end", [lockKey], [owner]).catch(() => undefined)
    }
    console.error('[stripe webhook]', { eventId: event.id, paymentIntentId, stage, error: error instanceof Error ? error.name : 'UnknownError' })
    // Non-2xx tells Stripe to retry per its own backoff schedule.
    return NextResponse.json({ error: 'order creation failed', stage }, { status: 503 })
  }
}
