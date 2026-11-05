import { z } from 'zod'
import { promotionsEnabled } from '@/lib/promotions/client'
import { ensurePromotionSession, campaignKey } from '@/lib/promotions/session'
import { promotionRequest, promotionHeaders } from '@/lib/promotions/request'
import { couponCodeSchema, normalizeCoupon } from '@/lib/promotions/schema'
export async function POST(request: Request) {
  if (!promotionsEnabled()) return Response.json({ error: 'Unavailable' }, { status: 404, headers: promotionHeaders })
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid request origin.' }, { status: 403, headers: promotionHeaders })
  try {
    const session = await ensurePromotionSession()
    const { code } = z.object({ code: couponCodeSchema.min(1) }).parse(await promotionRequest(request, session.owner!, 30))
    const normalized = normalizeCoupon(code)
    if (!session.manual && !session.dismissed?.includes(campaignKey(normalized))) { session.code = normalized; await session.save() }
    return Response.json({ ok: true }, { headers: promotionHeaders })
  } catch { return Response.json({ error: 'Could not remember this offer.' }, { status: 400, headers: promotionHeaders }) }
}
