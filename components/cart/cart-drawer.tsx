'use client'
import { useTranslation, useLocale } from '@/components/i18n/locale-provider'

import Link from '@/components/i18n/localized-link'
import Image from '@/components/store-image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { stripLocale } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import type { ResolvedCart } from '@/lib/cart/resolve'
import { cartLineKey } from '@/lib/cart/line-key'
import { CART_OPEN_EVENT, CART_UPDATED_EVENT } from '@/lib/cart/client-events'
import { formatPrice } from '@/lib/mock-data'
import CartLineControls from './cart-line-controls'
import CartRecommendations from './cart-recommendations'

const MONO = 'var(--font-space-mono), monospace'

/** Native dialog provides modal focus trapping, Escape and focus restoration. */
export default function CartDrawer() {
  const t = useTranslation()
  const locale = useLocale()

  const dialogRef = useRef<HTMLDialogElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const originalOverflow = useRef<string | null>(null)
  const [cart, setCart] = useState<ResolvedCart | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mutationPending, setMutationPending] = useState(false)
  const pathname = stripLocale(usePathname())

  const restoreScroll = useCallback(() => {
    if (originalOverflow.current !== null) {
      document.body.style.overflow = originalOverflow.current
      originalOverflow.current = null
    }
  }, [])

  const close = useCallback(() => {
    dialogRef.current?.close()
    abortRef.current?.abort()
    restoreScroll()
  }, [restoreScroll])

  const loadCart = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/cart?locale=${locale}`, { cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw new Error('Cart unavailable')
      const next: ResolvedCart = await response.json()
      if (!controller.signal.aborted) setCart(next)
    } catch {
      if (!controller.signal.aborted) setError('Could not verify your cart. Please try again.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [locale])

  useEffect(() => {
    const open = (event: Event) => {
      const dialog = dialogRef.current
      if (!dialog) return
      event.preventDefault()
      if (!dialog.open) {
        originalOverflow.current = document.body.style.overflow
        dialog.showModal()
        document.body.style.overflow = 'hidden'
      }
      void loadCart()
    }
    const refresh = () => { if (dialogRef.current?.open) void loadCart() }
    window.addEventListener(CART_OPEN_EVENT, open)
    window.addEventListener(CART_UPDATED_EVENT, refresh)
    return () => {
      window.removeEventListener(CART_OPEN_EVENT, open)
      window.removeEventListener(CART_UPDATED_EVENT, refresh)
      abortRef.current?.abort()
      restoreScroll()
    }
  }, [loadCart, restoreScroll])

  useEffect(() => { close() }, [pathname, close])

  const checkoutAllowed = cart && cart.lines.length > 0 && cart.unavailableCount === 0 && cart.lines.every(line => line.purchasable)
  const onCheckoutPage = pathname.startsWith('/checkout')

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cart-drawer-heading"
      onCancel={close}
      onClose={close}
      onClick={event => { if (event.target === event.currentTarget) close() }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[90vw] max-w-md border-0 p-0 text-white backdrop:bg-black/50"
      style={{ backgroundColor: 'var(--color-dark)', fontFamily: MONO }}
    >
      <div className="flex h-full min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-white p-5">
          <h2 id="cart-drawer-heading" className="text-lg font-bold">{t("Your cart")}</h2>
          <button type="button" onClick={close} aria-label={t("Close cart")} className="min-h-11 min-w-11 text-xl">×</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5" aria-busy={loading}>
          {loading && <p role="status" className="mb-4 text-sm">{t("Updating your cart…")}</p>}
          {error ? (
            <div>
              <p role="alert" className="text-sm">{t(error)}</p>
              <button type="button" onClick={() => void loadCart()} className="mt-3 min-h-11 underline">{t("Retry")}</button>
            </div>
          ) : cart && (
            <>
              {cart.unavailableCount > 0 && <p role="status" className="mb-4 text-sm">{t("Some items are no longer available. Review your cart before checkout.")}</p>}
              {cart.lines.length === 0 ? (
                <div className="flex flex-col gap-4">
                  <p>{t("Your cart is empty.")}</p>
                  <Link href="/shop" onClick={close} className="btn-gold px-4 py-3 text-center text-xs">{t("Explore the range")}</Link>
                </div>
              ) : (
                <>
                  <fieldset disabled={mutationPending || loading}>
                    {onCheckoutPage && <p className="mb-4 text-xs">{t("To change quantities, open the full cart before returning to checkout.")}</p>}
                    <ul className="flex flex-col gap-6">
                      {cart.lines.map(line => (
                        <li key={cartLineKey(line)} className="flex min-w-0 flex-col gap-3 border-b border-white/20 pb-5">
                          <div className="flex min-w-0 items-start gap-3">
                            {line.image && (
                              <Link href={`/products/${line.slug}`} onClick={close} className="relative h-20 w-20 shrink-0 overflow-hidden">
                                <Image src={line.image} alt={line.name} fill sizes="80px" className="object-cover" />
                              </Link>
                            )}
                            <div className="flex min-w-0 flex-1 flex-col gap-2 break-words">
                              <Link href={`/products/${line.slug}`} onClick={close} className="text-sm font-bold">{line.name}</Link>
                              {Object.entries(line.attributes).map(([name, value]) => <p key={name} className="text-xs">{t(name)}: {value}</p>)}
                              <p className="text-sm">{formatPrice(line.unitPrice)} × {line.quantity}</p>
                              {line.checkoutIssue ? <p className="text-xs text-[#FF6B6B]">{t(line.checkoutIssue)}</p> : !line.purchasable && <p className="text-xs">{t("Out of stock")}</p>}
                            </div>
                          </div>
                          {!onCheckoutPage && <CartLineControls productId={line.productId} variationId={line.variationId} selectedOptions={line.selectedOptions} quantity={line.quantity} onPendingChange={setMutationPending} />}
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                  {!onCheckoutPage && <CartRecommendations productIds={cart.lines.map(line => line.productId)} disabled={loading || mutationPending} onPendingChange={setMutationPending} onNavigate={close} />}
                </>
              )}
            </>
          )}
        </div>
        <footer className="flex flex-col gap-3 border-t border-white p-5">
          {cart && !error && <p className="flex justify-between text-sm"><span>{t("Subtotal")}</span><span>{formatPrice(cart.subtotal)}</span></p>}
          <p className="text-xs">{t("Delivery is calculated at checkout.")}</p>
          {checkoutAllowed && !loading && !mutationPending && !error && <Link href="/checkout" onClick={close} className="btn-gold px-4 py-3 text-center text-xs">{t("Checkout")}</Link>}
          <Link href="/cart" onClick={close} className="py-2 text-center text-xs underline">{t("View full cart")}</Link>
        </footer>
      </div>
    </dialog>
  )
}
