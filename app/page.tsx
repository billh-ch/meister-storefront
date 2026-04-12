import Navbar from '@/components/navbar'
import HeroSection from '@/components/hero-section'
import ProductCarousel from '@/components/product-carousel'
import TestimonialsSection from '@/components/testimonials-section'
import Footer from '@/components/footer'
import CategoriesSection from '@/components/categories-section'
import { getProducts, getCategoryDetails } from '@/lib/bigcommerce'

/**
 * Meister homepage — assembles all 8 sections in order.
 *
 * Server Component: fetches products and category details from BigCommerce
 * (or mock data when NEXT_PUBLIC_USE_MOCK_DATA=true).
 */
export default async function HomePage() {
  const [products, categoryDetails] = await Promise.all([
    getProducts(),
    getCategoryDetails(),
  ])

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
