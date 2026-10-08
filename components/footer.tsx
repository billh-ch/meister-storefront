import Image from 'next/image'
import Link from 'next/link'
import { BUSINESS_CONTACT } from '@/lib/agents/content'

const CUSTOMER_CARE_LINKS = [
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
        <div className="flex w-full flex-col md:flex-row">
          {/* Stack the logo above the newsletter on narrow screens. */}
          <div
            className="flex min-w-0 items-center justify-center px-6 py-6 md:w-1/5"
            style={{
              border: '1px solid #ffffff',
            }}
          >
            <Image
              src="/meister-logo.svg"
              alt="Meister"
              width={170}
              height={40}
              className="h-auto max-w-full"
            />
          </div>

          {/* Newsletter keeps its intrinsic input/button widths contained. */}
          <div
            className="flex min-w-0 flex-1 flex-col items-center gap-4 px-6 py-6 lg:flex-row lg:gap-6 lg:px-10"
            style={{
              border: '1px solid #ffffff',
            }}
          >
            <p
              className="text-center text-xs tracking-[0.05em] text-white lg:max-w-xs lg:text-left"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              SIGN UP TO OUR NEWSLETTER TO RECEIVE LATEST UPDATES
            </p>

            <div className="flex w-full min-w-0 flex-1 items-center gap-2">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                placeholder="your@email.com"
                className="w-full min-w-0 cursor-not-allowed bg-transparent px-3 py-2 text-xs text-white placeholder-[#666666] outline-none md:text-sm"
                style={{
                  border: '1px solid #444444',
                  fontFamily: 'var(--font-space-mono), monospace',
                }}
                disabled
              />
              <button
                type="button"
                className="btn-gold shrink-0 px-5 py-2 text-xs tracking-[0.1em] uppercase disabled:opacity-50 md:text-sm"
                disabled
                aria-label="Newsletter signup coming soon"
              >
                COMING SOON
              </button>
            </div>

            <span
              className="hidden shrink-0 text-xs text-[#666666] sm:block"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              Not live yet
            </span>
          </div>
        </div>

        {/* ── Row 3: Links grid ── */}
        <div className="grid w-full grid-cols-1 gap-10 px-6 py-14 md:grid-cols-4 md:px-10 lg:px-16">
          {/* Column 1 — Customer Care */}
          <div className="flex flex-col items-center gap-4 text-center">
            <h3
              className="text-base font-bold tracking-[0.1em] text-white underline"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              Customer Care
            </h3>
            <ul className="flex flex-col items-center gap-2" role="list">
              {CUSTOMER_CARE_LINKS.map(({ label, href }) => (
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
              <p>{BUSINESS_CONTACT.streetAddress}, {BUSINESS_CONTACT.addressLocality} {BUSINESS_CONTACT.postalCode}</p>
              <a
                href={`mailto:${BUSINESS_CONTACT.email}`}
                className="transition-colors hover:text-[#FFD700]"
              >
                {BUSINESS_CONTACT.email}
              </a>
              <a href={`tel:${BUSINESS_CONTACT.telephone}`} className="transition-colors hover:text-[#FFD700]">{BUSINESS_CONTACT.displayTelephone}</a>
            </address>
          </div>

          {/* Column 4 — Google Maps */}
          <div className="flex flex-col items-center gap-0">
            <div className="w-full max-w-[280px] overflow-hidden" style={{ height: '230px' }}>
              <iframe
                title="Meister Dive store location — Aigaleo, Athens"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3145.5!2d23.6822!3d37.9927!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14a1bb8c4f6f0001%3A0x0!2sLeoforos%20Athinon%20387%2C%20Aigaleo!5e0!3m2!1sen!2sgr!4v1710000000000!5m2!1sen!2sgr"
                width="280"
                height="230"
                style={{ width: '100%', border: 0, filter: 'grayscale(0.8) brightness(0.8)' }}
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
