import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import SimpleBreadcrumbs from '@/components/collection/simple-breadcrumbs'
import CartLineControls from '@/components/cart/cart-line-controls'
import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'
import { getSession } from '@/lib/auth/session'
import { formatPrice } from '@/lib/mock-data'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

export const metadata: Metadata = {
  title: 'Your Cart — Meister',
}

/**
 * Static path segment, publicly viewable — no sign-in required to see or
 * edit the cart, only to check out (Phase 2/3 gate `/checkout` itself).
 */
export default async function CartPage() {
  const cart = await getCart()
  const resolved = await resolveCartItems(cart)
  const hasPurchasableLines = resolved.lines.some((line) => line.purchasable)

  const session = await getSession()
  const checkoutHref = session.wcCustomerId ? '/checkout' : '/sign-in?redirect_url=/checkout'

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />
      <SimpleBreadcrumbs items={[{ label: 'HOME', href: '/' }, { label: 'CART' }]} />

      <div className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 md:px-10">
        <h1
          className="mb-6 text-2xl text-white sm:text-3xl md:text-4xl"
          style={{ fontFamily: DISPLAY, fontWeight: 800 }}
        >
          YOUR CART
        </h1>

        {resolved.lines.length === 0 ? (
          <div
            className="hatching-bg flex flex-col items-center justify-center gap-4 py-24 text-center"
            style={{ border: '1px solid #444444' }}
          >
            <p className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
              YOUR CART IS EMPTY
            </p>
            <Link
              href="/shop"
              className="btn-gold px-6 py-3 text-xs tracking-[0.1em] uppercase"
            >
              BROWSE PRODUCTS
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex-1" style={{ border: '1px solid #444444' }}>
              {resolved.unavailableCount > 0 && (
                <p
                  className="px-4 py-3 text-xs"
                  style={{ fontFamily: MONO, color: '#FF6B6B', borderBottom: '1px solid #444444' }}
                >
                  {resolved.unavailableCount === 1
                    ? 'One item in your cart is no longer available and has been removed from your total.'
                    : `${resolved.unavailableCount} items in your cart are no longer available and have been removed from your total.`}
                </p>
              )}

              {resolved.lines.map((line) => (
                <div
                  key={`${line.productId}:${line.variationId ?? ''}`}
                  className="flex gap-4 p-4"
                  style={{ borderBottom: '1px solid #222222' }}
                >
                  <Link
                    href={`/products/${line.slug}`}
                    className="relative h-24 w-24 flex-shrink-0 overflow-hidden bg-[#222222]"
                  >
                    {line.image && (
                      <Image src={line.image} alt={line.name} fill className="object-cover" sizes="96px" />
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/products/${line.slug}`}
                          className="text-sm font-bold text-white transition-colors hover:text-[#FFD700] sm:text-base"
                          style={{ fontFamily: MONO }}
                        >
                          {line.name}
                        </Link>
                        {Object.keys(line.attributes).length > 0 && (
                          <p className="mt-1 text-xs text-[#999999]" style={{ fontFamily: MONO }}>
                            {Object.entries(line.attributes)
                              .map(([name, value]) => `${name}: ${value}`)
                              .join(' · ')}
                          </p>
                        )}
                        {!line.purchasable && (
                          <p
                            className="mt-1 text-xs font-bold tracking-wide"
                            style={{ fontFamily: MONO, color: '#FF6B6B' }}
                          >
                            OUT OF STOCK
                          </p>
                        )}
                      </div>
                      <p
                        className="whitespace-nowrap text-sm font-bold text-white"
                        style={{ fontFamily: MONO }}
                      >
                        {formatPrice(line.unitPrice * line.quantity)}
                      </p>
                    </div>

                    <CartLineControls
                      productId={line.productId}
                      variationId={line.variationId}
                      quantity={line.quantity}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full lg:w-80 lg:flex-shrink-0" style={{ border: '1px solid #444444' }}>
              <div className="flex flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
                    SUBTOTAL
                  </span>
                  <span className="text-lg font-bold text-white" style={{ fontFamily: MONO }}>
                    {formatPrice(resolved.subtotal)}
                  </span>
                </div>
                <p className="text-xs text-[#999999]" style={{ fontFamily: MONO }}>
                  Shipping and any remaining total are calculated at checkout.
                </p>

                {hasPurchasableLines ? (
                  <Link
                    href={checkoutHref}
                    className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
                  >
                    PROCEED TO CHECKOUT
                  </Link>
                ) : (
                  <span
                    className="flex h-12 w-full cursor-not-allowed items-center justify-center text-xs tracking-[0.1em] uppercase"
                    style={{ backgroundColor: '#444444', color: '#999999', fontFamily: MONO }}
                  >
                    PROCEED TO CHECKOUT
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
