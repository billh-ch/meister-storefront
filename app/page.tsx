import Navbar from '@/components/navbar'
import HeroSection from '@/components/hero-section'
import ProductCarousel from '@/components/product-carousel'
import TestimonialsSection from '@/components/testimonials-section'
import Footer from '@/components/footer'
import CategoriesSection from '@/components/categories-section'
import { getProducts } from '@/lib/woocommerce'
import { categoryDetails } from '@/lib/mock-data'

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
      <ProductCarousel products={products.slice(0, MOST_WANTED_LIMIT)} />
      <CategoriesSection categoryDetails={categoryDetails} products={products} />
      <TestimonialsSection />
      <Footer />
    </main>
  )
}
