import { NextResponse } from 'next/server'
import { getCart } from '@/lib/cart/cookie'

/** Powers the navbar's cart-count badge. A raw quantity sum is all a badge
 *  needs — no product-level resolution, so this never hits WooCommerce. */
export async function GET() {
  const cart = await getCart()
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  return NextResponse.json({ count })
}
