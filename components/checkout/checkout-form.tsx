'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { createCheckoutSessionAction } from '@/lib/checkout/actions'
import AddressFields from '@/components/address-fields'
import type { AddressInput } from '@/lib/address/schema'
import { addressFromFormData } from '@/lib/address/form-data'

const MONO = 'var(--font-space-mono), monospace'

interface CheckoutFormProps {
  initialAddress?: AddressInput
}

export default function CheckoutForm({ initialAddress }: CheckoutFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await createCheckoutSessionAction(addressFromFormData(formData))

      if ('error' in result) {
        setError(result.error)
      } else {
        // Full browser navigation, not next/navigation — the destination
        // is checkout.stripe.com, a different origin entirely.
        setIsRedirecting(true)
        window.location.href = result.url
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AddressFields defaultValues={initialAddress} idPrefix="checkout" />

      {error && (
        <p aria-live="polite" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || isRedirecting}
        className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
      >
        {isRedirecting ? 'Redirecting to Stripe…' : isPending ? 'Preparing payment…' : 'Continue to payment'}
      </button>
    </form>
  )
}
