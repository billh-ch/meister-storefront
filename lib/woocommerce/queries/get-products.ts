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
 * return value said so. Pages after the first are fetched sequentially
 * because the total isn't known until the first response comes back.
 */
export async function fetchProducts(): Promise<WcProduct[]> {
  const first = await fetchPage(1)
  const totalPages = Math.min(first.totalPages, MAX_PAGES)

  if (totalPages <= 1) return first.data

  const rest: WcProduct[][] = []
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchPage(page)
    rest.push(next.data)
  }

  return [...first.data, ...rest.flat()]
}

function fetchPage(page: number) {
  return wcFetchWithMeta<WcProduct[]>(
    '/products',
    { per_page: String(PER_PAGE), page: String(page), status: 'publish' },
    { revalidate: 60, tags: ['products'] },
  )
}
