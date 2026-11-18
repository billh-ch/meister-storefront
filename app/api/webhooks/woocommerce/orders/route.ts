import { handleOrderWebhook } from '@/lib/woocommerce/order-webhook'
import { notifyOrderCancelled, notifyOrderCompleted } from '@/lib/email/notify'

export const runtime = 'nodejs'

/** WooCommerce → Settings → Advanced → Webhooks: topic "Order updated". See docs/guides/order-emails.md. */
export async function POST(request: Request): Promise<Response> {
  return handleOrderWebhook(request, {
    secret: process.env.WC_ORDER_WEBHOOK_SECRET || process.env.WC_WEBHOOK_SECRET || '',
    onCompleted: order => notifyOrderCompleted(order),
    onCancelled: order => notifyOrderCancelled(order),
  })
}
