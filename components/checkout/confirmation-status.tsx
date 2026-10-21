'use client'
import { useTranslation } from '@/components/i18n/locale-provider'

import { useEffect, useState } from 'react'
import Link from '@/components/i18n/localized-link'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'
const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS = 8

interface OrderSummary {
  id: number
  number: string
}

interface GuestSignup {
  first: string
  last: string
  email: string
}

interface ConfirmationStatusProps {
  paymentIntentId: string
  /** Present only for a guest checkout — drives the post-purchase
   *  "create an account" invitation and keeps the account links away from a
   *  page a guest can't load. */
  guestSignup?: GuestSignup
}

/** Builds the prefilled sign-up URL for a guest who just ordered. */
function guestSignupHref({ first, last, email }: GuestSignup): string {
  const params = new URLSearchParams({ redirect_url: '/account' })
  if (email) params.set('email', email)
  if (first) params.set('first_name', first)
  if (last) params.set('last_name', last)
  return `/sign-up?${params.toString()}`
}

/**
 * Polls for the order the Stripe webhook creates asynchronously — payment
 * confirmation on the client can complete before the webhook has finished
 * creating the WooCommerce order, so this waits rather than assuming.
 */
export default function ConfirmationStatus({
  paymentIntentId,
  guestSignup,
}: ConfirmationStatusProps) {
  const t = useTranslation()

  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    let attempts = 0
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const poll = () => {
      fetch(`/api/orders/by-payment-intent?pi=${encodeURIComponent(paymentIntentId)}`)
        .then((res) => res.json())
        .then((data: { found: boolean; order?: OrderSummary }) => {
          if (cancelled) return
          if (data.found && data.order) {
            setOrder(data.order)
            return
          }
          attempts += 1
          if (attempts >= MAX_ATTEMPTS) {
            setGaveUp(true)
            return
          }
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS)
        })
        .catch(() => {
          attempts += 1
          if (cancelled) return
          if (attempts < MAX_ATTEMPTS) {
            timeoutId = setTimeout(poll, POLL_INTERVAL_MS)
          } else {
            setGaveUp(true)
          }
        })
    }

    poll()
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [paymentIntentId])

  const isGuest = Boolean(guestSignup)
  const primaryHref = isGuest ? '/shop' : '/account'
  const primaryLabel = isGuest ? 'CONTINUE SHOPPING' : 'VIEW YOUR ORDERS'

  if (order) {
    return (
      <>
        <h1 className="text-2xl text-white sm:text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
          {t("THANK YOU")}
        </h1>
        <p className="mt-3 text-sm text-[#999999]" style={{ fontFamily: MONO }}>
          {t('Order #{number} is confirmed.', { number: order.number })}{' '}
          {isGuest ? t("A confirmation email is on its way.") : ''}
        </p>

        {guestSignup && (
          <p className="mt-4 text-sm text-[#999999]" style={{ fontFamily: MONO }}>
            <Link href={guestSignupHref(guestSignup)} className="text-[#FFD700] hover:underline">
              {t("Create an account")}
            </Link>{' '}
            {t("to track this order and check out faster next time.")}
          </p>
        )}

        <Link
          href={primaryHref}
          className="btn-gold mt-6 inline-flex px-6 py-3 text-xs tracking-[0.1em] uppercase"
        >
          {t(primaryLabel)}
        </Link>
      </>
    )
  }

  if (gaveUp) {
    return (
      <>
        <h1 className="text-2xl text-white sm:text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
          {t("PAYMENT RECEIVED")}
        </h1>
        <p className="mt-3 text-sm text-[#999999]" style={{ fontFamily: MONO }}>
          {isGuest
            ? t("We are still finalizing your order — we will email your confirmation shortly.")
            : t("We are still finalizing your order — check your account in a moment, or we will email your confirmation shortly.")}
        </p>
        <Link
          href={primaryHref}
          className="btn-gold mt-6 inline-flex px-6 py-3 text-xs tracking-[0.1em] uppercase"
        >
          {isGuest ? t("CONTINUE SHOPPING") : t("GO TO YOUR ACCOUNT")}
        </Link>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl text-white sm:text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
        {t("PROCESSING YOUR ORDER…")}
      </h1>
      <p className="mt-3 text-sm text-[#999999]" style={{ fontFamily: MONO }}>
        {t("Just a moment.")}
      </p>
    </>
  )
}
