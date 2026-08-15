import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

/**
 * Root 404 — everything Next can't route falls through to this, branded
 * rather than the framework default. `products/[slug]` has its own more
 * specific version for a missing product; this is the generic catch-all.
 */
export default function NotFound() {
  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />

      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-20 text-center">
        <h1
          className="text-2xl text-white sm:text-3xl md:text-4xl"
          style={{ fontFamily: DISPLAY, fontWeight: 800 }}
        >
          404 — PAGE NOT FOUND
        </h1>

        <p
          className="max-w-lg text-sm text-[#CCCCCC]"
          style={{ fontFamily: MONO }}
        >
          This page doesn&rsquo;t exist, or the link you followed is out of
          date. Have a look at what we currently carry.
        </p>

        <Link
          href="/"
          className="flex min-h-[48px] items-center justify-center px-6 py-3 text-sm font-bold tracking-wider text-white uppercase transition-opacity hover:opacity-80"
          style={{
            border: '3px solid #FFD700',
            backgroundColor: '#1B1B18',
            fontFamily: MONO,
          }}
        >
          Back to shop
        </Link>
      </div>

      <Footer />
    </main>
  )
}
