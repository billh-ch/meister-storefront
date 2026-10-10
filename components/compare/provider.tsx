'use client'
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { COMPARE_KEY, CompareStore } from '@/lib/compare/store'
import CompareTray from './tray'
const Context = createContext<CompareStore | null>(null)
export default function CompareProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new CompareStore({ read: () => localStorage.getItem(COMPARE_KEY), write: value => localStorage.setItem(COMPARE_KEY, value) }))
  useEffect(() => {
    store.hydrate()
    const changed = (event: StorageEvent) => { if (event.key === COMPARE_KEY || event.key === null) store.hydrate() }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [store])
  return <Context.Provider value={store}>{children}<CompareTray /></Context.Provider>
}
export function useCompare() {
  const store = useContext(Context)
  if (!store) throw Error('CompareProvider is required')
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  return { ...state, toggle: store.toggle, remove: store.remove, clear: store.clear, reconcile: store.reconcile, retry: store.hydrate }
}
