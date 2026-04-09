'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

const BORING_STUFF = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Returns Policy', href: '/returns' },
  { label: 'Contact', href: '/contact' },
  { label: 'About', href: '/about' },
  { label: 'Terms & Conditions', href: '/terms' },
] as const

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'TikTok', href: 'https://tiktok.com' },
  { label: 'YouTube', href: 'https://youtube.com' },
  { label: 'Facebook', href: 'https://facebook.com' },
] as const

const MARQUEE_TEXT = 'PREMIUM EQUIPMENT FOR PREMIUM DIVES'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setValidationError(null)

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
      await new Promise<void>((resolve) => setTimeout(resolve, 800))
      setSubmitState('success')
      setEmail('')
    } catch {
      setSubmitState('error')
    }
  }

  const marqueeContent = Array.from({ length: 8 }, (_, i) => (
    <span
      key={i}
      className="mx-8 flex h-full items-center whitespace-nowrap tracking-[-0.02em] text-white"
      style={{ fontFamily: 'var(--font-dela-gothic), sans-serif', fontSize: '200px', lineHeight: '200px', fontWeight: 800 }}
    >
      {MARQUEE_TEXT}
    </span>
  ))

  return (
    <footer
      className="relative w-full"
      style={{
        backgroundImage: 'url(/images/footer-section-image.JPG)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      />

      {/* Content wrapper */}
      <div className="relative z-10 flex w-full flex-col">
        {/* ── Row 1: Marquee ── */}
        <div
          className="flex w-full items-center overflow-hidden"
          style={{ height: '200px', marginTop: '40px' }}
        >
          <div className="animate-marquee flex" style={{ animationDuration: '300s', height: '200px' }}>
            {marqueeContent}
            {marqueeContent}
          </div>
        </div>

        {/* ── Row 2: Logo + Newsletter ── */}
        <div
          className="flex w-full"
          style={{ height: '100px' }}
        >
          {/* Logo — 20% */}
          <div
            className="flex items-center justify-center"
            style={{
              width: '20%',
              border: '1px solid #ffffff',
            }}
          >
            <Image
              src="/meister-logo.svg"
              alt="Meister"
              width={120}
              height={35}
              style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(15deg)' }}
            />
          </div>

          {/* Newsletter — 80% */}
          <div
            className="flex items-center gap-4 px-6 md:gap-6 md:px-10"
            style={{
              width: '80%',
              border: '1px solid #ffffff',
              borderLeft: 'none',
            }}
          >
            <p
              className="hidden shrink-0 text-xs tracking-[0.05em] text-white md:block md:text-sm"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              SIGN UP TO OUR NEWSLETTER TO RECEIVE LATEST UPDATES
            </p>

            {submitState === 'success' ? (
              <span
                className="text-xs text-[#FFD700]"
                role="status"
                style={{ fontFamily: 'var(--font-space-mono), monospace' }}
              >
                You&apos;re in! Welcome to Meister.
              </span>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-1 items-center gap-2"
                noValidate
              >
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (validationError) setValidationError(null)
                    if (submitState === 'error') setSubmitState('idle')
                  }}
                  placeholder="your@email.com"
                  className="w-full min-w-0 bg-transparent px-3 py-2 text-xs text-white placeholder-[#666666] outline-none md:text-sm"
                  style={{
                    border: '1px solid #444444',
                    fontFamily: 'var(--font-space-mono), monospace',
                  }}
                  aria-describedby={
                    validationError ? 'footer-email-error' : undefined
                  }
                  aria-invalid={!!validationError}
                  disabled={submitState === 'loading'}
                />
                <button
                  type="submit"
                  className="btn-gold shrink-0 px-5 py-2 text-xs tracking-[0.1em] uppercase disabled:opacity-50 md:text-sm"
                  disabled={submitState === 'loading'}
                >
                  {submitState === 'loading' ? 'SENDING...' : 'SUBMIT'}
                </button>
              </form>
            )}

            {validationError && (
              <p
                id="footer-email-error"
                className="text-xs text-red-400"
                role="alert"
                style={{ fontFamily: 'var(--font-space-mono), monospace' }}
              >
                {validationError}
              </p>
            )}
          </div>
        </div>

        {/* ── Row 3: Links grid ── */}
        <div className="grid w-full grid-cols-1 gap-10 px-6 py-14 md:grid-cols-4 md:px-10 lg:px-16">
          {/* Column 1 — Boring Stuff */}
          <div className="flex flex-col items-center gap-4 text-center">
            <h3
              className="text-base font-bold tracking-[0.1em] text-white underline"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              Boring Stuff
            </h3>
            <ul className="flex flex-col items-center gap-2" role="list">
              {BORING_STUFF.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-base text-[#999999] transition-colors hover:text-[#FFD700]"
                    style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2 — Links */}
          <div className="flex flex-col items-center gap-4 text-center">
            <h3
              className="text-base font-bold tracking-[0.1em] text-white underline"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              Links
            </h3>
            <ul className="flex flex-col items-center gap-2" role="list">
              {SOCIAL_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-[#999999] transition-colors hover:text-[#FFD700]"
                    style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Location */}
          <div className="flex flex-col items-center gap-4 text-center">
            <h3
              className="text-base font-bold tracking-[0.1em] text-white underline"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              Location
            </h3>
            <address
              className="flex flex-col items-center gap-2 text-base not-italic text-[#999999]"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              <p>Leoforos Athinon 387, Aigaleo</p>
              <a
                href="mailto:info@meister.gr"
                className="transition-colors hover:text-[#FFD700]"
              >
                info@meister.gr
              </a>
            </address>
          </div>

          {/* Column 4 — Google Maps */}
          <div className="flex flex-col items-center gap-0">
            <div className="overflow-hidden" style={{ width: '280px', height: '230px' }}>
              <iframe
                title="Meister Dive store location — Aigaleo, Athens"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3145.5!2d23.6822!3d37.9927!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14a1bb8c4f6f0001%3A0x0!2sLeoforos%20Athinon%20387%2C%20Aigaleo!5e0!3m2!1sen!2sgr!4v1710000000000!5m2!1sen!2sgr"
                width="280"
                height="230"
                style={{ border: 0, filter: 'grayscale(0.8) brightness(0.8)' }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        {/* ── Row 4: Copyright ── */}
        <div
          className="w-full px-6 py-5"
          style={{ borderTop: '1px solid #ffffff' }}
        >
          <p
            className="text-center text-xs text-[#999999]"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            &copy;Meister &amp; Meister Dive 2025 | All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
