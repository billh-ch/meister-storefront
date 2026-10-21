import { getLocale } from '@/lib/i18n/server'
import { translate } from '@/lib/i18n'
import type { Metadata } from 'next'
import { buildCollectionMetadata, categoryMetadata } from '@/lib/seo/metadata'
import { notFound } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import CollectionView from '@/components/collection/collection-view'
import { getProducts } from '@/lib/woocommerce'
import { findCategory } from '@/lib/categories'
import { paginateProducts, parseSort, parseFilters, deriveFacets } from '@/lib/collection'

interface CategoryPageProps {
  params: Promise<{ category: string }>
  searchParams: Promise<{
    page?: string
    sort?: string
    brand?: string
    minPrice?: string
    maxPrice?: string
    sale?: string
  }>
}

/**
 * Data stays covered by `getProducts()`'s own Data Cache (`revalidate: 60`
 * — see `lib/woocommerce/queries/get-products.ts`); reading `searchParams`
 * below already opts the HTML render out of static generation under Next's
 * own rules, so nothing extra needs configuring here. Same split as the PDP:
 * cached data, per-request render.
 */
export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params
  const category = findCategory(slug)
  if (!category) return { title: translate(await getLocale(), 'Not found — Meister'), alternates: { canonical: null }, robots: { index: false, follow: true } }
  const sp = await searchParams
  const products = await getProducts(await getLocale())
  const collection = paginateProducts(products.filter(product => product.category === slug), {
    page: sp.page, sort: sp.sort, filters: parseFilters(sp),
  })
  const copy = categoryMetadata[slug]
  return buildCollectionMetadata({
    locale: await getLocale(),
    title: copy?.title || `${category.name} — Meister`,
    description: copy?.description || `Browse ${category.name.toLowerCase()} at Meister.`,
    path: `/${slug}`, currentPage: collection.currentPage, searchParams: sp,
    noindex: products.some(product => !/^\d+$/.test(product.id)),
  })
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category: slug } = await params
  const category = findCategory(slug)

  // Stops the dynamic segment from swallowing every unmatched URL
  // (/cart, /privacy, a typo) as though it were a real category.
  if (!category) notFound()

  const sp = await searchParams
  const filters = parseFilters(sp)
  const allProducts = await getProducts(await getLocale())
  const categoryProducts = allProducts.filter((product) => product.category === category.slug)
  const facets = deriveFacets(categoryProducts, { includeCategories: false })
  const collection = paginateProducts(categoryProducts, {
    page: sp.page,
    sort: sp.sort,
    filters,
  })

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />
      <CollectionView
        title={category.name}
        breadcrumbs={[{ label: 'HOME', href: '/' }, { label: category.name }]}
        basePath={`/${category.slug}`}
        collection={collection}
        sort={parseSort(sp.sort)}
        facets={facets}
        activeFilters={filters}
      />
      <Footer />
    </main>
  )
}
