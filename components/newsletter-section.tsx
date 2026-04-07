'use client'

import { useState } from 'react'

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

/** Simple email validation — rejects obviously malformed addresses */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Newsletter subscription section.
 * - Dark background
 * - Controlled email input with validation
 * - Gold SUBSCRIBE button
 * - Accessible error/success feedback
 *
 * "use client" required for form state and validation.
 */
export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setValidationError(null)

    // Validate before submission
    if (!email.trim()) {
      setValidationError('Please enter your email address.')
      return
    }

    if (!isValidEmail(email)) {
      setValidationError('Please enter a valid email address.')
      return
    }

    setSubmitState('loading')

    try {
      /**
       * TODO: Replace with real BigCommerce newsletter subscription endpoint.
       * For now, simulate network latency.
       */
      await new Promise<void>((resolve) => setTimeout(resolve, 800))
      setSubmitState('success')
      setEmail('')
    } catch {
      setSubmitState('error')
    }
  }

  return (
    <section
      className="w-full px-6 py-20 md:px-10"
      style={{ backgroundColor: '#111111' }}
      aria-label="Newsletter subscription"
    >
      <div className="mx-auto flex max-w-[600px] flex-col items-center gap-8 text-center">
        {/* Heading */}
        <h2
          className="text-3xl text-white md:text-4xl"
          style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
        >
          JOIN THE MEISTER COMMUNITY
        </h2>

        {/* Sub-copy */}
        <p
          className="text-sm text-[#999999]"
          style={{ fontFamily: 'var(--font-space-mono), monospace' }}
        >
          Get exclusive deals, dive tips, and first access to new equipment drops.
        </p>

        {/* Success state */}
        {submitState === 'success' ? (
          <div
            className="w-full border border-[#FFD700] p-4 text-sm text-[#FFD700]"
            role="status"
            aria-live="polite"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            You&apos;re in! Welcome to the Meister community.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-3 sm:flex-row"
            noValidate
            aria-label="Subscribe to newsletter"
          >
            <div className="flex-1">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (validationError) setValidationError(null)
                  if (submitState === 'error') setSubmitState('idle')
                }}
                placeholder="your@email.com"
                className="w-full bg-[#1B1B18] px-4 py-4 text-sm text-white placeholder-[#555555] outline-none transition-colors focus:border-[#FFD700]"
                style={{
                  border: '1px solid #333333',
                  fontFamily: 'var(--font-space-mono), monospace',
                }}
                aria-describedby={
                  validationError ? 'newsletter-error' : undefined
                }
                aria-invalid={!!validationError}
                disabled={submitState === 'loading'}
              />
            </div>

            <button
              type="submit"
              className="btn-gold px-8 py-4 text-sm tracking-[0.1em] uppercase disabled:opacity-50"
              disabled={submitState === 'loading'}
              aria-label="Subscribe to Meister newsletter"
            >
              {submitState === 'loading' ? 'SENDING...' : 'SUBSCRIBE'}
            </button>
          </form>
        )}

        {/* Validation error */}
        {validationError && (
          <p
            id="newsletter-error"
            className="text-xs text-red-400"
            role="alert"
            aria-live="assertive"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            {validationError}
          </p>
        )}

        {/* Server error */}
        {submitState === 'error' && (
          <p
            className="text-xs text-red-400"
            role="alert"
            aria-live="assertive"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            Something went wrong. Please try again.
          </p>
        )}

        {/* Privacy note */}
        <p
          className="text-xs text-[#555555]"
          style={{ fontFamily: 'var(--font-space-mono), monospace' }}
        >
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </section>
  )
}
