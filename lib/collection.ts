import type { Product } from '@/lib/mock-data'

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest'

const SORT_OPTIONS: readonly SortOption[] = ['featured', 'price-asc', 'price-desc', 'newest']

export interface SortInfo {
  value: SortOption
  label: string
}

export const SORT_CHOICES: readonly SortInfo[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
]

export const PAGE_SIZE = 24

export interface CollectionParams {
  page?: string
  sort?: string
}

export interface Collection {
  items: Product[]
  currentPage: number
  totalPages: number
  totalItems: number
}

/** Exported so callers can resolve the active sort for UI state without
 * re-deriving `paginateProducts`'s own parsing logic. */
export function parseSort(raw: string | undefined): SortOption {
  return SORT_OPTIONS.includes(raw as SortOption) ? (raw as SortOption) : 'featured'
}

function sortProducts(products: readonly Product[], sort: SortOption): Product[] {
  if (sort === 'price-asc') return [...products].sort((a, b) => a.price - b.price)
  if (sort === 'price-desc') return [...products].sort((a, b) => b.price - a.price)
  // 'newest': the array already arrives in WooCommerce's own fetch order
  // (date desc) — nothing to do.
  if (sort === 'newest') return [...products]

  // 'featured': there's no `featured` flag on `Product` today, so this
  // promotes on-sale items — the ones a shopper most benefits from seeing
  // first — ahead of the rest, which keep their original fetch order.
  const onSale = products.filter((product) => product.onSale)
  const rest = products.filter((product) => !product.onSale)
  return [...onSale, ...rest]
}

/**
 * Filters, sorts, and pages an already-fetched product list.
 *
 * Takes the full catalogue rather than issuing a second WooCommerce query:
 * `getProducts()` already fetches and caches all ~90 products for the
 * homepage, and that's small enough that filtering in memory here is
 * effectively free — one cached fetch instead of a parallel query path.
 *
 * An out-of-range `page` clamps to the nearest valid page rather than
 * erroring, so a stale bookmark or a shrinking catalogue doesn't 404 or
 * render an empty page a shopper didn't ask for.
 */
export function paginateProducts(
  products: readonly Product[],
  params: CollectionParams,
): Collection {
  const sorted = sortProducts(products, parseSort(params.sort))
  const totalItems = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))

  const requestedPage = Number.parseInt(params.page ?? '1', 10)
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(1, requestedPage), totalPages)
    : 1

  const start = (currentPage - 1) * PAGE_SIZE
  return {
    items: sorted.slice(start, start + PAGE_SIZE),
    currentPage,
    totalPages,
    totalItems,
  }
}
