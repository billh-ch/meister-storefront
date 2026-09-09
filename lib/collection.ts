import type { Product } from '@/lib/mock-data'
import { allCategories, findCategory } from '@/lib/categories'

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

/**
 * A parsed, validated set of listing filters. All fields are "no constraint"
 * in their empty form (`[]` / `null` / `false`), so an all-empty value means
 * "show everything".
 */
export interface FilterParams {
  brands: string[]
  categories: string[]
  minPrice: number | null
  maxPrice: number | null
  onSale: boolean
}

export const EMPTY_FILTERS: FilterParams = {
  brands: [],
  categories: [],
  minPrice: null,
  maxPrice: null,
  onSale: false,
}

/** The facet values actually present in a given product set, for the UI to offer. */
export interface FacetData {
  brands: { value: string; count: number }[]
  categories: { value: string; label: string; count: number }[]
  priceBounds: { min: number; max: number }
}

type RawSearchParams = Record<string, string | string[] | undefined>

const VALID_CATEGORY_SLUGS = new Set(allCategories.map((category) => category.slug))

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function splitList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function parsePriceParam(value: string | undefined): number | null {
  if (value == null || value === '') return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/**
 * Turns raw `searchParams` into a `FilterParams`. `brand` and `category` are
 * comma-separated lists; `category` values not in the real registry are
 * dropped so a hand-edited URL can't smuggle in a bogus facet.
 */
export function parseFilters(raw: RawSearchParams): FilterParams {
  return {
    brands: splitList(firstValue(raw.brand)),
    categories: splitList(firstValue(raw.category)).filter((slug) =>
      VALID_CATEGORY_SLUGS.has(slug),
    ),
    minPrice: parsePriceParam(firstValue(raw.minPrice)),
    maxPrice: parsePriceParam(firstValue(raw.maxPrice)),
    onSale: firstValue(raw.sale) === '1' || firstValue(raw.sale) === 'true',
  }
}

/**
 * The single place filter param *names* are written. Shared by the filter
 * panel, the active-filter chips, and pagination so the query string they
 * each build can never drift apart.
 */
export function filtersToSearchParams(filters: FilterParams): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.brands.length > 0) params.set('brand', filters.brands.join(','))
  if (filters.categories.length > 0) params.set('category', filters.categories.join(','))
  if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice))
  if (filters.onSale) params.set('sale', '1')
  return params
}

export function hasActiveFilters(filters: FilterParams): boolean {
  return (
    filters.brands.length > 0 ||
    filters.categories.length > 0 ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.onSale
  )
}

/**
 * Reads the facet values present in an *unfiltered* product set. Counts are
 * of that whole set, not of what survives the other active filters — fine at
 * this catalogue size, and it keeps every option visible rather than having
 * facets vanish as you narrow.
 */
export function deriveFacets(
  products: readonly Product[],
  opts: { includeCategories: boolean },
): FacetData {
  const brandCounts = new Map<string, number>()
  const categoryCounts = new Map<string, number>()
  let min = Number.POSITIVE_INFINITY
  let max = 0

  for (const product of products) {
    if (product.brand) {
      brandCounts.set(product.brand, (brandCounts.get(product.brand) ?? 0) + 1)
    }
    categoryCounts.set(product.category, (categoryCounts.get(product.category) ?? 0) + 1)
    if (product.price < min) min = product.price
    if (product.price > max) max = product.price
  }

  const brands = [...brandCounts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value))

  const categories = opts.includeCategories
    ? [...categoryCounts.entries()]
        .map(([value, count]) => ({
          value,
          label: findCategory(value)?.name ?? value.toUpperCase(),
          count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : []

  return {
    brands,
    categories,
    priceBounds: {
      min: Number.isFinite(min) ? Math.floor(min) : 0,
      max: max > 0 ? Math.ceil(max) : 0,
    },
  }
}

/** Pure predicate filter — an empty `FilterParams` returns the list unchanged. */
export function filterProducts(
  products: readonly Product[],
  filters: FilterParams,
): Product[] {
  return products.filter((product) => {
    if (filters.brands.length > 0) {
      if (!product.brand || !filters.brands.includes(product.brand)) return false
    }
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(product.category)
    ) {
      return false
    }
    if (filters.minPrice != null && product.price < filters.minPrice) return false
    if (filters.maxPrice != null && product.price > filters.maxPrice) return false
    if (filters.onSale && !product.onSale) return false
    return true
  })
}

export interface CollectionParams {
  page?: string
  sort?: string
  filters?: FilterParams
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
  const filtered = params.filters
    ? filterProducts(products, params.filters)
    : products
  const sorted = sortProducts(filtered, parseSort(params.sort))
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
