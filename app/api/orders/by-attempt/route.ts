import { z } from 'zod'
import { promotionBackend } from '@/lib/promotions/client'
import { getPromotionSession, promotionCartKey } from '@/lib/promotions/session'
import { getCart, setCart } from '@/lib/cart/cookie'
import { promotionHeaders } from '@/lib/promotions/request'

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('attempt')
  if (!z.string().regex(/^[a-f0-9]{64}$/).safeParse(id).success) return Response.json({ found: false }, { status: 400, headers: promotionHeaders })
  try {
    const session = await getPromotionSession()
    if (!session.owner) return Response.json({ found: false }, { status: 404, headers: promotionHeaders })
    const receipt = await promotionBackend<{ state: string; id?: number; number?: string }>('receipt', { attemptId: id, owner: session.owner })
    if (receipt.state !== 'paid' || !receipt.id || !receipt.number) return Response.json({ found: false, state: receipt.state }, { headers: promotionHeaders })
    // Never erase items added/edited after this attempt was started.
    if (session.pending?.attemptId === id) {
      if (promotionCartKey(await getCart()) === session.pending.cartKey) await setCart([])
      delete session.pending
      delete session.checkoutNonce
      session.code = ''; session.manual = false
      await session.save()
    }
    return Response.json({ found: true, order: { id: receipt.id, number: receipt.number } }, { headers: promotionHeaders })
  } catch { return Response.json({ found: false }, { status: 503, headers: promotionHeaders }) }
}
