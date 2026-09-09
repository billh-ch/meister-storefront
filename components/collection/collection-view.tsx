import ProductCard from '@/components/product-card'
import SimpleBreadcrumbs from './simple-breadcrumbs'
import SortSelect from './sort-select'
import PaginationControls from './pagination-controls'
import FilterPanel from './filter-panel'
import ActiveFilters from './active-filters'
import Link from 'next/link'
import {
  hasActiveFilters,
  type Collection,
  type FacetData,
  type FilterParams,
  type SortOption,
} from '@/lib/collection'

interface Crumb {
  label: string
  href?: string
}

interface CollectionViewProps {
  title: string
  breadcrumbs: Crumb[]
  basePath: string
  collection: Collection
  sort: SortOption
  facets: FacetData
  activeFilters: FilterParams
  /** Shown in the empty state instead of the category/shop default. */
  emptyMessage?: string
  /** Carried into pagination links so a search query survives paging. */
  searchQuery?: string
}

const MONO = 'var(--font-space-mono), monospace'

/**
 * Shared body for every product-listing page — `/[category]`, `/shop`, and
 * `/search`. Each differs only in which products it hands in and what the
 * breadcrumb trail says, so this owns everything else: heading, filter
 * sidebar, sort, grid, empty state, pagination.
 */
const DEFAULT_EMPTY_MESSAGE = 'NO PRODUCTS IN THIS CATEGORY YET'

export default function CollectionView({
  title,
  breadcrumbs,
  basePath,
  collection,
  sort,
  facets,
  activeFilters,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  searchQuery,
}: CollectionViewProps) {
  const { items, currentPage, totalPages, totalItems } = collection
  const filtersActive = hasActiveFilters(activeFilters)
  const resolvedEmptyMessage = filtersActive
    ? 'NO PRODUCTS MATCH THESE FILTERS'
    : emptyMessage
  const categoryLabels = Object.fromEntries(
    facets.categories.map((category) => [category.value, category.label]),
  )

  return (
    <div className="pb-16">
      <SimpleBreadcrumbs items={breadcrumbs} />

      <div className="mx-auto max-w-[1400px] px-2 sm:px-3 md:px-4">
        <div className="mb-6 sm:mb-8">
          <h1
            className="text-2xl text-white sm:text-3xl md:text-4xl"
            style={{ fontFamily: 'var(--font-dela-gothic), sans-serif', fontWeight: 800 }}
          >
            {title}
          </h1>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <aside className="lg:w-56 lg:shrink-0">
            <FilterPanel basePath={basePath} facets={facets} active={activeFilters} />
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-[#999999] sm:text-sm" style={{ fontFamily: MONO }}>
                {totalItems} {totalItems === 1 ? 'PRODUCT' : 'PRODUCTS'}
              </p>
              {totalItems > 0 && <SortSelect basePath={basePath} currentSort={sort} />}
            </div>

            <ActiveFilters
              basePath={basePath}
              active={activeFilters}
              categoryLabels={categoryLabels}
            />

            {items.length === 0 ? (
              <div
                className="hatching-bg flex flex-col items-center justify-center gap-3 py-24 text-center"
                style={{ border: '1px solid #444444' }}
              >
                <p className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
                  {resolvedEmptyMessage}
                </p>
                {filtersActive && (
                  <Link
                    href={basePath}
                    className="text-xs text-[#FFD700] underline"
                    style={{ fontFamily: MONO }}
                  >
                    Clear all filters
                  </Link>
                )}
              </div>
            ) : (
              // No gap between cards deliberately — ProductCard's own 1px white
              // border on each tile does the separating, so adjacent cards read
              // as one continuous grid rather than floating tiles.
              <div className="grid grid-cols-2 lg:grid-cols-3">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            <PaginationControls
              basePath={basePath}
              currentPage={currentPage}
              totalPages={totalPages}
              sort={sort}
              query={searchQuery}
              activeFilters={activeFilters}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
