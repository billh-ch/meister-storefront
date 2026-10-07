import type { Metadata } from 'next'
import { buildCollectionMetadata } from '@/lib/seo/metadata'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import CollectionView from '@/components/collection/collection-view'
import { getProducts } from '@/lib/woocommerce'
import { paginateProducts, parseSort, parseFilters, deriveFacets } from '@/lib/collection'

interface ShopPageProps {
  searchParams: Promise<{
    page?: string
    sort?: string
    brand?: string
    category?: string
    minPrice?: string
    maxPrice?: string
    sale?: string
  }>
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const sp = await searchParams
  const products = await getProducts()
  const collection = paginateProducts(products, { page: sp.page, sort: sp.sort, filters: parseFilters(sp) })
  return buildCollectionMetadata({
    title: 'Shop Diving & Spearfishing Equipment — Meister',
    description: 'Browse the Meister catalog of freediving and spearfishing equipment. Explore fins, wetsuits, spearguns, accessories and merchandise.',
    path: '/shop', currentPage: collection.currentPage, searchParams: sp,
    noindex: products.some(product => !/^\d+$/.test(product.id)),
  })
}

/**
 * As a static path segment, this wins Next's route resolution over the
 * `/[category]` dynamic segment for the literal `/shop` URL, so there is no
 * runtime ambiguity between the two despite both living at the app root.
 */
export default async function ShopPage({ searchParams }: ShopPageProps) {
  const sp = await searchParams
  const filters = parseFilters(sp)
  const allProducts = await getProducts()
  const facets = deriveFacets(allProducts, { includeCategories: true })
  const collection = paginateProducts(allProducts, {
    page: sp.page,
    sort: sp.sort,
    filters,
  })

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />
      <CollectionView
        title="SHOP"
        breadcrumbs={[{ label: 'HOME', href: '/' }, { label: 'SHOP' }]}
        basePath="/shop"
        collection={collection}
        sort={parseSort(sp.sort)}
        facets={facets}
        activeFilters={filters}
      />
      <Footer />
    </main>
  )
}
