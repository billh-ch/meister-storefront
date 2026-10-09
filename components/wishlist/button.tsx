'use client'
import { useWishlist } from './provider'

export function HeartIcon({ filled = false }: { filled?: boolean }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
}
export default function WishlistButton({ id, name, card = false }: { id: string; name: string; card?: boolean }) {
  const { ids, ready, toggle } = useWishlist()
  const saved = ids.includes(id)
  return <button type="button" disabled={!ready} aria-pressed={saved}
    aria-label={`${saved ? 'Remove' : 'Add'} ${name} ${saved ? 'from' : 'to'} wishlist`}
    onClick={event => { event.stopPropagation(); toggle(id) }}
    className={card
      ? 'absolute top-2 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[#1B1B18]/90 text-[#FFD700] shadow-md transition-colors hover:bg-black disabled:opacity-50'
      : 'flex min-h-11 w-full items-center justify-center gap-2 border border-[#666666] px-4 py-2 text-xs text-[#FFD700] transition-colors hover:border-[#FFD700] disabled:opacity-50'}>
    <HeartIcon filled={saved} />{!card && <span>{saved ? 'Saved to wishlist' : 'Add to wishlist'}</span>}
  </button>
}
