'use client'
import Link from 'next/link'
import { forwardRef, type ComponentProps } from 'react'
import { useLocalePath } from './locale-provider'
/** Matches Next Link including UrlObject hrefs and anchor refs. */
export const LocalizedLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function LocalizedLink({ href, ...props }, ref) {
  const path = useLocalePath()
  const localized = typeof href === 'string' ? path(href) : href.pathname && !href.host && !href.hostname && !href.protocol ? { ...href, pathname: path(href.pathname) } : href
  return <Link ref={ref} {...props} href={localized} />
})
export default LocalizedLink
