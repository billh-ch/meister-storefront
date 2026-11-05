'use client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation, useLocale } from '@/components/i18n/locale-provider'
import AddressFields from '@/components/address-fields'
import DeliveryMethods from '@/components/checkout/delivery-methods'
import OrderSummary from '@/components/checkout/order-summary'
import CouponControl from './coupon-control'
import BoxNowLockerPicker from './box-now-locker-picker'
import { addressFromFormData } from '@/lib/address/form-data'
import type { AddressInput } from '@/lib/address/schema'
import type { ResolvedCartLine } from '@/lib/cart/resolve'
import { captureCampaignIntent, resolveCampaignCaptureFailure } from '@/lib/promotions/campaign-client'
import { promotionQuoteSchema, type PromotionQuote } from '@/lib/promotions/schema'
import { createRequestGuard } from '@/lib/checkout/request-guard'
import { checkoutCartSignature } from '@/lib/checkout/model'
import { requiresBoxNowLocker, type BoxNowLocker } from '@/lib/checkout/box-now'

export default function PromotionsForm({ initialAddress, isGuest, lines, subtotal, boxNowPartnerId }: { initialAddress?: AddressInput; isGuest: boolean; lines: ResolvedCartLine[]; subtotal: number; boxNowPartnerId?: string }) {
  const t = useTranslation()
  const locale = useLocale()
  const form = useRef<HTMLFormElement>(null)
  const guard = useRef(createRequestGuard())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const abort = useRef<AbortController | null>(null)
  const selected = useRef('')
  const [quote, setQuote] = useState<PromotionQuote | null>(null)
  const [busy, setBusy] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [locker, setLocker] = useState<BoxNowLocker | null>(null)
  const [country, setCountry] = useState(initialAddress?.country ?? 'GR')
  const [postcode, setPostcode] = useState(initialAddress?.postcode ?? '')

  const refresh = useCallback((operation: 'quote' | 'apply' | 'remove' = 'quote', code?: string) => {
    if (!form.current) return
    clearTimeout(timer.current)
    abort.current?.abort()
    const current = guard.current.begin()
    const values = addressFromFormData(new FormData(form.current))
    setCountry(values.country); setPostcode(values.postcode)
    setBusy(true); setError('')
    const controller = new AbortController(); abort.current = controller
    timer.current = setTimeout(async () => {
      try {
        if (operation !== 'quote') resolveCampaignCaptureFailure()
        await captureCampaignIntent()
        const response = await fetch('/api/checkout/promotions', {
          method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(35_000)]),
          body: JSON.stringify({ scope: 'checkout', locale, operation, code, email: values.email ?? '', address: { country: values.country, city: values.city, postcode: values.postcode, address1: values.address1, address2: values.address2 }, shippingId: selected.current }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error('Quote unavailable')
        const next = promotionQuoteSchema.parse(data.quote)
        if (!current()) return
        selected.current = next.shippingId
        setQuote(next)
      } catch {
        if (current()) { setQuote(null); setError('Could not update your order total. Please try again.') }
      } finally { if (current()) setBusy(false) }
    }, operation === 'quote' ? 400 : 0)
  }, [locale])

  useEffect(() => {
    refresh()
    const invalidate = () => refresh()
    window.addEventListener('mm:cart-updated', invalidate)
    window.addEventListener('mm:campaign-captured', invalidate)
    const activeGuard = guard.current
    return () => { clearTimeout(timer.current); abort.current?.abort(); activeGuard.invalidate(); window.removeEventListener('mm:cart-updated', invalidate); window.removeEventListener('mm:campaign-captured', invalidate) }
  }, [refresh])
  useEffect(() => {
    if (!quote) return
    const ms = Math.max(0, quote.expiresAt * 1000 - Date.now() - 5000)
    const expiry = setTimeout(() => refresh(), ms)
    return () => clearTimeout(expiry)
  }, [quote, refresh])

  const method = quote?.methods.find(m => m.id === quote.shippingId)
  const needsLocker = requiresBoxNowLocker(country, method?.wcMethodId)
  const canPay = quote && !busy && !quote.provisional && !['invalid', 'email_required'].includes(quote.coupon.status) && (!needsLocker || locker)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canPay || !quote || paying) return
    setPaying(true); setError('')
    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({ locale, address: addressFromFormData(new FormData(event.currentTarget)), deliveryMethodId: quote.shippingId || 'no_shipping', expected: { cartSignature: checkoutCartSignature(lines), shippingCost: quote.shipping / 100 }, promotion: { reference: quote.reference, total: quote.total }, ...(needsLocker && locker ? { boxNowLocker: { id: locker.id } } : {}) }),
      })
      const result = await response.json()
      if (!response.ok || !result.url) throw new Error('Payment preparation failed')
      window.location.assign(result.url)
    } catch { setPaying(false); refresh(); setError('Could not prepare checkout. Please refresh your order total and try again.') }
  }
  return (
    <form ref={form} onSubmit={submit} onChange={event => { if (!(event.target instanceof HTMLInputElement) || event.target.name !== 'couponCode') refresh() }} className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start" style={{ fontFamily: 'var(--font-space-mono), monospace' }}>
      <fieldset disabled={paying} className="flex min-w-0 flex-col gap-4 border-0 p-0">
        {isGuest && <label className="flex flex-col gap-2 text-xs text-white">{t('Email for order confirmation')}<input name="email" type="email" autoComplete="email" required className="min-h-11 min-w-0 border border-white/30 bg-transparent px-3 text-sm" /></label>}
        <AddressFields defaultValues={initialAddress} idPrefix="checkout" onCountryChange={() => { selected.current = ''; setLocker(null); refresh() }} onShippingAddressChange={() => refresh()} />
        <section aria-label={t('Delivery options')} aria-busy={busy} className="border-t border-white/20 pt-4">
          {quote?.methods.length ? <DeliveryMethods methods={quote.methods.map(m => ({ ...m, cost: m.cost / 100 }))} selectedId={quote.shippingId} onSelect={id => { selected.current = id; setLocker(null); refresh() }} /> : null}
          {needsLocker && <BoxNowLockerPicker postcode={postcode} partnerId={boxNowPartnerId} locker={locker} disabled={busy || paying} onSelect={setLocker} />}
        </section>
      </fieldset>
      <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1 lg:row-span-2">
        <OrderSummary lines={lines} subtotal={subtotal} promotionQuote={quote} totalsPending={busy || !quote} />
        <CouponControl quote={quote} busy={busy || paying} onApply={code => refresh('apply', code)} onRemove={() => refresh('remove')} />
      </div>
      <div className="flex flex-col gap-3 lg:col-start-1">
        <p role="status" aria-live="polite" className="text-xs text-white/75">{busy ? t('Updating your order total…') : ''}</p>
        {error && <div role="alert" className="text-xs text-white"><p>{t(error)}</p><button type="button" className="min-h-11 underline" disabled={busy} onClick={() => { selected.current = ''; refresh() }}>{t('Retry')}</button></div>}
        <button type="submit" disabled={!canPay || paying} className="btn-gold flex min-h-12 items-center justify-center px-4 text-xs uppercase disabled:opacity-50">{paying ? t('Preparing payment…') : quote?.total === 0 ? t('Place order') : t('Continue to payment')}</button>
      </div>
    </form>
  )
}
