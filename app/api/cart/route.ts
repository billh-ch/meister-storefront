import { NextResponse } from 'next/server'
import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'

/** Private, server-priced cart summary. Never cache one shopper's cart. */
export async function GET() {
  try {
    const cart = await resolveCartItems(await getCart())
    return NextResponse.json(cart, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json(
      { error: 'Could not verify your cart. Please try again.' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
