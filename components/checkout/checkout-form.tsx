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
import { createRequestGuard } from '@/lib/checkout/request-guard'
import { isCountryCode } from '@/lib/address/countries'

const MONO = 'var(--font-space-mono), monospace'

/** Avoid dispatching a new rate request on every address keystroke. */
const ADDRESS_DEBOUNCE_MS = 400

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
  const [shippingPending, setShippingPending] = useState(false)
  const [shippingError, setShippingError] = useState('')

  const [methods, setMethods] = useState(initialMethods)
  const [selectedMethodId, setSelectedMethodId] = useState(() => pickDefaultMethodId(initialMethods))
  const preferredMethodId = useRef(selectedMethodId)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const requestGuard = useRef(createRequestGuard())
  const formRef = useRef<HTMLFormElement>(null)

  // Clears any pending debounced fetch on unmount so a slow response can't
  // try to set state on an unmounted component (same pattern as the navbar's
  // search-suggestions debounce).
  useEffect(() => {
    const guard = requestGuard.current
    return () => {
      clearTimeout(debounceRef.current)
      guard.invalidate()
    }
  }, [])

  const refreshShipping = () => {
    if (!formRef.current) return
    const values = addressFromFormData(new FormData(formRef.current))
    const address = {
      country: values.country.trim().toUpperCase(),
      ...(values.city.trim() && { city: values.city.trim() }),
      ...(values.postcode.trim() && { postcode: values.postcode.trim() }),
      ...(values.address1.trim() && { address1: values.address1.trim() }),
    }
    clearTimeout(debounceRef.current)
    const isCurrent = requestGuard.current.begin()
    if (!isCountryCode(address.country)) return
    const previousMethodId = preferredMethodId.current
    setShippingPending(true)
    setShippingError('')
    setMethods([])
    setSelectedMethodId('')

    debounceRef.current = setTimeout(() => {
      getShippingMethodsAction(address)
        .then((next) => {
          if (!isCurrent()) return
          setMethods(next)
          // Keep the current pick if it's still offered for the new country;
          // otherwise fall back to the same "cheapest courier" default.
          const nextMethodId = next.some(method => method.id === previousMethodId) ? previousMethodId : pickDefaultMethodId(next)
          preferredMethodId.current = nextMethodId
          setSelectedMethodId(nextMethodId)
        })
        .catch(() => {
          if (!isCurrent()) return
          setShippingError('Could not calculate delivery. Please try again.')
        })
        .finally(() => { if (isCurrent()) setShippingPending(false) })
    }, ADDRESS_DEBOUNCE_MS)
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
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
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

        {shippingPending ? (
          <p role="status" className="text-xs text-white" style={{ fontFamily: MONO }}>Updating delivery methods…</p>
        ) : shippingError ? (
          <div>
            <p role="alert" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>{shippingError}</p>
            <button type="button" onClick={refreshShipping} className="mt-2 text-xs text-white underline">Retry delivery calculation</button>
          </div>
        ) : (
          <DeliveryMethods methods={methods} selectedId={selectedMethodId} onSelect={id => {
            preferredMethodId.current = id
            setSelectedMethodId(id)
          }} />
        )}

        <AddressFields defaultValues={initialAddress} idPrefix="checkout" onCountryChange={refreshShipping} onShippingAddressChange={refreshShipping} />

        {error && (
          <p aria-live="polite" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || isRedirecting || shippingPending || !!shippingError || !selectedMethodId}
          className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
        >
          {isRedirecting ? 'Redirecting to Stripe…' : isPending ? 'Preparing payment…' : 'Continue to payment'}
        </button>
      </form>

      <OrderSummary lines={lines} subtotal={subtotal} shippingCost={selectedMethod?.cost} />
    </div>
  )
}
