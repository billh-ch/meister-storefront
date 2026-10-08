'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CART_ADDED_EVENT, openCartDrawer, type CartAddedDetail } from '@/lib/cart/client-events'

export default function CartAddedBanner() {
  const [addition, setAddition] = useState<CartAddedDetail | null>(null)
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pause = () => { if (timer.current) clearTimeout(timer.current) }
  const dismiss = () => { pause(); setAddition(null) }
  const resume = () => {
    pause()
    timer.current = setTimeout(() => setAddition(null), 5000)
  }

  useEffect(() => {
    const added = (event: Event) => {
      setAddition((event as CustomEvent<CartAddedDetail>).detail)
      // A modal dialog is in the browser's top layer; its confirmation must
      // live inside it to remain visible and accessible after a quick addition.
      setDialog(document.querySelector<HTMLDialogElement>('dialog[open]'))
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setAddition(null), 5000)
    }
    window.addEventListener(CART_ADDED_EVENT, added)
    return () => {
      window.removeEventListener(CART_ADDED_EVENT, added)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  useEffect(() => {
    if (!dialog) return
    const closed = () => {
      if (timer.current) clearTimeout(timer.current)
      setAddition(null)
    }
    dialog.addEventListener('close', closed)
    return () => dialog.removeEventListener('close', closed)
  }, [dialog])

  if (!addition) return null
  const banner = (
    <section aria-label="Cart confirmation"
      onMouseEnter={pause} onMouseLeave={resume} onFocusCapture={pause}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) resume() }}
      className={`fixed top-0 right-0 z-[60] flex items-center gap-3 border-b border-[#FFD700] bg-[#1B1B18] px-4 py-3 text-white shadow-lg ${dialog ? 'w-[90vw] max-w-md' : 'left-0'}`}
      style={{ fontFamily: 'var(--font-space-mono), monospace' }}>
      <p role="status" className="min-w-0 flex-1 break-words text-xs sm:text-sm">
        <span className="font-bold text-[#FFD700]">Added to cart</span> — {addition.quantity} × {addition.name}
      </p>
      <button type="button" onClick={() => { dismiss(); openCartDrawer() }} className="min-h-11 shrink-0 text-xs underline">View cart</button>
      <button type="button" onClick={dismiss} aria-label="Dismiss cart confirmation" className="min-h-11 min-w-11 shrink-0 text-xl">×</button>
    </section>
  )
  return dialog ? createPortal(banner, dialog) : banner
}
