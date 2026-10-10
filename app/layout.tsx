import type { Metadata } from 'next'
import { Space_Mono, Zalando_Sans_Expanded } from 'next/font/google'
import './globals.css'
import CompareProvider from '@/components/compare/provider'
import WishlistProvider from '@/components/wishlist/provider'
import CartDrawer from '@/components/cart/cart-drawer'
import CartAddedBanner from '@/components/cart/cart-added-banner'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getPublicSiteUrl } from '@/lib/seo/site'

/**
 * Zalando Sans Expanded — display heading font.
 * Loaded as a variable font (wght 200–900) because headings request both
 * 700 and 800; a single static weight would force the browser to fake the
 * heavier one with synthetic bold.
 */
const zalandoSansExpanded = Zalando_Sans_Expanded({
  style: 'normal',
  subsets: ['latin'],
  variable: '--font-dela-gothic',
  display: 'swap',
})

/** Space Mono — monospace body font used throughout the design */
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: getPublicSiteUrl(),
  ...buildPageMetadata({
    title: 'Meister — Freediving & Spearfishing Equipment',
    description: 'Explore freediving and spearfishing equipment at Meister: fins, wetsuits, spearguns and diving accessories. Browse product specifications and available options.',
    path: '/',
  }),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="el"
      dir="ltr"
      className={`${zalandoSansExpanded.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-screen antialiased"><WishlistProvider><CompareProvider>{children}<CartDrawer /><CartAddedBanner /></CompareProvider></WishlistProvider></body>
    </html>
  )
}
