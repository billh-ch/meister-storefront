import { getTranslator, getLocale } from '@/lib/i18n/server'
import { translate } from '@/lib/i18n'
import type { Metadata } from 'next'
import Link from '@/components/i18n/localized-link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import ResetPasswordForm from '@/components/auth/reset-password-form'
import { checkResetToken } from '@/lib/auth/password-reset'
import { redisResetStore } from '@/lib/auth/reset-store'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

// The link carries a secret in the query string: keep it out of Referer headers and indexes.
export async function generateMetadata(): Promise<Metadata> { return {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  alternates: { canonical: null },
  title: translate(await getLocale(), 'Reset Password — Meister'),
} }

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const t = await getTranslator()
  const { token: raw } = await searchParams
  const token = typeof raw === 'string' ? raw : ''
  const valid = await checkResetToken(token, { store: redisResetStore })

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
        <h1 className="text-2xl text-white sm:text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
          {t('RESET PASSWORD')}
        </h1>
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="flex flex-col gap-4" style={{ fontFamily: MONO }}>
            <p role="alert" className="text-sm" style={{ color: '#FF6B6B' }}>{t('This reset link is invalid or has expired.')}</p>
            <Link href="/forgot-password" className="text-sm text-[#FFD700] hover:underline">{t('Request a new link')}</Link>
          </div>
        )}
      </div>
      <Footer />
    </main>
  )
}
