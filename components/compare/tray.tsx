'use client'
import { useLocale, useTranslation } from '@/components/i18n/locale-provider'
import { useEffect, useState } from 'react'

import Link from '@/components/i18n/localized-link'
import { stripLocale } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import { useCompare } from './provider'
export default function CompareTray() {
  const t = useTranslation()
  const locale = useLocale()

  const { items, message, error, clear, remove, retry } = useCompare()
  const ids = items.map(item => item.id).join(',')
  const key = `${locale}:${ids}`
  const [catalog, setCatalog] = useState<{ key: string; names: Record<string, string> } | null>(null)
  useEffect(() => {
    if (!ids) return
    const controller = new AbortController()
    void fetch(`/api/wishlist/products?ids=${ids}&locale=${locale}`, { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!controller.signal.aborted && data?.products) setCatalog({ key, names: Object.fromEntries(data.products.map((product: { id: string; name: string }) => [product.id, product.name])) })
      }).catch(() => { /* Saved selections remain usable during a catalog outage. */ })
    return () => controller.abort()
  }, [ids, key, locale])
  // Locale projection is display-only: never rewrite saved IDs or another tab's names.
  const displayedItems = items.map(item => ({ ...item, name: catalog?.key === key ? catalog.names[item.id] ?? item.name : item.name }))
  const pathname = stripLocale(usePathname())
  const hidden = pathname === '/compare' || pathname === '/cart' || pathname.startsWith('/checkout')
  return <>
    <p role="status" className="sr-only">{t(message)}{error ? ` ${t(error)}` : ''}</p>
    {!hidden && (items.length > 0 || error) && <>
      <div aria-hidden="true" className={pathname.startsWith('/products/') ? 'h-60 lg:h-40' : 'h-40'} />
      <section aria-label={t("Product comparison tray")} data-compare-tray
        className={`compare-tray fixed right-3 left-3 z-30 border border-[#666666] bg-[#1B1B18] px-3 py-2 text-xs text-white shadow-xl sm:right-6 sm:left-auto sm:w-[520px] ${pathname.startsWith('/products/') ? 'bottom-[88px] lg:bottom-6' : 'bottom-3 sm:bottom-6'}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold">{t('Compare {count}/4', { count: items.length })}</p>
          <div className="flex items-center gap-2"><button type="button" onClick={clear} aria-label={t("Clear comparison")} className="min-h-11 px-2 text-[#999999] hover:text-white">{t("Clear")}</button>
            {items.length >= 2 ? <Link href="/compare" aria-label={t("Compare selected products")} scroll={false} onNavigate={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })} className="btn-gold flex min-h-11 items-center px-3 text-[11px]">{t("COMPARE")}</Link> : <button type="button" disabled className="btn-gold min-h-11 px-3 text-[11px]">{t("COMPARE")}</button>}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {displayedItems.map(item => <div key={item.id} className="flex shrink-0 items-center gap-1 border border-[#444444] pl-2"><span className="max-w-28 truncate text-[10px]">{item.name}</span><button type="button" aria-label={t("Remove {value0} from comparison tray", { value0: item.name })} onClick={() => remove(item.id)} className="flex h-11 w-11 items-center justify-center text-lg text-[#999999] hover:text-white">×</button></div>)}
        </div>
        {message.includes("same category") || message.includes("four products") ? <p className="pt-2 text-[11px] text-[#FFD700]">{t(message)}</p> : null}
        {error && <div className="pt-2 text-[11px] text-[#FFD700]"><p>{t(error)}</p><button type="button" onClick={retry} className="min-h-11 underline">{t("Retry comparison save")}</button></div>}
      </section>
    </>}
  </>
}
