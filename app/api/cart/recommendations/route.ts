import { NextResponse } from 'next/server'
import { queryLocale } from '@/lib/i18n/request'
import { getCart } from '@/lib/cart/cookie'
import { selectCartRecommendations } from '@/lib/cart/recommendations'
import { getProducts } from '@/lib/woocommerce'

/** Optional suggestions must never prevent cart pricing or checkout. */
export async function GET(request: Request) {
  const locale = queryLocale(request)
  if (!locale.success) return Response.json({ error: 'Invalid language selection.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } })
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const cart = await getCart()
    if (cart.length === 0) return NextResponse.json([], { headers })
    const products = await getProducts(locale.data)
    return NextResponse.json(selectCartRecommendations(products, cart.map(item => item.productId)), { headers })
  } catch {
    return NextResponse.json([], { headers })
  }
}
