'use client'
import { createContext, useContext, useCallback, useEffect, type ReactNode } from 'react'
import { localePath, translate, type Locale, type Translator } from '@/lib/i18n'
import { rememberedHomeDestination } from '@/lib/i18n/navigation'
const LocaleContext = createContext<Locale>('en')
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    try {
      const destination = rememberedHomeDestination(window.location.pathname + window.location.search + window.location.hash, localStorage.getItem('meister_locale'))
      if (destination) window.location.replace(destination)
    } catch { /* Storage can be disabled; pathname remains the source of truth. */ }
  }, [])
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}
export function useLocale(): Locale { return useContext(LocaleContext) }
export function useTranslation(): Translator {
  const locale = useLocale()
  return useCallback((source, values) => translate(locale, source, values), [locale])
}
export function useLocalePath() {
  const locale = useLocale()
  return useCallback((path: string) => localePath(path, locale), [locale])
}
