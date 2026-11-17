import { z } from 'zod'
import { inputTranslator, requestLocaleSchema } from '@/lib/i18n/request'
import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'
import { getSession } from '@/lib/auth/session'
import { validateCoupon } from '@/lib/coupons/validate'
import { allowCouponAttempt } from '@/lib/coupons/rate-limit'

const headers = { 'Cache-Control': 'private, no-store' }
const schema = z.object({
  locale: requestLocaleSchema,
  code: z.string().min(1).max(60),
  email: z.string().max(254).optional(),
})

/** Previews a discount for the shopper's server-side cart. The charge itself
 *  is recomputed when the payment session is created, never taken from here. */
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ ok: false, error: 'Invalid request origin.' }, { status: 403, headers })
  }
  const body = await request.text()
  if (body.length > 2048) return Response.json({ ok: false, error: 'Please check your discount code.' }, { status: 400, headers })
  let input: unknown
  try { input = JSON.parse(body) } catch { return Response.json({ ok: false, error: 'Please check your discount code.' }, { status: 400, headers }) }
  const t = inputTranslator(input)
  const parsed = schema.safeParse(input)
  if (!parsed.success) return Response.json({ ok: false, error: t("This discount code isn't valid.") }, { status: 400, headers })
  if (!(await allowCouponAttempt(request))) {
    return Response.json({ ok: false, error: t('Too many attempts. Please wait a few minutes and try again.') }, { status: 429, headers })
  }

  try {
    const { code, email, locale } = parsed.data
    const [cart, session] = await Promise.all([getCart(), getSession()])
    const resolved = await resolveCartItems(cart, locale)
    if (resolved.lines.length === 0) return Response.json({ ok: false, error: t('Your cart is empty.') }, { headers })
    const result = await validateCoupon(code, resolved, { email, customerId: session.wcCustomerId || undefined })
    if (!result.ok) return Response.json({ ok: false, error: t(result.error, result.values) }, { headers })
    return Response.json({ ok: true, code: result.code, discount: result.discountCents / 100 }, { headers })
  } catch {
    return Response.json({ ok: false, error: t('Could not check this discount code. Please try again.') }, { status: 503, headers })
  }
}
