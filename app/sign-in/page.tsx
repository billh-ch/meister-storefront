import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import SignInForm from '@/components/auth/sign-in-form'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

export const metadata: Metadata = {
  title: 'Sign In — Meister',
}

interface SignInPageProps {
  searchParams: Promise<{ redirect_url?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { redirect_url } = await searchParams

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
        <h1
          className="text-2xl text-white sm:text-3xl"
          style={{ fontFamily: DISPLAY, fontWeight: 800 }}
        >
          SIGN IN
        </h1>

        <SignInForm redirectUrl={redirect_url ?? '/account'} />

        <p className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
          Don&apos;t have an account?{' '}
          <Link
            href={`/sign-up${redirect_url ? `?redirect_url=${encodeURIComponent(redirect_url)}` : ''}`}
            className="text-[#FFD700] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  )
}
