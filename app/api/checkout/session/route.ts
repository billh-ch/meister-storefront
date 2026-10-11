import { z } from 'zod'
import { addressSchema } from '@/lib/address/schema'
import { createCheckoutSessionAction } from '@/lib/checkout/actions'

const headers = { 'Cache-Control': 'private, no-store' }
const schema = z.object({
  address: addressSchema,
  deliveryMethodId: z.string().min(1).max(150),
  expected: z.object({ cartSignature: z.string().min(1).max(16000), shippingCost: z.number().finite().nonnegative() }),
})

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403, headers })
  }
  const body = await request.text()
  if (body.length > 32768) return Response.json({ error: 'Please review your cart and address.' }, { status: 400, headers })
  let input: unknown
  try { input = JSON.parse(body) } catch { return Response.json({ error: 'Please check your address.' }, { status: 400, headers }) }
  const parsed = schema.safeParse(input)
  if (!parsed.success) return Response.json({ error: 'Please fill in every required field.' }, { status: 400, headers })
  try {
    const { address, deliveryMethodId, expected } = parsed.data
    return Response.json(await createCheckoutSessionAction(address, deliveryMethodId, expected), { headers })
  } catch {
    return Response.json({ error: 'Could not prepare checkout. Please try again.' }, { status: 503, headers })
  }
}
