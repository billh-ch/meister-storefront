'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { createCheckoutSessionAction, getShippingMethodsAction } from '@/lib/checkout/actions'
import AddressFields from '@/components/address-fields'
import DeliveryMethods from '@/components/checkout/delivery-methods'
import OrderSummary from '@/components/checkout/order-summary'
import type { AddressInput } from '@/lib/address/schema'
import { addressFromFormData } from '@/lib/address/form-data'
import type { ResolvedCartLine } from '@/lib/cart/resolve'
import type { ShippingMethod } from '@/lib/woocommerce'

const MONO = 'var(--font-space-mono), monospace'

/** Country field changes settle before refetching methods — shipping zones
 *  are country-scoped, but re-fetching on every keystroke of a 2-letter code
 *  would fire mid-edit for no reason. */
const COUNTRY_DEBOUNCE_MS = 400

interface CheckoutFormProps {
  initialAddress?: AddressInput
  /** Guests get an extra email field — a logged-in order takes the email
   *  from the WooCommerce customer record. */
  isGuest?: boolean
  lines: ResolvedCartLine[]
  subtotal: number
  /** Delivery methods for `initialAddress`'s country (or `'GR'`) — refetched
   *  client-side (see `handleCountryChange`) whenever the shopper edits the
   *  country field, since availability is country-scoped. */
  initialMethods: ShippingMethod[]
}

/** Picks the sensible default selection: the cheapest non-pickup courier
 *  option if one exists, else whatever's first (e.g. pickup-only). Never
 *  defaults straight to pickup when a courier exists — most shoppers expect
 *  delivery to their address unless they deliberately choose otherwise. */
function pickDefaultMethodId(methods: ShippingMethod[]): string {
  const courier = methods.find((method) => !method.isPickup)
  return (courier ?? methods[0])?.id ?? ''
}

export default function CheckoutForm({
  initialAddress,
  isGuest = false,
  lines,
  subtotal,
  initialMethods,
}: CheckoutFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)

  const [methods, setMethods] = useState(initialMethods)
  const [selectedMethodId, setSelectedMethodId] = useState(() => pickDefaultMethodId(initialMethods))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Clears any pending debounced fetch on unmount so a slow response can't
  // try to set state on an unmounted component (same pattern as the navbar's
  // search-suggestions debounce).
  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const handleCountryChange = (country: string) => {
    clearTimeout(debounceRef.current)
    const trimmed = country.trim().toUpperCase()
    if (trimmed.length !== 2) return

    debounceRef.current = setTimeout(() => {
      getShippingMethodsAction(trimmed)
        .then((next) => {
          setMethods(next)
          // Keep the current pick if it's still offered for the new country;
          // otherwise fall back to the same "cheapest courier" default.
          setSelectedMethodId((current) =>
            next.some((method) => method.id === current) ? current : pickDefaultMethodId(next),
          )
        })
        .catch(() => {
          // A transient failure just leaves the previous list in place —
          // the real address/country is re-validated again at submit time
          // regardless.
        })
    }, COUNTRY_DEBOUNCE_MS)
  }

  const selectedMethod = methods.find((method) => method.id === selectedMethodId)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)
    const deliveryMethodId = String(formData.get('deliveryMethod') ?? '')

    startTransition(async () => {
      const result = await createCheckoutSessionAction(addressFromFormData(formData), deliveryMethodId)

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
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        {isGuest && (
          <div className="flex flex-col gap-1">
            <label
              htmlFor="checkout-email"
              className="text-xs font-bold tracking-wide text-white uppercase"
              style={{ fontFamily: MONO }}
            >
              Email for order confirmation
            </label>
            <input
              id="checkout-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-white outline-none"
              style={{ border: '1px solid #444444', fontFamily: MONO }}
            />
          </div>
        )}

        <DeliveryMethods methods={methods} selectedId={selectedMethodId} onSelect={setSelectedMethodId} />

        <AddressFields defaultValues={initialAddress} idPrefix="checkout" onCountryChange={handleCountryChange} />

        {error && (
          <p aria-live="polite" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || isRedirecting || methods.length === 0}
          className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
        >
          {isRedirecting ? 'Redirecting to Stripe…' : isPending ? 'Preparing payment…' : 'Continue to payment'}
        </button>
      </form>

      <OrderSummary lines={lines} subtotal={subtotal} shippingCost={selectedMethod?.cost} />
    </div>
  )
}
