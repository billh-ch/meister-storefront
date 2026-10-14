'use client'
import { useTranslation, useLocale } from '@/components/i18n/locale-provider'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import type { CreateCheckoutSessionResult } from '@/lib/checkout/actions'
import AddressFields from '@/components/address-fields'
import DeliveryMethods from '@/components/checkout/delivery-methods'
import OrderSummary from '@/components/checkout/order-summary'
import type { AddressInput } from '@/lib/address/schema'
import { addressFromFormData } from '@/lib/address/form-data'
import type { ResolvedCartLine } from '@/lib/cart/resolve'
import type { ShippingMethod } from '@/lib/woocommerce'
import { createRequestGuard } from '@/lib/checkout/request-guard'
import { isCountryCode } from '@/lib/address/countries'
import { checkoutCartSignature, normalizeShippingAddress, type ShippingQuote } from '@/lib/checkout/model'
import CheckoutCartIssues from './cart-issues'
import BoxNowLockerPicker from './box-now-locker-picker'
import { requiresBoxNowLocker, type BoxNowLocker } from '@/lib/checkout/box-now'

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
  /** Initial delivery quote keeps outages distinct from unavailable methods. */
  initialQuote: ShippingQuote
  boxNowPartnerId?: string
}

/** Preserve WooCommerce's configured order, preferring delivery over pickup. Never
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
  initialQuote,
  boxNowPartnerId,
}: CheckoutFormProps) {
  const t = useTranslation()
  const locale = useLocale()

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [shippingPending, setShippingPending] = useState(false)
  const [quote, setQuote] = useState(initialQuote)
  const [country, setCountry] = useState(initialAddress?.country ?? 'GR')
  const [postcode, setPostcode] = useState(initialAddress?.postcode ?? '')
  const [boxNowLocker, setBoxNowLocker] = useState<BoxNowLocker | null>(null)
  const methods = quote.status === 'ready' ? quote.methods : []
  const [selectedMethodId, setSelectedMethodId] = useState(() => pickDefaultMethodId(initialQuote.status === 'ready' ? initialQuote.methods : []))
  const preferredMethodId = useRef(selectedMethodId)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const requestGuard = useRef(createRequestGuard())
  const formRef = useRef<HTMLFormElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastAddressKey = useRef(initialQuote.status === 'ready' ? JSON.stringify(normalizeShippingAddress(initialAddress ?? {})) : '')
  const cartSignature = checkoutCartSignature(lines)

  // Clears any pending debounced fetch on unmount so a slow response can't
  // try to set state on an unmounted component (same pattern as the navbar's
  // search-suggestions debounce).
  useEffect(() => {
    const guard = requestGuard.current
    return () => {
      clearTimeout(debounceRef.current)
      guard.invalidate()
      abortRef.current?.abort()
    }
  }, [])

  const refreshShipping = (force = false, submittedAddress?: AddressInput) => {
    if (!formRef.current) return
    const values = submittedAddress ?? addressFromFormData(new FormData(formRef.current))
    const address = normalizeShippingAddress(values)
    setCountry(address.country)
    setPostcode(address.postcode ?? '')
    const key = JSON.stringify({ ...address, locale })
    if (!force && key === lastAddressKey.current) return
    lastAddressKey.current = key
    clearTimeout(debounceRef.current)
    const isCurrent = requestGuard.current.begin()
    abortRef.current?.abort()
    if (!isCountryCode(address.country)) {
      setQuote({ status: 'address', error: 'Please choose a valid delivery country.' })
      setShippingPending(false)
      setSelectedMethodId('')
      return
    }
    const previousMethodId = preferredMethodId.current
    setShippingPending(true)
    const controller = new AbortController()
    abortRef.current = controller

    debounceRef.current = setTimeout(() => {
      fetch('/api/checkout/shipping', {
        method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...address, locale }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]),
      })
        .then(async response => {
          const next: ShippingQuote = await response.json()
          if (!['ready', 'cart', 'error', 'address'].includes(next.status)) throw new Error('Invalid shipping response')
          if (!isCurrent()) return
          if (next.status === 'ready' && next.cartSignature !== cartSignature) {
            setQuote({ status: 'cart', error: 'Your cart or product prices have changed. Please review your cart before paying.', issues: [] })
            setSelectedMethodId('')
            return
          }
          setQuote(next)
          const nextMethods = next.status === 'ready' ? next.methods : []
          // Keep the current pick if it's still offered for the new country;
          // otherwise use the first configured delivery method.
          const nextMethodId = nextMethods.some(method => method.id === previousMethodId) ? previousMethodId : pickDefaultMethodId(nextMethods)
          preferredMethodId.current = nextMethodId
          setSelectedMethodId(nextMethodId)
          const nextMethod = nextMethods.find(method => method.id === nextMethodId)
          if (next.status === 'ready' && !requiresBoxNowLocker(address.country, nextMethod?.wcMethodId)) setBoxNowLocker(null)
        })
        .catch(() => {
          if (!isCurrent()) return
          lastAddressKey.current = ''
          setQuote({ status: 'error', error: 'Could not calculate delivery. Please try again.' })
          setSelectedMethodId('')
        })
        .finally(() => { if (isCurrent()) setShippingPending(false) })
    }, ADDRESS_DEBOUNCE_MS)
  }

  const selectedMethod = methods.find((method) => method.id === selectedMethodId)
  const deliveryReady = !shippingPending && quote.status === 'ready' && !!selectedMethod
  const needsLocker = requiresBoxNowLocker(country, selectedMethod?.wcMethodId)
  const canPay = deliveryReady && (!needsLocker || !!boxNowLocker)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canPay || !selectedMethod || isPending || isRedirecting) return
    setError('')
    const formData = new FormData(event.currentTarget)
    const deliveryMethodId = String(formData.get('deliveryMethod') ?? '')

    startTransition(async () => {
      try {
        const response = await fetch('/api/checkout/session', {
          method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale, address: addressFromFormData(formData), deliveryMethodId, expected: { cartSignature, shippingCost: selectedMethod.cost }, ...(needsLocker && boxNowLocker ? { boxNowLocker: { id: boxNowLocker.id } } : {}) }),
          signal: AbortSignal.timeout(45_000),
        })
        const result: CreateCheckoutSessionResult = await response.json()
        if ('error' in result) {
          setError(result.error)
          if (result.refreshShipping) refreshShipping(true, addressFromFormData(formData))
        } else if (result.url) {
          // Stripe Checkout requires navigation to its separate origin.
          setIsRedirecting(true)
          window.location.href = result.url
        } else { throw new Error('Invalid checkout response') }
      } catch {
        setError('Could not prepare checkout. Please try again. Your details have been kept.')
      }
    })
  }

  return (
      <form ref={formRef} onSubmit={handleSubmit} className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <fieldset disabled={isPending || isRedirecting} className="flex min-w-0 flex-col gap-4 border-0 p-0 lg:col-start-1 lg:row-start-1">
        {isGuest && (
          <div className="flex flex-col gap-1">
            <label
              htmlFor="checkout-email"
              className="text-xs font-bold tracking-wide text-white uppercase"
              style={{ fontFamily: MONO }}
            >
              {t("Email for order confirmation")}
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

        <AddressFields defaultValues={initialAddress} idPrefix="checkout" onCountryChange={() => { setBoxNowLocker(null); refreshShipping() }} onShippingAddressChange={() => refreshShipping()} />

        <section aria-label={t("Delivery options")} aria-busy={shippingPending} className="flex min-h-24 flex-col gap-3 border-t border-white/20 pt-4">
        {shippingPending && (
          <p role="status" className="text-xs text-white" style={{ fontFamily: MONO }}>{t("Updating delivery methods…")}</p>
        )}
        {quote.status === "cart" && !shippingPending ? (
          <CheckoutCartIssues error={quote.error} issues={quote.issues} />
        ) : (quote.status === "error" || quote.status === "address") && !shippingPending ? (
          <div>
            <p role="alert" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>{t(quote.error)}</p>
            <button type="button" onClick={() => refreshShipping(true)} className="mt-2 min-h-11 text-xs text-white underline">{t("Retry delivery calculation")}</button>
          </div>
        ) : quote.status === "ready" ? (
          <fieldset disabled={shippingPending} className="border-0 p-0">
          <DeliveryMethods methods={methods} selectedId={selectedMethodId} onSelect={id => {
            if (id !== selectedMethodId) setBoxNowLocker(null)
            preferredMethodId.current = id
            setSelectedMethodId(id)
          }} />
          </fieldset>
        ) : null}
        {needsLocker ? <BoxNowLockerPicker postcode={postcode} partnerId={boxNowPartnerId} locker={boxNowLocker} disabled={!deliveryReady || isPending || isRedirecting} onSelect={setBoxNowLocker} /> : null}
        </section>
        </fieldset>

        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <OrderSummary lines={lines} subtotal={subtotal} shippingCost={deliveryReady ? selectedMethod?.cost : undefined} />
        </div>
        <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2">
        {error && (
          <p aria-live="polite" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
            {t(error)}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || isRedirecting || !canPay}
          className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
        >
          {isRedirecting ? t("Redirecting to Stripe…") : isPending ? t("Preparing payment…") : t("Continue to payment")}
        </button>
        </div>
      </form>
  )
}
