import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOrdersByCustomer } from '@/lib/woocommerce'
import { getRedis } from '@/lib/redis'
import { setCart } from '@/lib/cart/cookie'

interface OrderSummary {
  id: number
  number: string
}

/**
 * Looks up the order the Stripe webhook created for a given PaymentIntent.
 * WooCommerce REST v3 has no meta-field query on `/orders`, so for a
 * signed-in shopper this scans their own recent orders for a `transactionId`
 * match — a pragmatic, small-scale approach, not an indexed lookup. A guest
 * has no customer to scope that by, so the webhook also stashes an
 * `pi -> { id, number }` record in Redis and we read that here.
 *
 * This is also where the cart cookie actually gets cleared: the webhook that
 * creates the order runs server-to-server with no access to the shopper's
 * browser cookies, so clearing has to happen from a request that does — this
 * route, once it confirms the order really exists.
 */
export async function GET(request: Request) {
  const paymentIntentId = new URL(request.url).searchParams.get('pi')
  if (!paymentIntentId) {
    return NextResponse.json({ found: false })
  }

  // Scoped strictly on session presence, not on "no match found" — falling
  // through to the unscoped Redis lookup for any signed-in caller whose own
  // orders simply didn't contain this PaymentIntent would let one shopper
  // look up another shopper's order id/number just by knowing (or guessing)
  // their PaymentIntent id. Only a true guest (no session at all) has no
  // other way to be scoped, matching the webhook's own stated intent for
  // that Redis record.
  const session = await getSession()
  const match = session.wcCustomerId
    ? await findByCustomer(session.wcCustomerId, paymentIntentId)
    : await findInRedis(paymentIntentId)

  if (!match) {
    return NextResponse.json({ found: false })
  }

  await setCart([])

  return NextResponse.json({ found: true, order: match })
}

/** Signed-in shopper: scan their own recent orders for the transaction id. */
async function findByCustomer(
  wcCustomerId: number,
  paymentIntentId: string,
): Promise<OrderSummary | null> {
  const orders = await getOrdersByCustomer(wcCustomerId)
  const match = orders.find((order) => order.transactionId === paymentIntentId)
  return match ? { id: match.id, number: match.number } : null
}

/** Guest: the webhook recorded the created order under `stripe:order:<pi>`. */
async function findInRedis(paymentIntentId: string): Promise<OrderSummary | null> {
  try {
    const raw = await getRedis().get(`stripe:order:${paymentIntentId}`)
    if (!raw) return null
    // Upstash auto-deserialises JSON on read, but tolerate a plain string too.
    const parsed = typeof raw === 'string' ? (JSON.parse(raw) as OrderSummary) : (raw as OrderSummary)
    return parsed && typeof parsed.id === 'number' ? { id: parsed.id, number: String(parsed.number) } : null
  } catch {
    return null
  }
}
