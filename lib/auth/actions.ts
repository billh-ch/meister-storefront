'use server'

import { redirect } from 'next/navigation'
import {
  createWcCustomer,
  DuplicateEmailError,
  findWcCustomerByEmail,
} from '@/lib/woocommerce/queries/create-customer'
import { login as startSession, logout as endSession } from './session'
import { loginSchema, registerSchema } from './schema'

export type AuthActionResult = { ok: true } | { ok: false; error: string }

export async function registerAction(input: {
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fill in every field with a valid email and an 8+ character password.',
    }
  }

  try {
    const wcCustomerId = await createWcCustomer(parsed.data)
    // We just verified these exact credentials by creating the account with
    // them, so there's no reason to force a second round-trip through the
    // login form right after signup.
    await startSession(wcCustomerId)
    return { ok: true }
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return { ok: false, error: 'An account with that email already exists.' }
    }
    return { ok: false, error: 'Could not create your account. Please try again.' }
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
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Please enter your email and password.' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_WC_URL
  if (!baseUrl) {
    return { ok: false, error: 'Sign-in is not configured yet.' }
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/wp-json/jwt-auth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: parsed.data.email, password: parsed.data.password }),
    })
  } catch {
    return { ok: false, error: 'Could not reach the store right now. Please try again shortly.' }
  }

  if (!response.ok) {
    return { ok: false, error: 'Incorrect email or password.' }
  }

  const data = (await response.json()) as { user_email?: string }
  if (!data.user_email) {
    return { ok: false, error: 'Sign-in failed. Please try again.' }
  }

  const wcCustomerId = await findWcCustomerByEmail(data.user_email)
  if (!wcCustomerId) {
    return { ok: false, error: 'We could not find a customer account for that login.' }
  }

  await startSession(wcCustomerId)
  return { ok: true }
}

export async function logoutAction(): Promise<void> {
  await endSession()
  redirect('/')
}
