'use server'

import { revalidatePath } from 'next/cache'
import { getTranslator } from '@/lib/i18n/server'
import { getSession } from '@/lib/auth/session'
import { cancelOrderForCustomer, isCancelReason } from '@/lib/orders/cancel'
import { realCancelDeps } from '@/lib/orders/cancel-deps'

export type CancelActionResult = { ok: true; message: string } | { ok: false; error: string }

export async function cancelOrderAction(input: { orderId: number; reason?: string }): Promise<CancelActionResult> {
  const t = await getTranslator()
  try {
    return await cancel(input, t)
  } catch (error) {
    console.error('[cancel] action failed', error instanceof Error ? error.name : 'UnknownError')
    return { ok: false, error: t('We could not confirm the cancellation right now. If it went through, you will receive an email shortly. Otherwise, please try again in a few minutes or contact us.') }
  }
}

async function cancel(input: { orderId: number; reason?: string }, t: Awaited<ReturnType<typeof getTranslator>>): Promise<CancelActionResult> {
  const { wcCustomerId } = await getSession()
  if (!wcCustomerId) return { ok: false, error: t('Please sign in to continue.') }
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') return { ok: false, error: t('Orders cannot be cancelled in demo mode.') }

  const orderId = Number(input?.orderId)
  if (!Number.isSafeInteger(orderId) || orderId <= 0) return { ok: false, error: t('This order can no longer be cancelled online. Please contact us.') }
  const reason = isCancelReason(input?.reason) ? input.reason : 'none'

  const result = await cancelOrderForCustomer({ orderId, customerId: wcCustomerId, reason }, realCancelDeps())
  revalidatePath('/account')
  if (result.ok) return { ok: true, message: t('Your order has been cancelled. Your refund is on its way and usually appears within 5–10 business days.') }
  if (result.reason === 'busy') return { ok: false, error: t('This order is being updated. Please refresh the page in a moment.') }
  if (result.reason === 'refund_failed') return { ok: false, error: t('We could not confirm the cancellation right now. If it went through, you will receive an email shortly. Otherwise, please try again in a few minutes or contact us.') }
  return { ok: false, error: t('This order can no longer be cancelled online. Please contact us.') }
}
