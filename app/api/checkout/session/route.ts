import { inputTranslator, requestLocaleSchema } from '@/lib/i18n/request'
import { z } from 'zod'
import { addressSchema } from '@/lib/address/schema'
import { createCheckoutSessionAction } from '@/lib/checkout/actions'
import { boxNowLockerSelectionSchema } from '@/lib/checkout/box-now'

const headers = { 'Cache-Control': 'private, no-store' }
const checkoutSessionSchema = z.object({
  locale: requestLocaleSchema,
  address: addressSchema,
  deliveryMethodId: z.string().min(1).max(150),
  expected: z.object({ cartSignature: z.string().min(1).max(16000), shippingCost: z.number().finite().nonnegative() }),
  boxNowLocker: boxNowLockerSelectionSchema.optional(),
})

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403, headers })
  }
  const body = await request.text()
  if (body.length > 32768) return Response.json({ error: 'Please review your cart and address.' }, { status: 400, headers })
  let input: unknown
  try { input = JSON.parse(body) } catch { return Response.json({ error: 'Please check your address.' }, { status: 400, headers }) }
  const t = inputTranslator(input)
  const parsed = checkoutSessionSchema.safeParse(input)
  if (!parsed.success) return Response.json({ error: t('Please fill in every required field.') }, { status: 400, headers })
  try {
    const { address, deliveryMethodId, expected, boxNowLocker, locale } = parsed.data
    return Response.json(await createCheckoutSessionAction(address, deliveryMethodId, expected, boxNowLocker, locale), { headers })
  } catch {
    return Response.json({ error: t('Could not prepare checkout. Please try again.') }, { status: 503, headers })
  }
}
