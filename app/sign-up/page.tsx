import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import SignUpForm from '@/components/auth/sign-up-form'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

export const metadata: Metadata = {
  title: 'Create Account — Meister',
}

interface SignUpPageProps {
  searchParams: Promise<{ redirect_url?: string }>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { redirect_url } = await searchParams

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
        <h1
          className="text-2xl text-white sm:text-3xl"
          style={{ fontFamily: DISPLAY, fontWeight: 800 }}
        >
          CREATE ACCOUNT
        </h1>

        <SignUpForm redirectUrl={redirect_url ?? '/account'} />

        <p className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
          Already have an account?{' '}
          <Link
            href={`/sign-in${redirect_url ? `?redirect_url=${encodeURIComponent(redirect_url)}` : ''}`}
            className="text-[#FFD700] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  )
}
