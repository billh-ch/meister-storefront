'use client'

import { useState, type FormEvent } from 'react'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { getStripeClient } from '@/lib/stripe-client'

const MONO = 'var(--font-space-mono), monospace'

function PaymentElementForm() {
  const stripe = useStripe()
  const elements = useElements()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stripe || !elements) return

    setIsSubmitting(true)
    setError('')

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/confirmation`,
      },
    })

    // A successful confirmation redirects the browser away from this page
    // itself — reaching this line at all means it didn't.
    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.')
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
        disabled={!stripe || isSubmitting}
        className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
      >
        {isSubmitting ? 'Processing…' : 'Place order'}
      </button>
    </form>
  )
}

export default function PaymentForm({ clientSecret }: { clientSecret: string }) {
  return (
    <Elements
      stripe={getStripeClient()}
      options={{
        clientSecret,
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
      }}
    >
      <PaymentElementForm />
    </Elements>
  )
}
