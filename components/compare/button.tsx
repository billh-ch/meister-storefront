'use client'
import type { CompareSelection } from '@/lib/compare/store'
import { useCompare } from './provider'
export function CompareIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4" /></svg>
}
export default function CompareButton({ product, card = false }: { product: CompareSelection; card?: boolean }) {
  const { items, ready, toggle } = useCompare()
  const selected = items.some(item => item.id === product.id)
  return <button type="button" disabled={!ready} aria-pressed={selected} aria-label={`${selected ? 'Remove' : 'Add'} ${product.name} ${selected ? 'from' : 'to'} comparison`}
    onClick={event => { event.stopPropagation(); toggle(product) }}
    className={`flex min-h-11 w-full items-center justify-center gap-2 px-3 py-2 text-xs transition-colors hover:text-[#FFD700] disabled:opacity-50 ${card ? 'border-t border-[#444444]' : 'border border-[#666666] hover:border-[#FFD700]'} ${selected ? 'text-[#FFD700]' : 'text-[#CCCCCC]'}`}>
    <CompareIcon /><span>{selected ? 'Added to compare' : 'Add to compare'}</span>
  </button>
}
