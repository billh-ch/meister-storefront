'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslation } from '@/components/i18n/locale-provider'
import { cancelOrderAction } from '@/lib/account/cancel-actions'
import { formatPrice } from '@/lib/mock-data'

const MONO = 'var(--font-space-mono), monospace'
const REASONS: { value: string; label: string }[] = [
  { value: 'ordered_by_mistake', label: 'Ordered by mistake' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'found_cheaper', label: 'Found a better price' },
  { value: 'delivery_too_slow', label: 'Delivery takes too long' },
  { value: 'other', label: 'Other reason' },
]

interface CancelOrderProps { orderId: number; orderNumber: string; total: number; deadline: string }

/** Two-step cancel: the first click only opens the confirmation. */
export default function CancelOrder({ orderId, orderNumber, total, deadline }: CancelOrderProps) {
  const t = useTranslation()
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [isPending, startTransition] = useTransition()

  // Fixed locale and shop timezone so the server and browser render the same text.
  const until = new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : 'en-GB', {
    hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', timeZone: 'Europe/Athens',
  }).format(new Date(deadline))

  const confirm = () => {
    setError('')
    startTransition(async () => {
      try {
        const result = await cancelOrderAction({ orderId, reason: reason || undefined })
        if (result.ok) { setDone(result.message); setOpen(false); router.refresh() }
        else setError(result.error)
      } catch {
        setError(t('We could not confirm the cancellation right now. If it went through, you will receive an email shortly. Otherwise, please try again in a few minutes or contact us.'))
      }
    })
  }

  if (done) {
    return <p role="status" className="mt-3 p-3 text-xs text-white" style={{ fontFamily: MONO, border: '1px solid #FFD700' }}>{done}</p>
  }

  if (!open) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3" style={{ fontFamily: MONO }}>
        <button type="button" onClick={() => setOpen(true)} className="min-h-11 px-4 text-xs text-white uppercase" style={{ border: '1px solid #FF6B6B' }}>
          {t('Cancel order')}
        </button>
        <span className="text-xs text-[#999999]">{t('You can cancel until {time}.', { time: until })}</span>
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-3 p-3" style={{ fontFamily: MONO, border: '1px solid #444444' }}>
      <p className="text-sm text-white">
        {t('Cancel order #{number}? We will refund {amount} to your original payment method. This cannot be undone.', { number: orderNumber, amount: formatPrice(total) })}
      </p>
      <label htmlFor={`cancel-reason-${orderId}`} className="text-xs font-bold tracking-wide text-white uppercase">{t('Reason (optional)')}</label>
      <select
        id={`cancel-reason-${orderId}`}
        value={reason}
        onChange={event => setReason(event.target.value)}
        disabled={isPending}
        className="min-h-11 bg-[#1B1B18] px-3 text-sm text-white"
        style={{ border: '1px solid #444444' }}
      >
        <option value="">{t('Choose a reason')}</option>
        {REASONS.map(option => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
      </select>
      {error && <p role="alert" className="text-xs" style={{ color: '#FF6B6B' }}>{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={confirm} disabled={isPending} className="min-h-11 px-4 text-xs text-white uppercase" style={{ border: '1px solid #FF6B6B', backgroundColor: '#3A1A1A' }}>
          {isPending ? t('Cancelling…') : t('Yes, cancel order')}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError('') }} disabled={isPending} className="min-h-11 px-4 text-xs text-white uppercase" style={{ border: '1px solid #444444' }}>
          {t('Keep order')}
        </button>
      </div>
    </div>
  )
}
