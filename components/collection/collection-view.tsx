import ProductCard from '@/components/product-card'
import SimpleBreadcrumbs from './simple-breadcrumbs'
import SortSelect from './sort-select'
import PaginationControls from './pagination-controls'
import type { Collection, SortOption } from '@/lib/collection'

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
}

const MONO = 'var(--font-space-mono), monospace'

/**
 * Shared body for every product-listing page — `/[category]` and `/shop`.
 * Both differ only in which products they hand in and what the breadcrumb
 * trail says, so this owns everything else: heading, sort, grid, empty
 * state, pagination.
 */
export default function CollectionView({
  title,
  breadcrumbs,
  basePath,
  collection,
  sort,
}: CollectionViewProps) {
  const { items, currentPage, totalPages, totalItems } = collection

  return (
    <div className="pb-16">
      <SimpleBreadcrumbs items={breadcrumbs} />

      <div className="mx-auto max-w-[1400px] px-2 sm:px-3 md:px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
          <div>
            <h1
              className="text-2xl text-white sm:text-3xl md:text-4xl"
              style={{ fontFamily: 'var(--font-dela-gothic), sans-serif', fontWeight: 800 }}
            >
              {title}
            </h1>
            <p className="mt-1 text-xs text-[#999999] sm:text-sm" style={{ fontFamily: MONO }}>
              {totalItems} {totalItems === 1 ? 'PRODUCT' : 'PRODUCTS'}
            </p>
          </div>

          {totalItems > 0 && <SortSelect basePath={basePath} currentSort={sort} />}
        </div>

        {items.length === 0 ? (
          <div
            className="hatching-bg flex flex-col items-center justify-center gap-2 py-24 text-center"
            style={{ border: '1px solid #444444' }}
          >
            <p className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
              NO PRODUCTS IN THIS CATEGORY YET
            </p>
          </div>
        ) : (
          // No gap between cards deliberately — ProductCard's own 1px white
          // border on each tile does the separating, so adjacent cards read
          // as one continuous grid rather than floating tiles. The page
          // margin comes from the parent's px-2/sm:px-3/md:px-4, not from
          // here.
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
        />
      </div>
    </div>
  )
}
