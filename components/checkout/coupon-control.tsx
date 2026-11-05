'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/components/i18n/locale-provider'
import type { PromotionQuote } from '@/lib/promotions/schema'

export default function CouponControl({ quote, busy, onApply, onRemove }: { quote: PromotionQuote | null; busy: boolean; onApply: (code: string) => void; onRemove: () => void }) {
  const t = useTranslation()
  const [code, setCode] = useState('')
  const disclosure = useRef<HTMLDetailsElement>(null)
  const appliedCode = quote?.coupon.code
  useEffect(() => { if (appliedCode && disclosure.current) disclosure.current.open = true }, [appliedCode])
  const status = quote?.coupon.status
  return (
    <details className="border-t border-white/20 pt-4" ref={disclosure}>
      <summary className="min-h-11 cursor-pointer text-sm text-white">{t('Have a coupon code?')}</summary>
      <div className="mt-2 flex flex-col gap-3">
        <label htmlFor="checkout-coupon" className="text-xs text-white">{t('Coupon code')}</label>
        <div className="flex gap-2">
          <input id="checkout-coupon" name="couponCode" type="text" value={code} onChange={event => setCode(event.target.value)} maxLength={100} autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={busy} className="min-h-11 min-w-0 flex-1 border border-white/30 bg-transparent px-3 text-sm text-white" onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (code.trim() && !busy) onApply(code) } }} />
          <button type="button" disabled={busy || !code.trim()} onClick={() => onApply(code)} className="btn-gold min-h-11 px-4 text-xs disabled:opacity-50">{t('Apply')}</button>
        </div>
        {quote?.coupon.code && <div className="flex min-w-0 items-center justify-between gap-3 text-xs text-white"><span className="break-all">{quote.coupon.code}</span><button type="button" className="min-h-11 shrink-0 underline" disabled={busy} onClick={onRemove}>{t('Remove coupon')}</button></div>}
        <p role={status === 'invalid' ? 'alert' : 'status'} aria-live="polite" className="text-xs text-white/75">
          {busy ? t('Updating your order total…') : status === 'applied' ? t('Coupon applied.') : status === 'not_better' ? t('Your current offer gives you an equal or better price. Discounts cannot be combined.') : status === 'invalid' ? t('This coupon is not available for this order. Check the code or remove it to continue.') : status === 'email_required' ? t('Enter your email address to check this coupon.') : ''}
        </p>
      </div>
    </details>
  )
}
