'use server'

import { getTranslator, getLocale } from '@/lib/i18n/server'
import { localePath } from '@/lib/i18n'

import { redirect } from 'next/navigation'
import { scheduleWelcomeEmail } from '@/lib/email/send-welcome'
import {
  createWcCustomer,
  DuplicateEmailError,
  findWcCustomerByEmail,
} from '@/lib/woocommerce/queries/create-customer'
import { login as startSession, logout as endSession } from './session'
import { loginSchema, registerSchema } from './schema'
import { requestCustomerToken } from './backend-login'

export type AuthActionResult = { ok: true } | { ok: false; error: string }

export async function registerAction(input: {
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<AuthActionResult> {
  const t = await getTranslator()
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: t('Please fill in every field with a valid email and an 8+ character password.'),
    }
  }

  try {
    const wcCustomerId = await createWcCustomer(parsed.data)
    // We just verified these exact credentials by creating the account with
    // them, so there's no reason to force a second round-trip through the
    // login form right after signup.
    await startSession(wcCustomerId)
    // Welcome email (with the current welcome coupon, if any) after the
    // response is sent. Best effort: it can never slow down or fail sign-up.
    await scheduleWelcomeEmail({ customerId: wcCustomerId, email: parsed.data.email, firstName: parsed.data.firstName, locale: await getLocale() }).catch(() => undefined)
    return { ok: true }
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return { ok: false, error: t('An account with that email already exists.') }
    }
    return { ok: false, error: t('Could not create your account. Please try again.') }
  }
}

/**
 * Authenticates against the WordPress JWT plugin's token endpoint — the one
 * call in this app that verifies a *customer's own* password, rather than
 * using the admin consumer key/secret. The returned token is used once and
 * discarded: every other WooCommerce call (including resolving the numeric
 * customer id right below) still runs on the existing admin key regardless
 * of who's asking, so nothing about an ongoing session depends on this
 * token, or on this endpoint's reliability beyond this one request.
 */
export async function loginAction(input: {
  email: string
  password: string
}): Promise<AuthActionResult> {
  const t = await getTranslator()
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: t('Please enter your email and password.') }
  }

  const baseUrl = process.env.NEXT_PUBLIC_WC_URL
  if (!baseUrl) {
    return { ok: false, error: t('Sign-in is not configured yet.') }
  }

  let response: Response
  try {
    response = await requestCustomerToken(baseUrl, parsed.data.email, parsed.data.password)
  } catch {
    return { ok: false, error: t('Could not reach the store right now. Please try again shortly.') }
  }

  if (!response.ok) {
    // Only a genuine credential rejection from the JWT plugin is "incorrect".
    // A proxy 403, 5xx or HTML error page is an infrastructure problem and
    // must not be reported to the shopper as a wrong password.
    let code = ''
    try {
      const body = (await response.json()) as { code?: unknown } | null
      code = typeof body?.code === 'string' ? body.code : ''
    } catch { /* non-JSON body: not from the JWT plugin */ }
    console.error('[auth] login rejected', { status: response.status, code: code || 'none' })
    if (/incorrect_password|invalid_username|invalid_email|empty_(username|password)/.test(code)) {
      return { ok: false, error: t('Incorrect email or password.') }
    }
    return { ok: false, error: t('Could not reach the store right now. Please try again shortly.') }
  }

  try {
    const data = (await response.json()) as { user_email?: string } | null
    if (!data || typeof data.user_email !== 'string' || !data.user_email) {
      return { ok: false, error: t('Sign-in failed. Please try again.') }
    }

    const wcCustomerId = await findWcCustomerByEmail(data.user_email)
    if (!wcCustomerId) {
      return { ok: false, error: t('We could not find a customer account for that login.') }
    }

    await startSession(wcCustomerId)
    return { ok: true }
  } catch {
    return { ok: false, error: t('Sign-in failed. Please try again.') }
  }
}

export async function logoutAction(): Promise<void> {
  await endSession()
  redirect(localePath('/', await getLocale()))
}
