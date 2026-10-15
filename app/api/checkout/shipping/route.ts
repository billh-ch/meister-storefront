import { inputTranslator, requestLocaleSchema } from '@/lib/i18n/request'
import { shippingAddressSchema } from '@/lib/address/schema'
import { getShippingQuote } from '@/lib/checkout/get-shipping-quote'

const headers = { 'Cache-Control': 'private, no-store' }

/** Stable URL for delivery estimates, independent of build-specific action IDs.
 * The cart is always read from this shopper's cookie on the server. */
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ status: 'error', error: 'Invalid request origin.' }, { status: 403, headers })
  }
  const body = await request.text()
  if (body.length > 8192) return Response.json({ status: 'address', error: 'Please check your address.' }, { status: 400, headers })
  let input: unknown
  try { input = JSON.parse(body) } catch { return Response.json({ status: 'address', error: 'Please check your address.' }, { status: 400, headers }) }
  const t = inputTranslator(input)
  const parsed = shippingAddressSchema.extend({ locale: requestLocaleSchema }).safeParse(input)
  if (!parsed.success) return Response.json({ status: 'address', error: t('Please check your delivery country and address.') }, { status: 400, headers })
  const quote = await getShippingQuote(parsed.data)
  const localizedQuote = quote.status === 'ready' ? quote : { ...quote, error: t(quote.error), ...('issues' in quote ? { issues: quote.issues.map(issue => ({ ...issue, message: t(issue.message) })) } : {}) }
  return Response.json(localizedQuote, { status: quote.status === 'error' ? 503 : 200, headers })
}
