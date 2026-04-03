import Navbar from '@/components/navbar'
import HeroSection from '@/components/hero-section'
import ProductCarousel from '@/components/product-carousel'
import TestimonialsSection from '@/components/testimonials-section'
import NewsletterSection from '@/components/newsletter-section'
import Footer from '@/components/footer'
import CategoriesSection from '@/components/categories-section'
import { products, categoryDetails } from '@/lib/mock-data'

/**
 * Meister homepage — assembles all 8 sections in order.
 *
 * Server Component: data co-located here (currently mock data).
 * When BigCommerce Catalyst is connected, replace `products` import with
 * a Catalyst GraphQL fetch and wrap ProductCarousel in <Suspense>.
 */
export default function HomePage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <ProductCarousel products={products} />
      <CategoriesSection categoryDetails={categoryDetails} products={products} />
      <TestimonialsSection />
      <NewsletterSection />
      <Footer />
    </main>
  )
}
