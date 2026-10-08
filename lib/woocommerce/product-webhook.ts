import { verifyWooCommerceWebhook } from './webhook-signature'

const MAX_BODY_BYTES = 256 * 1024
const validId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const reply = (status: number, message: string) => Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } })

/** Dependency injection keeps request validation independently testable; the
 * route supplies Next's immediate cache expiration, never a client-supplied tag. */
export async function handleProductWebhook(request: Request, dependencies: {
  secret: string
  invalidate: (tag: string) => void
}): Promise<Response> {
  if (!dependencies.secret) return reply(503, 'Webhook is not configured.')
  const advertisedLength = request.headers.get('content-length')
  if (advertisedLength && Number(advertisedLength) > MAX_BODY_BYTES) return reply(413, 'Payload too large.')
  const reader = request.body?.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  if (reader) {
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        length += value.byteLength
        if (length > MAX_BODY_BYTES) { await reader.cancel(); return reply(413, 'Payload too large.') }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
  }
  const raw = Buffer.concat(chunks, length)
  // WooCommerce sends an unsigned form ping when a webhook is activated.
  // Acknowledge only this narrow liveness probe; it never expires any data.
  if (request.headers.get('content-type')?.split(';')[0].trim() === 'application/x-www-form-urlencoded' &&
      /^webhook_id=[1-9]\d*$/.test(raw.toString('utf8'))) return reply(200, 'Webhook endpoint ready.')
  if (!verifyWooCommerceWebhook(raw, request.headers.get('x-wc-webhook-signature') || '', dependencies.secret)) {
    return reply(401, 'Invalid signature.')
  }
  if (request.headers.get('x-wc-webhook-resource') !== 'product' ||
      !['created', 'updated', 'deleted', 'restored'].includes(request.headers.get('x-wc-webhook-event') || '')) {
    return reply(400, 'Unsupported product event.')
  }
  let payload: { id?: unknown; parent_id?: unknown }
  try { payload = JSON.parse(raw.toString('utf8')) } catch { return reply(400, 'Invalid JSON.') }
  if (!payload || Array.isArray(payload) || !validId(payload.id) ||
      (payload.parent_id !== undefined && payload.parent_id !== 0 && !validId(payload.parent_id))) {
    return reply(400, 'Invalid product ID.')
  }
  const productId = validId(payload.parent_id) ? payload.parent_id : payload.id
  dependencies.invalidate('products')
  dependencies.invalidate(`product:${productId}`)
  return reply(200, 'Product caches expired.')
}
