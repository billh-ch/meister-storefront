'use client'

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { WishlistStore, type AccountWishlist } from '@/lib/wishlist/store'

const Context = createContext<WishlistStore | null>(null)
async function responseData(response: Response): Promise<AccountWishlist> {
  if (!response.ok) throw Error('Wishlist unavailable')
  return response.json()
}
export default function WishlistProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new WishlistStore({
    read: key => window.localStorage.getItem(key),
    write: (key, value) => window.localStorage.setItem(key, value),
    load: () => fetch('/api/wishlist', { cache: 'no-store' }).then(responseData),
    change: (customerId, additions, removals) => fetch('/api/wishlist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, additions, removals }),
    }).then(responseData),
  }))
  const pathname = usePathname()
  useEffect(() => { void store.invalidate() }, [store, pathname])
  useEffect(() => {
    const sync = () => { void store.sync() }
    const visible = () => { if (document.visibilityState === 'visible') sync() }
    const storage = (event: StorageEvent) => { if (event.key?.startsWith('mm_wishlist_')) sync() }
    window.addEventListener('focus', sync)
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('storage', storage)
    return () => {
      window.removeEventListener('focus', sync)
      window.removeEventListener('online', sync)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('storage', storage)
    }
  }, [store])
  return <Context.Provider value={store}>{children}<WishlistFeedback /></Context.Provider>
}
export function useWishlist() {
  const store = useContext(Context)
  if (!store) throw Error('WishlistProvider is required')
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  return { ...state, toggle: store.toggle, retry: store.sync }
}
function WishlistFeedback() {
  const { error, message, retry, syncing } = useWishlist()
  return <>
    <p className="sr-only" role="status">{message}</p>
    {error && <aside aria-label="Wishlist synchronization" className="fixed bottom-4 left-3 z-[70] max-w-[calc(100vw-24px)] border border-[#FFD700] bg-[#1B1B18] p-4 text-xs text-white shadow-xl sm:left-6 sm:max-w-sm">
      <p role="status">{error}</p>
      <button type="button" disabled={syncing} onClick={() => void retry()} className="mt-2 min-h-11 px-3 font-bold text-[#FFD700] underline disabled:opacity-50">{syncing ? 'Syncing…' : 'Retry wishlist sync'}</button>
    </aside>}
  </>
}
