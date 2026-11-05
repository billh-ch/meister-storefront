import { timingSafeEqual } from 'node:crypto'
import { reconcilePromotions } from '@/lib/promotions/reconcile'
import { promotionHeaders } from '@/lib/promotions/request'
export async function POST(request: Request) {
  const secret = process.env.PROMOTIONS_CRON_SECRET
  const provided = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret ?? ''}`
  if (!secret || secret.length < 32 || provided.length !== expected.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: promotionHeaders })
  try { return Response.json(await reconcilePromotions(), { headers: promotionHeaders }) }
  catch { return Response.json({ error: 'Reconciliation needs attention.' }, { status: 503, headers: promotionHeaders }) }
}
