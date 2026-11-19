import { isLocale, localePath, type Locale } from '@/lib/i18n'
import { emailAssetBase, emailReplyTo } from './config'
import { sendEmail } from './resend'
import { buildPasswordChanged, buildPasswordReset } from './templates/account'
import { RESET_TTL_MINUTES } from '@/lib/auth/password-reset'

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : 'en')

/** Account-security emails. Return whether Resend accepted the message; never throw. */
export async function sendPasswordResetEmail(input: {
  to: string; firstName?: string; locale: string; token: string; tokenHash: string
}, send: typeof sendEmail = sendEmail): Promise<boolean> {
  const locale = localeOf(input.locale)
  const resetUrl = `${emailAssetBase()}${localePath('/reset-password', locale)}?token=${encodeURIComponent(input.token)}`
  const message = buildPasswordReset({ firstName: input.firstName, locale, resetUrl, minutes: RESET_TTL_MINUTES })
  const result = await send({ to: input.to, ...message, idempotencyKey: `pwreset-${input.tokenHash.slice(0, 40)}` })
  if (!result.ok) console.error('[email]', { label: 'password-reset', error: result.error })
  return result.ok
}

export async function sendPasswordChangedEmail(input: {
  to: string; firstName?: string; locale: string; at: number
}, send: typeof sendEmail = sendEmail): Promise<void> {
  const locale = localeOf(input.locale)
  const message = buildPasswordChanged({ firstName: input.firstName, locale, supportEmail: emailReplyTo() })
  const result = await send({ to: input.to, ...message, idempotencyKey: `pwchanged-${input.at}-${input.to}`.slice(0, 200) })
  if (!result.ok) console.error('[email]', { label: 'password-changed', error: result.error })
}
