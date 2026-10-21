import { getTranslator } from '@/lib/i18n/server'
/**
 * Newsletter subscription section — signup isn't live yet (no subscription
 * endpoint exists), so the form is visibly disabled rather than pretending
 * to accept an address. Purely presentational, no client state needed.
 */
export default async function NewsletterSection() {
  const t = await getTranslator()

  return (
    <section
      className="w-full px-6 py-20 md:px-10"
      style={{ backgroundColor: '#111111' }}
      aria-label={t("Newsletter subscription")}
    >
      <div className="mx-auto flex max-w-[600px] flex-col items-center gap-8 text-center">
        {/* Heading */}
        <h2
          className="text-3xl text-white md:text-4xl"
          style={{ fontFamily: 'var(--font-dela-gothic), sans-serif', fontWeight: 800 }}
        >
          {t("JOIN THE MEISTER COMMUNITY")}
        </h2>

        {/* Sub-copy */}
        <p
          className="text-sm text-[#999999]"
          style={{ fontFamily: 'var(--font-space-mono), monospace' }}
        >
          {t("Get exclusive deals, dive tips, and first access to new equipment drops.")}
        </p>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="newsletter-email" className="sr-only">
              {t("Email address")}
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder={t("your@email.com")}
              className="w-full cursor-not-allowed bg-[#1B1B18] px-4 py-4 text-sm text-white placeholder-[#555555] outline-none"
              style={{
                border: '1px solid #333333',
                fontFamily: 'var(--font-space-mono), monospace',
              }}
              disabled
            />
          </div>

          <button
            type="button"
            className="btn-gold px-8 py-4 text-sm tracking-[0.1em] uppercase disabled:opacity-50"
            disabled
            aria-label={t("Newsletter signup coming soon")}
          >
            {t("COMING SOON")}
          </button>
        </div>

        {/* Honest about not being live yet, replacing the old privacy note */}
        <p
          className="text-xs text-[#555555]"
          style={{ fontFamily: 'var(--font-space-mono), monospace' }}
        >
          {t("Newsletter signups aren't live yet — check back soon.")}
        </p>
      </div>
    </section>
  )
}
