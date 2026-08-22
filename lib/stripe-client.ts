'use client'

import { loadStripe, type Stripe } from '@stripe/stripe-js'

let _stripePromise: Promise<Stripe | null> | null = null

/** Lazy singleton for the browser-side Stripe.js instance. */
export function getStripeClient(): Promise<Stripe | null> {
  if (!_stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    _stripePromise = loadStripe(key ?? '')
  }
  return _stripePromise
}
