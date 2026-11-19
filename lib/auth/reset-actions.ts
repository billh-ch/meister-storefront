'use server'

import { after } from 'next/server'
import { headers } from 'next/headers'
import { getTranslator, getLocale } from '@/lib/i18n/server'
import { completePasswordReset, normalizeEmail, requestPasswordReset } from './password-reset'
import { realResetDeps } from './reset-deps'
import { allowResetRequestFromClient, allowResetSubmitFromClient } from './reset-rate-limit'

export type ResetActionResult = { ok: true } | { ok: false; error: string }

async function clientKey() {
  const incoming = await headers()
  return incoming.get('x-forwarded-for')?.split(',')[0]?.trim() || incoming.get('x-real-ip') || 'unknown'
}

/**
 * Always answers the same way for a valid-looking email, whether or not an
 * account exists. The lookup and the email happen after the response, so even
 * the response time says nothing about the address.
 */
export async function requestPasswordResetAction(input: { email: string }): Promise<ResetActionResult> {
  const t = await getTranslator()
  const email = normalizeEmail(input?.email)
  if (!email) return { ok: false, error: t('Please enter a valid email address.') }
  if (!(await allowResetRequestFromClient(await clientKey()))) {
    return { ok: false, error: t('Too many attempts. Please wait a few minutes and try again.') }
  }
  const locale = await getLocale()
  after(async () => {
    try { await requestPasswordReset({ email, locale }, realResetDeps) }
    catch (error) { console.error('[auth] password reset request failed', error instanceof Error ? error.name : 'UnknownError') }
  })
  return { ok: true }
}

export async function resetPasswordAction(input: { token: string; password: string }): Promise<ResetActionResult> {
  const t = await getTranslator()
  if (!(await allowResetSubmitFromClient(await clientKey()))) {
    return { ok: false, error: t('Too many attempts. Please wait a few minutes and try again.') }
  }
  const result = await completePasswordReset({ token: input?.token, password: input?.password }, realResetDeps)
  if (result.ok) return { ok: true }
  if (result.reason === 'weak') return { ok: false, error: t('Please enter a password of at least 8 characters.') }
  if (result.reason === 'invalid') return { ok: false, error: t('This reset link is invalid or has expired.') }
  return { ok: false, error: t('Could not reset your password. Please try again.') }
}
