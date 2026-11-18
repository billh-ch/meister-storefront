import { emailFrom, emailReplyTo } from './config'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
  /** Same key within 24h returns the first send instead of emailing twice. */
  idempotencyKey?: string
  replyTo?: string
}
export type SendResult = { ok: true; id: string } | { ok: false; skipped?: boolean; error: string }

/**
 * Minimal Resend client over fetch (no SDK dependency). Never throws:
 * callers decide what a failed or skipped email means, and none may let an
 * email problem affect an order.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, skipped: true, error: 'RESEND_API_KEY is not configured' }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: emailFrom(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: [message.replyTo ?? emailReplyTo()],
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return { ok: false, error: `Resend responded ${response.status}` }
    const body = (await response.json().catch(() => ({}))) as { id?: string }
    return { ok: true, id: body.id ?? '' }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.name : 'UnknownError' }
  }
}
