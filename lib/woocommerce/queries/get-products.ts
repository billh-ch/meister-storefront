import { wcFetchWithMeta } from '../client'

export interface WcImage {
  id: number
  src: string
  alt?: string
}

export interface WcCategory {
  id: number
  name: string
  slug: string
}

export interface WcProduct {
  id: number
  name: string
  slug: string
  price: string
  regular_price: string
  sale_price: string
  on_sale: boolean
  stock_status: string
  /**
   * WooCommerce's own rendered price. The only field on the listing endpoint
   * that reveals whether a variable product spans a price *range* — the
   * numeric `price` is just the lowest variant. See `has-price-range.ts`.
   */
  price_html: string
  images: WcImage[]
  categories: WcCategory[]
  type: string
  status: string
}

/** WooCommerce rejects anything above 100. */
const PER_PAGE = 100

/**
 * Refuses to walk more than this many pages. A misconfigured store that keeps
 * reporting more pages can't turn one render into an unbounded request loop.
 */
const MAX_PAGES = 10

/**
 * Fetches the whole published catalogue, following pagination.
 *
 * The previous single request capped at 50 and dropped the rest silently —
 * with 90 published products, 40 never reached the UI and nothing in the
 * return value said so. Page 1 has to go first since the total isn't known
 * until it comes back, but pages after that are independent requests and
 * are fetched concurrently rather than one at a time.
 */
export async function fetchProducts(): Promise<WcProduct[]> {
  const first = await fetchPage(1)
  const totalPages = Math.min(first.totalPages, MAX_PAGES)

  if (totalPages <= 1) return first.data

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2)),
  )

  return [...first.data, ...rest.flatMap((page) => page.data)]
}

function fetchPage(page: number) {
  return wcFetchWithMeta<WcProduct[]>(
    '/products',
    { per_page: String(PER_PAGE), page: String(page), status: 'publish' },
    { revalidate: 60, tags: ['products'] },
  )
}
