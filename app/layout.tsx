import { getLocale } from '@/lib/i18n/server'
import { LocaleProvider } from '@/components/i18n/locale-provider'
import type { Metadata } from 'next'
import { Cascadia_Mono, Space_Mono, Syne } from 'next/font/google'
import './globals.css'
import CompareProvider from '@/components/compare/provider'
import WishlistProvider from '@/components/wishlist/provider'
import CartDrawer from '@/components/cart/cart-drawer'
import CartAddedBanner from '@/components/cart/cart-added-banner'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getPublicSiteUrl } from '@/lib/seo/site'

/** Syne — shared bold heading font, including native Greek glyphs. */
const syne = Syne({
  weight: '700',
  subsets: ['latin', 'greek'],
  variable: '--font-syne',
  display: 'swap',
})

/** Space Mono — monospace body font used throughout the design */
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-english-mono',
  display: 'swap',
})

const cascadiaMono = Cascadia_Mono({
  style: 'normal', subsets: ['latin', 'greek'], variable: '--font-cascadia-mono', display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  return {
  metadataBase: getPublicSiteUrl(),
  ...buildPageMetadata({
    title: 'Meister — Freediving & Spearfishing Equipment',
    description: 'Explore freediving and spearfishing equipment at Meister: fins, wetsuits, spearguns and diving accessories. Browse product specifications and available options.',
    path: '/', locale: await getLocale(),
  }),
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  return (
    <html
      lang={locale}
      dir="ltr"
      className={`${syne.variable} ${spaceMono.variable} ${cascadiaMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <LocaleProvider locale={locale}>
          <WishlistProvider>
            <CompareProvider>{children}<CartDrawer /><CartAddedBanner /></CompareProvider>
          </WishlistProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
