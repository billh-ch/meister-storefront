'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
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
      className={`fixed top-3 right-3 z-[60] border-2 border-[#FFD700] bg-[#1B1B18] p-4 text-white shadow-[0_12px_40px_rgba(0,0,0,0.65)] sm:top-6 sm:right-6 ${dialog ? 'w-[calc(90vw-1.5rem)] max-w-[400px]' : 'w-[calc(100vw-1.5rem)] max-w-[400px]'}`}
      style={{ fontFamily: 'var(--font-space-mono), monospace' }}>
      <button type="button" onClick={dismiss} aria-label="Dismiss cart confirmation" className="absolute top-1 right-1 min-h-11 min-w-11 text-xl">×</button>
      <p role="status" className="mb-4 pr-8 text-sm font-bold text-[#FFD700]">
        <span aria-hidden="true">✓ </span>Added to cart
        <span className="sr-only"> — {addition.quantity} × {addition.name}</span>
      </p>
      <div className="flex items-start gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-white/20 bg-[#292925]">
          {addition.image ? <Image src={addition.image} alt={addition.name} fill sizes="80px" className="object-contain" /> : <span className="flex h-full items-center justify-center px-2 text-center text-[10px] text-[#999999]">No image available</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-bold">{addition.name}</p>
          <p className="mt-2 text-xs text-[#CCCCCC]">Quantity: {addition.quantity}</p>
        </div>
      </div>
      <button type="button" onClick={() => { dismiss(); openCartDrawer() }} className="btn-gold mt-4 min-h-11 w-full px-4 text-xs">View cart</button>
    </section>
  )
  return dialog ? createPortal(banner, dialog) : banner
}
