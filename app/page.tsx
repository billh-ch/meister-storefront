import Navbar from '@/components/navbar'
import HeroSection from '@/components/hero-section'
import ProductCarousel from '@/components/product-carousel'
import TestimonialsSection from '@/components/testimonials-section'
import Footer from '@/components/footer'
import CategoriesSection from '@/components/categories-section'
import { getProducts } from '@/lib/bigcommerce'
import { categoryDetails } from '@/lib/mock-data'

/**
 * Meister homepage — assembles all 8 sections in order.
 *
 * Products: fetched from BigCommerce (or mock data when NEXT_PUBLIC_USE_MOCK_DATA=true).
 * Category UI content (taglines, marquee, accordions): lives in mock-data.ts — it's
 * storefront design data, not backend data.
 */
export default async function HomePage() {
  const products = await getProducts()

  return (
    <main>
      <Navbar />
      <HeroSection />
      <ProductCarousel products={products} />
      <CategoriesSection categoryDetails={categoryDetails} products={products} />
      <TestimonialsSection />
      <Footer />
    </main>
  )
}
