import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/metadata'
import Navbar from '@/components/navbar'
import HeroSection from '@/components/hero-section'
import ProductCarousel from '@/components/product-carousel'
import TestimonialsSection from '@/components/testimonials-section'
import FaqSection from '@/components/faq-section'
import Footer from '@/components/footer'
import CategoriesSection from '@/components/categories-section'
import { getProducts } from '@/lib/woocommerce'
import Link from 'next/link'
import { HOME_PARAGRAPHS, showcaseProducts, buildHomepageIdentity } from '@/lib/agents/content'
import { serializeStructuredData } from '@/lib/seo/structured-data'
import { categoryDetails } from '@/lib/mock-data'

export async function generateMetadata(): Promise<Metadata> {
  const products = await getProducts()
  return buildPageMetadata({
    title: 'Meister — Freediving & Spearfishing Equipment',
    description: 'Explore freediving and spearfishing equipment at Meister: fins, wetsuits, spearguns and diving accessories. Browse product specifications and available options.',
    path: '/',
    noindex: products.some(product => !/^\d+$/.test(product.id)),
  })
}

/**
 * Meister homepage — assembles all 8 sections in order.
 *
 * Products: fetched from WooCommerce (or mock data when NEXT_PUBLIC_USE_MOCK_DATA=true).
 * Category UI content (taglines, marquee, accordions): lives in mock-data.ts — it's
 * storefront design data, not backend data.
 */
/**
 * The "MOST WANTED" rail renders every product it is handed. Now that the
 * catalogue fetch is no longer capped at 50, that would be ~90 slides in one
 * carousel — so the rail takes a slice while CategoriesSection keeps the full
 * array, since its four tabs need to filter across everything.
 */
const MOST_WANTED_LIMIT = 12

export default async function HomePage() {
  const products = await getProducts()

  return (
    <main>
      <Navbar />
      <HeroSection />
      <section className="mx-auto max-w-5xl px-6 py-12 text-white md:px-10" aria-label="About Meister equipment">
        <h2 className="mb-6 text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}>Meister freediving and spearfishing equipment</h2>
        {HOME_PARAGRAPHS.map(paragraph => <p key={paragraph} className="mb-4 text-sm leading-7" style={{ fontFamily: 'var(--font-space-mono), monospace' }}>{paragraph}</p>)}
        <div className="flex flex-wrap gap-5 text-sm underline"><Link href="/about">About Meister</Link><Link href="/docs">Agent and developer documentation</Link></div>
      </section>
      <ProductCarousel products={products.slice(0, MOST_WANTED_LIMIT)} />
      <CategoriesSection categoryDetails={categoryDetails} products={showcaseProducts(products, categoryDetails.map(category => category.slug))} />
      <TestimonialsSection />
      <FaqSection />
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(buildHomepageIdentity()) }} />
    </main>
  )
}
