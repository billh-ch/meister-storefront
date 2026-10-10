'use client'
import Link from 'next/link'
import { CompareIcon } from './button'
import { useCompare } from './provider'
export default function CompareNavLink() {
  const { items } = useCompare()
  return <Link href="/compare" scroll={false} onNavigate={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
    aria-label={items.length ? `Compare products, ${items.length} selected` : 'Compare products'}
    className="relative hidden h-11 w-11 shrink-0 items-center justify-center text-white hover:text-[#FFD700] lg:flex">
    <CompareIcon />{items.length > 0 && <span aria-hidden="true" className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFD700] px-1 text-[10px] font-bold text-[#1B1B18]">{items.length}</span>}
  </Link>
}
