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

      <footer>
        <cite
          className="not-italic text-base text-white"
          style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
        >
          {testimonial.name}
        </cite>
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
        style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
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
