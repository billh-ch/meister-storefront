'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLocale } from './locale-provider'
import { localeSwitchPath } from '@/lib/i18n/navigation'

const languages = [
  { locale: 'en', name: 'English', label: 'Switch language to English' },
  { locale: 'el', name: 'Ελληνικά', label: 'Αλλαγή γλώσσας σε Ελληνικά' },
] as const

/** Full navigation refreshes the shared root layout's request-scoped locale. */
export default function LanguageSwitch() {
  const locale = useLocale()
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const links = useRef<Partial<Record<'en' | 'el', HTMLAnchorElement>>>({})
  const title = locale === 'el' ? 'Γλώσσα' : 'Language'

  useEffect(() => {
    const update = () => {
      const current = window.location.pathname + window.location.search + window.location.hash
      for (const language of languages) {
        links.current[language.locale]?.setAttribute('href', localeSwitchPath(current, language.locale))
      }
    }
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [pathname, search])

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  return (
    <div ref={root} className="relative inline-block shrink-0"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          setOpen(false)
          trigger.current?.focus()
        }
      }}>
      <button ref={trigger} type="button" aria-expanded={open} aria-controls={panelId}
        aria-label={locale === 'el' ? 'Επιλογή γλώσσας: Ελληνικά' : 'Choose language: English'}
        onClick={() => setOpen(value => !value)}
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded border border-card-border bg-nav px-2.5 text-xs text-foreground transition-colors hover:border-gold hover:text-gold">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" />
        </svg>
        <span>{locale.toUpperCase()}</span>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
          className={open ? 'rotate-180' : undefined}><path d="m4 6 4 4 4-4" /></svg>
      </button>
      <div id={panelId} hidden={!open}
        className="absolute left-0 top-full xl:left-auto xl:right-0 z-50 mt-2 min-w-44 rounded border border-card-border bg-nav p-1.5 shadow-xl">
        <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-foreground/60">{title}</p>
        {languages.map(language => (
          <a key={language.locale} ref={element => { links.current[language.locale] = element ?? undefined }}
            href={localeSwitchPath(pathname + (search ? '?' + search : ''), language.locale)}
            lang={language.locale} hrefLang={language.locale} aria-label={language.label}
            aria-current={locale === language.locale ? 'true' : undefined}
            className="flex min-h-11 items-center justify-between gap-4 rounded px-3 text-xs text-foreground hover:bg-foreground/10 aria-[current=true]:text-gold"
            onClick={event => {
              event.currentTarget.href = localeSwitchPath(window.location.pathname + window.location.search + window.location.hash, language.locale)
              try { localStorage.setItem('meister_locale', language.locale) } catch { /* Storage can be disabled. */ }
              setOpen(false)
            }}>
            <span>{language.name}</span>
            {locale === language.locale && <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m3 8 3 3 7-7" /></svg>}
          </a>
        ))}
      </div>
    </div>
  )
}
