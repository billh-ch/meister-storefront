import { testimonials, type Testimonial } from '@/lib/mock-data'

/** Renders a row of filled gold stars for a given rating (1–5). */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} out of 5 stars`} role="img">
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
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
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
          &ldquo;{testimonial.quote}&rdquo;
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
          aria-label={`Read the verified review from ${testimonial.name} on Google`}
          title="Verified review. Opens the original on Google."
        >
          <VerifiedIcon />
          <span>Verified</span>
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
export default function TestimonialsSection() {
  return (
    <section
      className="w-full px-6 py-20 md:px-10"
      style={{ backgroundColor: '#1B1B18' }}
      aria-label="Customer testimonials"
    >
      {/* Heading */}
      <h2
        className="mb-12 text-center text-3xl text-white md:text-5xl"
        style={{ fontFamily: 'var(--font-dela-gothic), sans-serif', fontWeight: 800 }}
      >
        WHAT DIVERS SAY
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
