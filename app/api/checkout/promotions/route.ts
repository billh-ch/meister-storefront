import { z } from 'zod'
import { promotionsEnabled } from '@/lib/promotions/client'
import { ensurePromotionSession, campaignKey } from '@/lib/promotions/session'
import { promotionHeaders, promotionRequest } from '@/lib/promotions/request'
import { getPromotionQuote } from '@/lib/promotions/quote'
import { couponCodeSchema, normalizeCoupon } from '@/lib/promotions/schema'
import { requestLocaleSchema, inputTranslator } from '@/lib/i18n/request'

const schema = z.object({
  scope: z.enum(['cart', 'checkout']), locale: requestLocaleSchema, operation: z.enum(['quote', 'apply', 'remove']).default('quote'), code: couponCodeSchema.optional(),
  email: z.union([z.email(), z.literal('')]).optional(), shippingId: z.string().max(150).optional(),
  address: z.object({ country: z.string().length(2), city: z.string().max(200).optional(), postcode: z.string().max(30).optional(), address1: z.string().max(250).optional(), address2: z.string().max(250).optional() }).default({ country: 'GR' }),
})
export async function POST(request: Request) {
  if (!promotionsEnabled()) return Response.json({ error: 'Promotions are unavailable.' }, { status: 404, headers: promotionHeaders })
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid request origin.' }, { status: 403, headers: promotionHeaders })
    const session = await ensurePromotionSession()
    const input = schema.parse(await promotionRequest(request, session.owner!))
    const t = inputTranslator(input)
    if (input.scope === 'cart' && input.operation !== 'quote') return Response.json({ error: t('Enter your coupon at checkout.') }, { status: 400, headers: promotionHeaders })
    // Apply/remove is explicit intent; validation failures retain it rather than silently increasing the payable amount.
    if (input.scope === 'checkout' && input.operation !== 'quote') {
      if (session.code) session.dismissed = [...new Set([...(session.dismissed ?? []), campaignKey(session.code)])].slice(-10)
      session.code = input.operation === 'remove' ? '' : normalizeCoupon(input.code ?? '')
      session.manual = true
      await session.save()
    }
    const quote = await getPromotionQuote({ owner: session.owner!, code: input.scope === 'cart' ? '' : session.code ?? '', email: input.email, address: input.address, shippingId: input.shippingId, locale: input.locale })
    return Response.json({ quote }, { headers: promotionHeaders })
  } catch {
    return Response.json({ error: 'Could not update your order total. Please try again.' }, { status: 503, headers: promotionHeaders })
  }
}
