import type { Metadata } from 'next'
import { Anton, Space_Mono, Dela_Gothic_One } from 'next/font/google'
import './globals.css'

/** Anton — wide display font, replaces "Heading Pro Wide Trial ExtraBold" from Framer */
const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

/** Dela Gothic One — display heading font */
const delaGothicOne = Dela_Gothic_One({
  weight: '400',
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
  title: 'Meister — Diving Equipment Athens',
  description:
    'Premium diving equipment store in Athens, Greece. Fins, spearguns, accessories and more.',
  openGraph: {
    title: 'Meister — Diving Equipment Athens',
    description: 'Premium diving equipment. Athens, Greece.',
    type: 'website',
  },
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
      className={`${anton.variable} ${delaGothicOne.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
