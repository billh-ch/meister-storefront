import type { Metadata } from 'next'
import { Space_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

/** Heading Pro Wide — local display heading font */
const headingProWide = localFont({
  src: [
    {
      path: '../public/heading_pro_wide/Heading-Pro-Wide-Regular-trial.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/heading_pro_wide/Heading-Pro-Wide-Bold-trial.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/heading_pro_wide/Heading-Pro-Wide-ExtraBold-trial.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../public/heading_pro_wide/Heading-Pro-Wide-Black-trial.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
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
      className={`${headingProWide.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
