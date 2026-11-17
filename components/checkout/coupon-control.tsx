'use client'
import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from '@/components/i18n/locale-provider'
import { formatPrice } from '@/lib/mock-data'

const MONO = 'var(--font-space-mono), monospace'

interface CouponControlProps {
  applied: { code: string; discount: number } | null
  pending: boolean
  error: string
  disabled: boolean
  onApply: (code: string) => void
  onRemove: () => void
}

/** One discount code per order. Lives beside the order summary, outside the
 *  address fieldset, so it stays usable while delivery methods refresh. */
export default function CouponControl({ applied, pending, error, disabled, onApply, onRemove }: CouponControlProps) {
  const t = useTranslation()
  const [value, setValue] = useState('')

  const submit = () => {
    const code = value.trim()
    if (code && !pending && !disabled) onApply(code)
  }
  // Enter applies the code; it must never submit the payment form.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    submit()
  }

  return (
    <div className="mb-3 flex flex-col gap-2" style={{ fontFamily: MONO }}>
      {applied ? (
        <div className="flex items-center justify-between gap-3 p-3 text-xs" style={{ border: '1px solid #444444' }}>
          <span className="min-w-0 text-white">
            <span className="block break-words">{t('Discount code')}: {applied.code}</span>
            <span className="text-[#FFD700]">− {formatPrice(applied.discount)}</span>
          </span>
          <button
            type="button"
            onClick={() => { setValue(''); onRemove() }}
            disabled={disabled}
            className="min-h-11 shrink-0 text-xs text-white underline"
          >
            {t('Remove')}
          </button>
        </div>
      ) : (
        <>
          <label htmlFor="checkout-coupon" className="text-xs font-bold tracking-wide text-white uppercase">
            {t('Discount code')}
          </label>
          <div className="flex gap-2">
            <input
              id="checkout-coupon"
              type="text"
              value={value}
              onChange={event => setValue(event.target.value)}
              onKeyDown={onKeyDown}
              disabled={disabled}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={50}
              aria-describedby={error ? 'checkout-coupon-error' : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none"
              style={{ border: '1px solid #444444' }}
            />
            <button
              type="button"
              onClick={submit}
              disabled={disabled || pending || value.trim() === ''}
              className="min-h-11 px-4 text-xs text-white uppercase"
              style={{ border: '1px solid #FFD700' }}
            >
              {pending ? t('Checking…') : t('Apply')}
            </button>
          </div>
        </>
      )}
      {error && (
        <p id="checkout-coupon-error" role="alert" className="text-xs" style={{ color: '#FF6B6B' }}>
          {error}
        </p>
      )}
    </div>
  )
}
