import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOrdersByCustomer } from '@/lib/woocommerce'
import { setCart } from '@/lib/cart/cookie'

/**
 * Looks up the order the Stripe webhook created for a given PaymentIntent.
 * WooCommerce REST v3 has no meta-field query on `/orders`, so this scans
 * the signed-in customer's own recent orders for a `transactionId` match —
 * a pragmatic, small-scale approach, not an indexed lookup.
 *
 * This is also where the cart cookie actually gets cleared: the webhook
 * that creates the order runs server-to-server with no access to the
 * shopper's browser cookies, so clearing has to happen from a request that
 * does — this route, once it confirms the order really exists.
 */
export async function GET(request: Request) {
  const paymentIntentId = new URL(request.url).searchParams.get('pi')
  if (!paymentIntentId) {
    return NextResponse.json({ found: false })
  }

  const session = await getSession()
  if (!session.wcCustomerId) {
    return NextResponse.json({ found: false })
  }

  const orders = await getOrdersByCustomer(session.wcCustomerId)
  const match = orders.find((order) => order.transactionId === paymentIntentId)

  if (!match) {
    return NextResponse.json({ found: false })
  }

  await setCart([])

  return NextResponse.json({ found: true, order: { id: match.id, number: match.number } })
}
