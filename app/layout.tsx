import type { Metadata } from 'next'
import { Space_Mono, Zalando_Sans_Expanded } from 'next/font/google'
import './globals.css'

/** Zalando Sans Expanded — display heading font */
const zalandoSansExpanded = Zalando_Sans_Expanded({
  weight: '700',
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
      className={`${zalandoSansExpanded.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
