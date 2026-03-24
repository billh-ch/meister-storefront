import Link from 'next/link'

const QUICK_LINKS = [
  { label: 'Fins', href: '/fins' },
  { label: 'Spearguns', href: '/guns' },
  { label: 'Accessories', href: '/accessories' },
  { label: 'Merch', href: '/merch' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const

const YEAR = new Date().getFullYear()

/**
 * 4-column dark footer:
 * 1. Brand info + wordmark
 * 2. Quick links
 * 3. Contact information (Athens, Greece)
 * 4. Google Maps embed — Meister Dive location
 *
 * Server Component — static markup, no client state.
 */
export default function Footer() {
  return (
    <footer
      className="w-full"
      style={{ backgroundColor: '#111111', borderTop: '1px solid #222222' }}
    >
      {/* Main grid */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 py-16 md:grid-cols-2 lg:grid-cols-4">
        {/* Column 1 — Brand */}
        <div className="flex flex-col gap-5">
          <span
            className="text-3xl text-[#FFD700]"
            style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
          >
            MEISTER
          </span>
          <p
            className="text-sm leading-relaxed text-[#888888]"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            Premium diving equipment for freediving and spearfishing enthusiasts.
            Serving Athens and Greece since 2010.
          </p>
          {/* Social links */}
          <div className="flex gap-4 pt-2">
            <a
              href="https://instagram.com"
              aria-label="Meister on Instagram"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#666666] transition-colors hover:text-[#FFD700]"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://facebook.com"
              aria-label="Meister on Facebook"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#666666] transition-colors hover:text-[#FFD700]"
            >
              <FacebookIcon />
            </a>
          </div>
        </div>

        {/* Column 2 — Quick Links */}
        <div className="flex flex-col gap-4">
          <h3
            className="text-sm font-bold tracking-[0.2em] text-white"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            QUICK LINKS
          </h3>
          <nav aria-label="Footer navigation">
            <ul className="flex flex-col gap-2" role="list">
              {QUICK_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-[#888888] transition-colors hover:text-[#FFD700]"
                    style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Column 3 — Contact */}
        <div className="flex flex-col gap-4">
          <h3
            className="text-sm font-bold tracking-[0.2em] text-white"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            CONTACT
          </h3>
          <address
            className="not-italic"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            <div className="flex flex-col gap-3 text-sm text-[#888888]">
              <p>
                Meister &amp; Meister Dive<br />
                Athens, Greece
              </p>
              <a
                href="tel:+302101234567"
                className="transition-colors hover:text-[#FFD700]"
              >
                +30 210 123 4567
              </a>
              <a
                href="mailto:info@meisterdive.gr"
                className="transition-colors hover:text-[#FFD700]"
              >
                info@meisterdive.gr
              </a>
              <p className="text-xs text-[#555555]">
                Mon–Fri: 10:00 – 19:00<br />
                Sat: 10:00 – 15:00
              </p>
            </div>
          </address>
        </div>

        {/* Column 4 — Google Maps embed (Athens, Greece) */}
        <div className="flex flex-col gap-4">
          <h3
            className="text-sm font-bold tracking-[0.2em] text-white"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            FIND US
          </h3>
          <div className="overflow-hidden" style={{ border: '1px solid #333333' }}>
            <iframe
              title="Meister Dive store location — Athens, Greece"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25106.25897975744!2d23.72136!3d37.97945!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14a1bd1f067043f1%3A0x2736354576668ddd!2sAthens%2C%20Greece!5e0!3m2!1sen!2sus!4v1710000000000!5m2!1sen!2sus"
              width="100%"
              height="180"
              style={{ border: 0, filter: 'grayscale(1) brightness(0.7)' }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div
        className="border-t border-[#222222] px-6 py-5"
      >
        <p
          className="text-center text-xs text-[#555555]"
          style={{ fontFamily: 'var(--font-space-mono), monospace' }}
        >
          &copy; {YEAR} Meister &amp; Meister Dive. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}
