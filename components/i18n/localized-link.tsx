'use client'
import Link from 'next/link'
import { forwardRef, type ComponentProps } from 'react'
import { useLocale } from './locale-provider'
import { localizedDestination } from '@/lib/i18n/navigation'
/** Matches Next Link including UrlObject hrefs and anchor refs. */
export const LocalizedLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function LocalizedLink({ href, as, ...props }, ref) {
  const locale = useLocale()
  return <Link ref={ref} {...props} href={localizedDestination(href, locale)} as={as === undefined ? undefined : localizedDestination(as, locale)} />
})
export default LocalizedLink
