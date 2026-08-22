import Stripe from 'stripe'

let _stripe: Stripe | null = null

/**
 * Lazy singleton — never top-level-instantiate against an env var that may
 * be unset at build time (e.g. before the Marketplace integration has run).
 * No explicit `apiVersion` — the SDK pins its own default, safer than
 * guessing a version string by hand.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')

  _stripe = new Stripe(key)
  return _stripe
}
