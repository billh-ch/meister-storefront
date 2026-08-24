'use client'

import { useState, type FormEvent } from 'react'
import { CheckoutElementsProvider, PaymentElement, useCheckoutElements } from '@stripe/react-stripe-js/checkout'
import { getStripeClient } from '@/lib/stripe-client'

const MONO = 'var(--font-space-mono), monospace'

function PaymentElementForm() {
  const checkoutState = useCheckoutElements()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (checkoutState.type === 'loading') {
    return (
      <p className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
        Loading payment form…
      </p>
    )
  }

  if (checkoutState.type === 'error') {
    return (
      <p className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
        {checkoutState.error.message}
      </p>
    )
  }

  const { checkout } = checkoutState

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsSubmitting(true)
    setError('')

    const result = await checkout.confirm()

    // A successful confirmation redirects the browser away from this page
    // itself — reaching this line at all means it didn't.
    if (result.type === 'error') {
      setError(result.error.message ?? 'Payment failed. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />

      {error && (
        <p aria-live="polite" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
      >
        {isSubmitting ? 'Processing…' : 'Place order'}
      </button>
    </form>
  )
}

export default function PaymentForm({ clientSecret }: { clientSecret: string }) {
  return (
    <CheckoutElementsProvider
      stripe={getStripeClient()}
      options={{
        clientSecret,
        elementsOptions: {
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#FFD700',
              colorBackground: '#1B1B18',
              colorText: '#FFFFFF',
              colorDanger: '#FF6B6B',
              fontFamily: 'var(--font-space-mono), monospace',
              borderRadius: '0px',
            },
          },
        },
      }}
    >
      <PaymentElementForm />
    </CheckoutElementsProvider>
  )
}
