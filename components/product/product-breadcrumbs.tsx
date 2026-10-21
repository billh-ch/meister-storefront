import { getTranslator } from '@/lib/i18n/server'
import Link from '@/components/i18n/localized-link'
import { findCategory } from '@/lib/categories'

interface ProductBreadcrumbsProps {
  categorySlug: string
  productName: string
}

const MONO = 'var(--font-space-mono), monospace'

export default async function ProductBreadcrumbs({
  categorySlug,
  productName,
}: ProductBreadcrumbsProps) {
  const t = await getTranslator()

  // All five real categories, not just the four homepage showcase tabs —
  // categoryDetails has no `guns` entry, so a guns product's breadcrumb
  // used to silently drop its middle crumb.
  const category = findCategory(categorySlug)

  return (
    <nav aria-label={t("Breadcrumb")} className="px-4 py-4 sm:px-6 md:px-10">
      <ol
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#999999]"
        style={{ fontFamily: MONO }}
      >
        <li>
          {/* -my-2 py-2 keeps the tap target at 44px without visual bulk */}
          <Link href="/" className="-my-2 py-2 hover:text-[#FFD700]">
            {t("HOME")}
          </Link>
        </li>
        {category && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/${category.slug}`}
                className="-my-2 py-2 hover:text-[#FFD700]"
              >
                {t(category.name)}
              </Link>
            </li>
          </>
        )}
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="max-w-full truncate text-white">
          {productName}
        </li>
      </ol>
    </nav>
  )
}
