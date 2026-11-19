import { getTranslator, getLocale } from '@/lib/i18n/server'
import { translate } from '@/lib/i18n'
import type { Metadata } from 'next'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import ForgotPasswordForm from '@/components/auth/forgot-password-form'

const DISPLAY = 'var(--font-dela-gothic), sans-serif'

export async function generateMetadata(): Promise<Metadata> { return {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  title: translate(await getLocale(), 'Forgot Password — Meister'),
} }

export default async function ForgotPasswordPage() {
  const t = await getTranslator()
  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
        <h1 className="text-2xl text-white sm:text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
          {t('FORGOT PASSWORD')}
        </h1>
        <ForgotPasswordForm />
      </div>
      <Footer />
    </main>
  )
}
