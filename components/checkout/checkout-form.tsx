'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { createPaymentIntentAction } from '@/lib/checkout/actions'
import PaymentForm from './payment-form'

const MONO = 'var(--font-space-mono), monospace'

const FIELD_CLASS = 'bg-transparent px-3 py-2 text-sm text-white outline-none'
const FIELD_STYLE = { border: '1px solid #444444', fontFamily: MONO }
const LABEL_CLASS = 'text-xs font-bold tracking-wide text-white uppercase'

export default function CheckoutForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await createPaymentIntentAction({
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
        address1: String(formData.get('address1') ?? ''),
        address2: String(formData.get('address2') ?? '') || undefined,
        city: String(formData.get('city') ?? ''),
        postcode: String(formData.get('postcode') ?? ''),
        country: String(formData.get('country') ?? 'GR'),
        phone: String(formData.get('phone') ?? ''),
      })

      if ('error' in result) {
        setError(result.error)
      } else {
        setClientSecret(result.clientSecret)
      }
    })
  }

  if (clientSecret) {
    return <PaymentForm clientSecret={clientSecret} />
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="checkout-first-name" className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            First name
          </label>
          <input id="checkout-first-name" name="firstName" type="text" required autoComplete="given-name" className={FIELD_CLASS} style={FIELD_STYLE} />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="checkout-last-name" className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            Last name
          </label>
          <input id="checkout-last-name" name="lastName" type="text" required autoComplete="family-name" className={FIELD_CLASS} style={FIELD_STYLE} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="checkout-address1" className={LABEL_CLASS} style={{ fontFamily: MONO }}>
          Address
        </label>
        <input id="checkout-address1" name="address1" type="text" required autoComplete="address-line1" className={FIELD_CLASS} style={FIELD_STYLE} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="checkout-address2" className={LABEL_CLASS} style={{ fontFamily: MONO }}>
          Apartment, suite, etc. (optional)
        </label>
        <input id="checkout-address2" name="address2" type="text" autoComplete="address-line2" className={FIELD_CLASS} style={FIELD_STYLE} />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="checkout-city" className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            City
          </label>
          <input id="checkout-city" name="city" type="text" required autoComplete="address-level2" className={FIELD_CLASS} style={FIELD_STYLE} />
        </div>
        <div className="flex w-32 flex-col gap-1">
          <label htmlFor="checkout-postcode" className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            Postcode
          </label>
          <input id="checkout-postcode" name="postcode" type="text" required autoComplete="postal-code" className={FIELD_CLASS} style={FIELD_STYLE} />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex w-24 flex-col gap-1">
          <label htmlFor="checkout-country" className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            Country
          </label>
          <input
            id="checkout-country"
            name="country"
            type="text"
            required
            maxLength={2}
            defaultValue="GR"
            autoComplete="country"
            className={`${FIELD_CLASS} uppercase`}
            style={FIELD_STYLE}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="checkout-phone" className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            Phone
          </label>
          <input id="checkout-phone" name="phone" type="tel" required autoComplete="tel" className={FIELD_CLASS} style={FIELD_STYLE} />
        </div>
      </div>

      {error && (
        <p aria-live="polite" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
      >
        {isPending ? 'Preparing payment…' : 'Continue to payment'}
      </button>
    </form>
  )
}
