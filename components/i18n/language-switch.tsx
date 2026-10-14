'use client'
import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLocale } from './locale-provider'
import { localePath } from '@/lib/i18n'
/** A full navigation refreshes the shared root layout's request-scoped locale. */
export default function LanguageSwitch() {
  const locale = useLocale()
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const nextLocale = locale === 'en' ? 'el' : 'en'
  const link = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    const update = () => {
      if (link.current) link.current.setAttribute('href', localePath(`${window.location.pathname}${window.location.search}${window.location.hash}`, nextLocale))
    }
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [pathname, search, nextLocale])
  const href = localePath(`${pathname}${search ? `?${search}` : ''}`, nextLocale)
  return <a ref={link} href={href} lang={nextLocale} hrefLang={nextLocale}
    aria-label={nextLocale === 'el' ? 'Αλλαγή γλώσσας σε Ελληνικά' : 'Switch language to English'}
    className="inline-flex min-h-11 items-center px-2 text-xs text-[#999999] hover:text-[#FFD700]"
    onClick={event => {
      const destination = localePath(`${window.location.pathname}${window.location.search}${window.location.hash}`, nextLocale)
      event.currentTarget.href = destination
      try { localStorage.setItem('meister_locale', nextLocale) } catch { /* Private browsing may disable storage. */ }
    }}>{nextLocale === 'el' ? 'Ελληνικά' : 'English'}</a>
}
