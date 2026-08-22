'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'
const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS = 8

interface OrderSummary {
  id: number
  number: string
}

/**
 * Polls for the order the Stripe webhook creates asynchronously — payment
 * confirmation on the client can complete before the webhook has finished
 * creating the WooCommerce order, so this waits rather than assuming.
 */
export default function ConfirmationStatus({ paymentIntentId }: { paymentIntentId: string }) {
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

  if (order) {
    return (
      <>
        <h1 className="text-2xl text-white sm:text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
          THANK YOU
        </h1>
        <p className="mt-3 text-sm text-[#999999]" style={{ fontFamily: MONO }}>
          Order #{order.number} is confirmed.
        </p>
        <Link href="/account" className="btn-gold mt-6 inline-flex px-6 py-3 text-xs tracking-[0.1em] uppercase">
          VIEW YOUR ORDERS
        </Link>
      </>
    )
  }

  if (gaveUp) {
    return (
      <>
        <h1 className="text-2xl text-white sm:text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
          PAYMENT RECEIVED
        </h1>
        <p className="mt-3 text-sm text-[#999999]" style={{ fontFamily: MONO }}>
          We&apos;re still finalizing your order — check your account in a moment, or we&apos;ll email your
          confirmation shortly.
        </p>
        <Link href="/account" className="btn-gold mt-6 inline-flex px-6 py-3 text-xs tracking-[0.1em] uppercase">
          GO TO YOUR ACCOUNT
        </Link>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl text-white sm:text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
        PROCESSING YOUR ORDER…
      </h1>
      <p className="mt-3 text-sm text-[#999999]" style={{ fontFamily: MONO }}>
        Just a moment.
      </p>
    </>
  )
}
