import { NextResponse } from 'next/server'
import { getCart } from '@/lib/cart/cookie'
import { selectCartRecommendations } from '@/lib/cart/recommendations'
import { getProducts } from '@/lib/woocommerce'

/** Optional suggestions must never prevent cart pricing or checkout. */
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const cart = await getCart()
    if (cart.length === 0) return NextResponse.json([], { headers })
    const products = await getProducts()
    return NextResponse.json(selectCartRecommendations(products, cart.map(item => item.productId)), { headers })
  } catch {
    return NextResponse.json([], { headers })
  }
}
