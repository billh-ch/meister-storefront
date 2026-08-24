import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import ConfirmationStatus from '@/components/checkout/confirmation-status'
import { getStripe } from '@/lib/stripe'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

export const metadata: Metadata = {
  title: 'Order Confirmation — Meister',
}

interface ConfirmationPageProps {
  searchParams: Promise<{ session_id?: string }>
}

/**
 * Never creates the order itself — that's the Stripe webhook's job
 * (`app/api/webhooks/stripe/route.ts`), the only place a client-reported
 * "success" is trusted. This page re-checks the Checkout Session's real
 * `payment_status` server-side rather than trusting anything client-side,
 * then waits for the webhook-created order to show up — matched by the
 * underlying PaymentIntent id, same as before the Checkout Sessions
 * migration (only how that id is obtained changed).
 */
export default async function ConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const { session_id: sessionId } = await searchParams

  let status: 'succeeded' | 'processing' | 'failed' | 'unknown' = 'unknown'
  let paymentIntentId: string | undefined

  if (sessionId) {
    try {
      const checkoutSession = await getStripe().checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      })
      paymentIntentId =
        typeof checkoutSession.payment_intent === 'string'
          ? checkoutSession.payment_intent
          : checkoutSession.payment_intent?.id

      if (checkoutSession.payment_status === 'paid' || checkoutSession.payment_status === 'no_payment_required') {
        status = 'succeeded'
      } else if (checkoutSession.status === 'open') {
        status = 'processing'
      } else if (checkoutSession.status === 'expired') {
        status = 'failed'
      }
    } catch {
      status = 'unknown'
    }
  }

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />

      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        {status === 'succeeded' && paymentIntentId ? (
          <ConfirmationStatus paymentIntentId={paymentIntentId} />
        ) : status === 'processing' ? (
          <>
            <h1 className="text-2xl text-white sm:text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
              PAYMENT PROCESSING
            </h1>
            <p className="mt-3 text-sm text-[#999999]" style={{ fontFamily: MONO }}>
              Your payment is still being processed — we&apos;ll email your order confirmation as soon as it clears.
            </p>
          </>
        ) : status === 'failed' ? (
          <>
            <h1 className="text-2xl text-white sm:text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
              PAYMENT FAILED
            </h1>
            <p className="mt-3 text-sm" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
              Your payment could not be completed. Please try again.
            </p>
            <Link href="/checkout" className="btn-gold mt-6 inline-flex px-6 py-3 text-xs tracking-[0.1em] uppercase">
              TRY AGAIN
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl text-white sm:text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
              SOMETHING WENT WRONG
            </h1>
            <p className="mt-3 text-sm text-[#999999]" style={{ fontFamily: MONO }}>
              We couldn&apos;t confirm your payment status. If you were charged, check your email or your account
              shortly.
            </p>
            <Link href="/account" className="btn-gold mt-6 inline-flex px-6 py-3 text-xs tracking-[0.1em] uppercase">
              GO TO YOUR ACCOUNT
            </Link>
          </>
        )}
      </div>

      <Footer />
    </main>
  )
}
