'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { formatPrice } from '@/lib/mock-data'
import CartRecommendations from './cart-recommendations'

interface CartShoppingLayoutProps {
  children: ReactNode
  productIds: string[]
  subtotal: number
  hasPurchasableLines: boolean
}

/** Share quick-add pending state with the full cart's checkout control. */
export default function CartShoppingLayout({ children, productIds, subtotal, hasPurchasableLines }: CartShoppingLayoutProps) {
  const [pending, setPending] = useState(false)
  const checkoutAllowed = hasPurchasableLines && !pending

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        {children}
        <CartRecommendations productIds={productIds} onPendingChange={setPending} />
      </div>
      <div className="w-full lg:w-80 lg:flex-shrink-0" style={{ border: '1px solid #444444', fontFamily: 'var(--font-space-mono), monospace' }}>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#999999]">SUBTOTAL</span>
            <span className="text-lg font-bold text-white">{formatPrice(subtotal)}</span>
          </div>
          <p className="text-xs text-[#999999]">Shipping and any remaining total are calculated at checkout.</p>
          {checkoutAllowed ? (
            <Link href="/checkout" className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase">
              PROCEED TO CHECKOUT
            </Link>
          ) : (
            <span aria-disabled="true" className="flex h-12 w-full cursor-not-allowed items-center justify-center text-xs tracking-[0.1em] uppercase" style={{ backgroundColor: '#444444', color: '#999999' }}>
              {pending ? 'UPDATING CART…' : 'PROCEED TO CHECKOUT'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
