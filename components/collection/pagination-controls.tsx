import Link from 'next/link'

interface PaginationControlsProps {
  basePath: string
  currentPage: number
  totalPages: number
  /** Carried into every page link so sort survives paging. */
  sort: string
  /** Carried into every page link so a search query survives paging. */
  query?: string
}

const MONO = 'var(--font-space-mono), monospace'

function pageHref(basePath: string, page: number, sort: string, query?: string): string {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (sort !== 'featured') params.set('sort', sort)
  if (query) params.set('q', query)
  const search = params.toString()
  return search ? `${basePath}?${search}` : basePath
}

/**
 * Plain links, no client component — paging never needs to preserve
 * anything a server render can't already express in the URL.
 */
export default function PaginationControls({
  basePath,
  currentPage,
  totalPages,
  sort,
  query,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-2 sm:mt-12"
      style={{ fontFamily: MONO }}
    >
      <PageLink
        basePath={basePath}
        page={currentPage - 1}
        sort={sort}
        query={query}
        disabled={currentPage <= 1}
        label="Previous page"
      >
        ‹
      </PageLink>

      {pages.map((page) => (
        <Link
          key={page}
          href={pageHref(basePath, page, sort, query)}
          aria-current={page === currentPage ? 'page' : undefined}
          className="flex h-9 w-9 items-center justify-center text-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700]"
          style={{
            border: page === currentPage ? '1px solid #FFD700' : '1px solid #444444',
            color: page === currentPage ? '#FFD700' : '#FFFFFF',
          }}
        >
          {page}
        </Link>
      ))}

      <PageLink
        basePath={basePath}
        page={currentPage + 1}
        sort={sort}
        query={query}
        disabled={currentPage >= totalPages}
        label="Next page"
      >
        ›
      </PageLink>
    </nav>
  )
}

function PageLink({
  basePath,
  page,
  sort,
  query,
  disabled,
  label,
  children,
}: {
  basePath: string
  page: number
  sort: string
  query?: string
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span
        className="flex h-9 w-9 items-center justify-center text-sm opacity-30"
        style={{ border: '1px solid #444444' }}
        aria-hidden="true"
      >
        {children}
      </span>
    )
  }

  return (
    <Link
      href={pageHref(basePath, page, sort, query)}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center text-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700]"
      style={{ border: '1px solid #444444', color: '#FFFFFF' }}
    >
      {children}
    </Link>
  )
}
