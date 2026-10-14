import { getTranslator } from '@/lib/i18n/server'
import { testimonials, type Testimonial } from '@/lib/mock-data'

/** Renders a row of filled gold stars for a given rating (1–5). */
async function StarRating({ rating }: { rating: number }) {
  const t = await getTranslator()

  return (
    <div className="flex gap-1" aria-label={t("{value0} out of 5 stars", { value0: rating })} role="img">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="text-lg"
          style={{ color: i < rating ? '#FFD700' : '#444444' }}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  )
}

/** Check-in-circle icon marking a review that links out to its verifiable source. */
function VerifiedIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  )
}

/** Single testimonial card */
async function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const t = await getTranslator()

  return (
    <article
      className="flex flex-col gap-4 border border-[#222222] p-6"
      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
    >
      <StarRating rating={testimonial.rating} />

      <blockquote>
        <p
          className="text-sm italic leading-relaxed text-[#cccccc]"
          style={{ fontFamily: 'var(--font-space-mono), monospace' }}
        >
          &ldquo;{t(testimonial.quote)}&rdquo;
        </p>
      </blockquote>

      <footer className="flex items-center justify-between gap-3">
        <cite
          className="not-italic text-base text-white"
          style={{ fontFamily: 'var(--font-dela-gothic), sans-serif', fontWeight: 700 }}
        >
          {testimonial.name}
        </cite>

        <a
          href={testimonial.reviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[#cccccc] transition-colors hover:text-[#FFD700]"
          style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          aria-label={t("Read the verified review from {value0} on Google", { value0: testimonial.name })}
          title={t("Verified review. Opens the original on Google.")}
        >
          <VerifiedIcon />
          <span>{t("Verified")}</span>
        </a>
      </footer>
    </article>
  )
}

/**
 * Testimonials section:
 * - Anton heading
 * - 3-column grid on desktop, 1 column on mobile
 * - Gold star ratings, Anton customer name, Space Mono italic quote
 *
 * Server Component — pure rendering, no interactivity.
 */
export default async function TestimonialsSection() {
  const t = await getTranslator()

  return (
    <section
      className="w-full px-6 py-20 md:px-10"
      style={{ backgroundColor: '#1B1B18' }}
      aria-label={t("Customer testimonials")}
    >
      {/* Heading */}
      <h2
        className="mb-12 text-center text-3xl text-white md:text-5xl"
        style={{ fontFamily: 'var(--font-dela-gothic), sans-serif', fontWeight: 800 }}
      >
        {t("WHAT DIVERS SAY")}
      </h2>

      {/* Grid */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 md:grid-cols-3">
        {testimonials.map((t) => (
          <TestimonialCard key={t.id} testimonial={t} />
        ))}
      </div>
    </section>
  )
}
