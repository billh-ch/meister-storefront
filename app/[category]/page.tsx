import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import CollectionView from '@/components/collection/collection-view'
import { getProducts } from '@/lib/woocommerce'
import { findCategory } from '@/lib/categories'
import { paginateProducts, parseSort } from '@/lib/collection'

interface CategoryPageProps {
  params: Promise<{ category: string }>
  searchParams: Promise<{ page?: string; sort?: string }>
}

/**
 * Data stays covered by `getProducts()`'s own Data Cache (`revalidate: 60`
 * — see `lib/woocommerce/queries/get-products.ts`); reading `searchParams`
 * below already opts the HTML render out of static generation under Next's
 * own rules, so nothing extra needs configuring here. Same split as the PDP:
 * cached data, per-request render.
 */
export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params
  const category = findCategory(slug)

  if (!category) return { title: 'Not found — Meister' }

  return {
    title: `${category.name} — Meister`,
    description: `Shop ${category.name.toLowerCase()} at Meister — diving equipment, Athens.`,
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category: slug } = await params
  const category = findCategory(slug)

  // Stops the dynamic segment from swallowing every unmatched URL
  // (/cart, /privacy, a typo) as though it were a real category.
  if (!category) notFound()

  const { page, sort } = await searchParams
  const allProducts = await getProducts()
  const categoryProducts = allProducts.filter((product) => product.category === category.slug)
  const collection = paginateProducts(categoryProducts, { page, sort })

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />
      <CollectionView
        title={category.name}
        breadcrumbs={[{ label: 'HOME', href: '/' }, { label: category.name }]}
        basePath={`/${category.slug}`}
        collection={collection}
        sort={parseSort(sort)}
      />
      <Footer />
    </main>
  )
}
