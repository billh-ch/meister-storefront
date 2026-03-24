import Link from 'next/link'

/** Ticker text repeated for seamless loop — doubled so the second half always fills the viewport */
const TICKER_CONTENT = 'MEISTER MERCH • MEISTER MERCH • MEISTER MERCH • MEISTER MERCH • '

/**
 * Merch section:
 * - Dark background with subtle overlay
 * - Gold border accent
 * - CSS marquee ticker scrolling "MEISTER MERCH •"
 * - Gold "VIEW ALL" CTA button
 *
 * Server Component — animation via CSS only, no JS required.
 */
export default function MerchSection() {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: '#111111',
        borderTop: '1px solid #FFD700',
        borderBottom: '1px solid #FFD700',
      }}
      aria-label="Meister merchandise"
    >
      {/* Background texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFD700' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />

      {/* Inner content */}
      <div className="relative z-10 flex flex-col items-center gap-10 px-6 py-20">
        {/* Heading */}
        <h2
          className="text-center text-4xl text-white md:text-6xl"
          style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
        >
          MEISTER
          <br />
          <span className="text-[#FFD700]">MERCH</span>
        </h2>

        {/* Marquee ticker */}
        <div
          className="w-full overflow-hidden border-y border-[#333333] py-3"
          aria-hidden="true"
        >
          {/* The ticker string is doubled inside .animate-marquee so it seamlessly loops */}
          <div className="animate-marquee whitespace-nowrap">
            <span
              className="pr-8 text-sm font-bold tracking-[0.2em] text-[#FFD700]"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              {TICKER_CONTENT}{TICKER_CONTENT}
            </span>
          </div>
        </div>

        {/* Sub-copy */}
        <p
          className="max-w-md text-center text-sm text-[#999999]"
          style={{ fontFamily: 'var(--font-space-mono), monospace' }}
        >
          Represent Meister on every dive. Quality apparel and accessories for the serious underwater athlete.
        </p>

        {/* VIEW ALL CTA */}
        <Link
          href="/merch"
          className="btn-gold inline-block px-12 py-4 text-sm tracking-[0.15em] uppercase"
          aria-label="View all Meister merchandise"
        >
          VIEW ALL
        </Link>
      </div>
    </section>
  )
}
