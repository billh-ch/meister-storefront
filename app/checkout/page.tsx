import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import SimpleBreadcrumbs from '@/components/collection/simple-breadcrumbs'
import CheckoutForm from '@/components/checkout/checkout-form'
import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'
import { FLAT_SHIPPING_RATE, FREE_SHIPPING_THRESHOLD, formatPrice } from '@/lib/mock-data'
import { getSession } from '@/lib/auth/session'
import { getWcCustomerById } from '@/lib/woocommerce'
import { toAddressInput } from '@/lib/address/map-address'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

export const metadata: Metadata = {
  title: 'Checkout — Meister',
}

/** Protected by `proxy.ts` — reaching this render guarantees a signed-in session. */
export default async function CheckoutPage() {
  const [cart, session] = await Promise.all([getCart(), getSession()])
  const resolved = await resolveCartItems(cart)

  // Best-effort — a WooCommerce read failure here must never block checkout,
  // only skip the prefill.
  const customer = session.wcCustomerId
    ? await getWcCustomerById(session.wcCustomerId).catch(() => null)
    : null
  const initialAddress =
    customer?.shipping && customer.shipping.address_1 ? toAddressInput(customer.shipping) : undefined

  const isEmpty = resolved.lines.length === 0
  const hasChanged = resolved.unavailableCount > 0 || resolved.lines.some((line) => !line.purchasable)
  const shipping = resolved.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE
  const total = resolved.subtotal + shipping

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />
      <SimpleBreadcrumbs
        items={[{ label: 'HOME', href: '/' }, { label: 'CART', href: '/cart' }, { label: 'CHECKOUT' }]}
      />

      <div className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 md:px-10">
        <h1
          className="mb-6 text-2xl text-white sm:text-3xl md:text-4xl"
          style={{ fontFamily: DISPLAY, fontWeight: 800 }}
        >
          CHECKOUT
        </h1>

        {isEmpty ? (
          <div
            className="hatching-bg flex flex-col items-center justify-center gap-4 py-24 text-center"
            style={{ border: '1px solid #444444' }}
          >
            <p className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
              YOUR CART IS EMPTY
            </p>
            <Link href="/shop" className="btn-gold px-6 py-3 text-xs tracking-[0.1em] uppercase">
              BROWSE PRODUCTS
            </Link>
          </div>
        ) : hasChanged ? (
          <div
            className="flex flex-col items-center justify-center gap-4 py-24 text-center"
            style={{ border: '1px solid #444444' }}
          >
            <p className="text-sm" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
              Your cart has changed since you last viewed it — please review it before checking out.
            </p>
            <Link href="/cart" className="btn-gold px-6 py-3 text-xs tracking-[0.1em] uppercase">
              REVIEW CART
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex-1">
              <CheckoutForm initialAddress={initialAddress} />
            </div>

            <div className="w-full lg:w-80 lg:flex-shrink-0" style={{ border: '1px solid #444444' }}>
              <div className="flex flex-col gap-3 p-4">
                {resolved.lines.map((line) => (
                  <div
                    key={`${line.productId}:${line.variationId ?? ''}`}
                    className="flex items-start justify-between gap-3 text-xs"
                    style={{ fontFamily: MONO }}
                  >
                    <span className="text-[#CCCCCC]">
                      {line.quantity} × {line.name}
                    </span>
                    <span className="whitespace-nowrap text-white">
                      {formatPrice(line.unitPrice * line.quantity)}
                    </span>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2 text-xs" style={{ fontFamily: MONO, borderTop: '1px solid #222222', color: '#999999' }}>
                  <span>SUBTOTAL</span>
                  <span>{formatPrice(resolved.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs" style={{ fontFamily: MONO, color: '#999999' }}>
                  <span>SHIPPING</span>
                  <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 text-base font-bold" style={{ fontFamily: MONO, borderTop: '1px solid #444444' }}>
                  <span className="text-white">TOTAL</span>
                  <span className="text-[#FFD700]">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
