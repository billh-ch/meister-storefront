import { getTranslator } from '@/lib/i18n/server'
import Link from '@/components/i18n/localized-link'

interface Crumb {
  label: string
  href?: string
}

const MONO = 'var(--font-space-mono), monospace'

/**
 * Generic breadcrumb trail for collection pages. Kept separate from
 * `product/product-breadcrumbs.tsx`, which is shaped specifically around a
 * product name as the final crumb — this one takes an arbitrary trail so
 * both `/[category]` and `/shop` can share it.
 */
export default async function SimpleBreadcrumbs({ items }: { items: Crumb[] }) {
  const t = await getTranslator()

  return (
    <nav aria-label={t("Breadcrumb")} className="px-4 py-4 sm:px-6 md:px-10">
      <ol
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#999999]"
        style={{ fontFamily: MONO }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={t(item.label)} className="flex items-center gap-x-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href && !isLast ? (
                <Link href={item.href} className="-my-2 py-2 hover:text-[#FFD700]">
                  {t(item.label)}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className={isLast ? 'text-white' : undefined}>
                  {t(item.label)}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
