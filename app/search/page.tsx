import type { Metadata } from 'next'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import CollectionView from '@/components/collection/collection-view'
import { getProducts } from '@/lib/woocommerce'
import { paginateProducts, parseSort } from '@/lib/collection'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams
  const query = q?.trim()

  return {
    title: query ? `Search: "${query}" — Meister` : 'Search — Meister',
    description: 'Search Meister’s diving equipment catalogue.',
  }
}

/**
 * Static path segment, same as `/shop` — wins Next's route resolution over
 * `/[category]` for the literal `/search` URL.
 *
 * `getProducts()` uses the WooCommerce consumer key/secret server-side, so
 * results can only come from a server render, not a live-as-you-type client
 * fetch. Matching is name-only, case-insensitive substring — same
 * simplicity as the rest of the collection pages, no fuzzy matching.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page, sort } = await searchParams
  const query = q?.trim() ?? ''

  if (!query) {
    return (
      <main style={{ backgroundColor: '#1B1B18' }}>
        <Navbar />
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-20 text-center">
          <h1
            className="text-2xl text-white sm:text-3xl"
            style={{ fontFamily: DISPLAY, fontWeight: 800 }}
          >
            SEARCH
          </h1>
          <p className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
            Type something in the search bar to find products.
          </p>
        </div>
        <Footer />
      </main>
    )
  }

  const allProducts = await getProducts()
  const matches = allProducts.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase()),
  )
  const collection = paginateProducts(matches, { page, sort })

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />
      <CollectionView
        title={`RESULTS FOR "${query}"`}
        breadcrumbs={[{ label: 'HOME', href: '/' }, { label: 'SEARCH' }]}
        basePath="/search"
        collection={collection}
        sort={parseSort(sort)}
        emptyMessage="NO PRODUCTS MATCH YOUR SEARCH"
        searchQuery={query}
      />
      <Footer />
    </main>
  )
}
