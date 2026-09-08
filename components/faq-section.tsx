import AccordionItem from '@/components/product/accordion-item'
import { homepageFaqs } from '@/lib/mock-data'

/**
 * Homepage FAQ. Reuses the PDP `AccordionItem` (shared `.accordion-content`
 * animation) and the `product-prose` text style, and matches the padding /
 * heading treatment of `TestimonialsSection` directly above it.
 *
 * Server Component: static content, no interactivity of its own.
 */
export default function FaqSection() {
  return (
    <section
      className="w-full px-6 py-20 md:px-10"
      style={{ backgroundColor: '#1B1B18' }}
      aria-label="Frequently asked questions"
    >
      <h2
        className="mb-12 text-center text-3xl text-white md:text-5xl"
        style={{ fontFamily: 'var(--font-dela-gothic), sans-serif', fontWeight: 800 }}
      >
        FREQUENTLY ASKED QUESTIONS
      </h2>

      <div className="mx-auto max-w-[820px]">
        {homepageFaqs.map((faq, index) => (
          <AccordionItem key={faq.q} title={faq.q} defaultOpen={index === 0}>
            <p className="product-prose">{faq.a}</p>
          </AccordionItem>
        ))}
      </div>
    </section>
  )
}
