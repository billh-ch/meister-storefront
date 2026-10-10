'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCompare } from './provider'
export default function CompareTray() {
  const { items, message, error, clear, remove, retry } = useCompare()
  const pathname = usePathname()
  const hidden = pathname === '/compare' || pathname === '/cart' || pathname.startsWith('/checkout')
  return <>
    <p role="status" className="sr-only">{message}{error ? ` ${error}` : ''}</p>
    {!hidden && (items.length > 0 || error) && <>
      <div aria-hidden="true" className={pathname.startsWith('/products/') ? 'h-60 lg:h-40' : 'h-40'} />
      <section aria-label="Product comparison tray" data-compare-tray
        className={`compare-tray fixed right-3 left-3 z-30 border border-[#666666] bg-[#1B1B18] px-3 py-2 text-xs text-white shadow-xl sm:right-6 sm:left-auto sm:w-[520px] ${pathname.startsWith('/products/') ? 'bottom-[88px] lg:bottom-6' : 'bottom-3 sm:bottom-6'}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold">Compare {items.length}/4</p>
          <div className="flex items-center gap-2"><button type="button" onClick={clear} aria-label="Clear comparison" className="min-h-11 px-2 text-[#999999] hover:text-white">Clear</button>
            {items.length >= 2 ? <Link href="/compare" aria-label="Compare selected products" scroll={false} onNavigate={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })} className="btn-gold flex min-h-11 items-center px-3 text-[11px]">COMPARE</Link> : <button type="button" disabled className="btn-gold min-h-11 px-3 text-[11px]">COMPARE</button>}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {items.map(item => <div key={item.id} className="flex shrink-0 items-center gap-1 border border-[#444444] pl-2"><span className="max-w-28 truncate text-[10px]">{item.name}</span><button type="button" aria-label={`Remove ${item.name} from comparison tray`} onClick={() => remove(item.id)} className="flex h-11 w-11 items-center justify-center text-lg text-[#999999] hover:text-white">×</button></div>)}
        </div>
        {message.includes('same category') || message.includes('four products') ? <p className="pt-2 text-[11px] text-[#FFD700]">{message}</p> : null}
        {error && <div className="pt-2 text-[11px] text-[#FFD700]"><p>{error}</p><button type="button" onClick={retry} className="min-h-11 underline">Retry comparison save</button></div>}
      </section>
    </>}
  </>
}
