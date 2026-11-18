import { verifyWooCommerceWebhook } from './webhook-signature'
import type { EmailOrder } from '@/lib/email/order'

const MAX_BODY_BYTES = 512 * 1024
const reply = (status: number, message: string) => Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } })

/**
 * Receives WooCommerce's signed "order updated" delivery and emails the
 * customer when the order has just been completed. Always acknowledges a
 * valid delivery with 200: WooCommerce disables a webhook after repeated
 * failures, and an email problem is recorded on the order instead.
 */
export async function handleOrderWebhook(request: Request, deps: {
  secret: string
  onCompleted: (order: EmailOrder) => Promise<unknown>
}): Promise<Response> {
  if (!deps.secret) return reply(503, 'Webhook is not configured.')
  const advertised = request.headers.get('content-length')
  if (advertised && Number(advertised) > MAX_BODY_BYTES) return reply(413, 'Payload too large.')
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
  if (request.headers.get('content-type')?.split(';')[0].trim() === 'application/x-www-form-urlencoded' &&
      /^webhook_id=[1-9]\d*$/.test(raw.toString('utf8'))) return reply(200, 'Webhook endpoint ready.')
  if (!verifyWooCommerceWebhook(raw, request.headers.get('x-wc-webhook-signature') || '', deps.secret)) return reply(401, 'Invalid signature.')
  if (request.headers.get('x-wc-webhook-resource') !== 'order' || !['created', 'updated'].includes(request.headers.get('x-wc-webhook-event') || '')) {
    return reply(400, 'Unsupported order event.')
  }
  let order: EmailOrder
  try { order = JSON.parse(raw.toString('utf8')) } catch { return reply(400, 'Invalid JSON.') }
  if (!order || Array.isArray(order) || !Number.isSafeInteger(order.id) || order.id <= 0) return reply(400, 'Invalid order.')
  if (order.status !== 'completed') return reply(200, 'No email for this status.')
  try { await deps.onCompleted(order) } catch { /* recorded by the notifier; never fail the delivery */ }
  return reply(200, 'Completed-order email handled.')
}
