import { revalidateTag } from 'next/cache'
import { handleProductWebhook } from '@/lib/woocommerce/product-webhook'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  return handleProductWebhook(request, {
    secret: process.env.WC_WEBHOOK_SECRET || '',
    // Next 16's explicit expiration form is intended for external webhooks.
    // The next visitor fetches fresh data instead of seeing a stale offer.
    invalidate: tag => revalidateTag(tag, { expire: 0 }),
  })
}
