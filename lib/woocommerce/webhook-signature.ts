import { createHmac, timingSafeEqual } from 'node:crypto'

/** WooCommerce signs the exact request bytes with base64 HMAC-SHA256. */
export function verifyWooCommerceWebhook(rawBody: Buffer, signature: string, secret: string): boolean {
  if (!secret || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest()
  const received = Buffer.from(signature, 'base64')
  return received.length === expected.length && received.toString('base64') === signature && timingSafeEqual(expected, received)
}
