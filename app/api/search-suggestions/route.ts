import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/woocommerce'

const MAX_RESULTS = 2
const MIN_QUERY_LENGTH = 2

export interface SearchSuggestion {
  id: string
  name: string
  slug: string
  image: string
  price: number
  priceFrom: boolean
}

/**
 * Powers the navbar's live-typing preview. Only returns the public fields a
 * thumbnail needs — never anything WooCommerce-internal. `getProducts()` is
 * the same cached call every collection page already uses, so this route
 * doesn't add a second data source, just a client-reachable entry point to
 * the one that already exists (it can't be called from the browser directly
 * since it uses the WooCommerce consumer key/secret server-side).
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? ''

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] })
  }

  const products = await getProducts()

  const matches = products
    .filter((product) => product.name.toLowerCase().includes(query))
    // Prefix matches ("Meister..." for query "meis") rank above a query
    // that only appears mid-name — a simple, honest "best match", not
    // real fuzzy scoring.
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1
      const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1
      return aStarts - bStarts
    })
    .slice(0, MAX_RESULTS)

  const results: SearchSuggestion[] = matches.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    image: product.image,
    price: product.price,
    priceFrom: product.priceFrom,
  }))

  return NextResponse.json({ results })
}
