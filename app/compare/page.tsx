import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import ComparisonContent from '@/components/compare/comparison-content'
export const metadata: Metadata = { title: 'Compare products — Meister', robots: { index: false, follow: false } }
export default function ComparePage() {
  return <><Navbar /><main className="mx-auto min-h-[60vh] max-w-[1400px] px-3 py-8 sm:px-6 sm:py-12">
    <div className="mb-8 flex items-center justify-between gap-3"><h1 className="text-lg font-bold uppercase sm:text-3xl" style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}>Compare products</h1><Link href="/shop" className="min-h-11 shrink-0 whitespace-nowrap border border-[#666666] px-3 py-3 text-[10px] text-white hover:border-[#FFD700] sm:text-xs">Continue shopping</Link></div>
    <ComparisonContent />
  </main><Footer /></>
}
