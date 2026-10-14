import { getTranslator } from '@/lib/i18n/server'
import { getLocale } from '@/lib/i18n/server'
import { localePath, translate } from '@/lib/i18n'
import type { Metadata } from 'next'
import Link from '@/components/i18n/localized-link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import SimpleBreadcrumbs from '@/components/collection/simple-breadcrumbs'
import CheckoutForm from '@/components/checkout/checkout-form'
import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'
import { getSession } from '@/lib/auth/session'
import { getWcCustomerById } from '@/lib/woocommerce'
import { toAddressInput } from '@/lib/address/map-address'
import { quoteResolvedCart } from '@/lib/checkout/shipping'
import { checkoutCartIssues, checkoutCartSignature, type ShippingQuote } from '@/lib/checkout/model'
import CheckoutCartIssues from '@/components/checkout/cart-issues'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

export async function generateMetadata(): Promise<Metadata> { return {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  title: translate(await getLocale(), 'Checkout — Meister'),
} }

/**
 * Open to guests — no sign-in gate. A logged-in shopper gets their saved
 * address prefilled and their order attached to their account; a guest fills
 * in an extra email field (see `CheckoutForm`) and gets a WooCommerce guest
 * order. The Server Action (`lib/checkout/actions.ts`) enforces the same
 * split server-side.
 */
export default async function CheckoutPage() {
  const t = await getTranslator()

  const locale = await getLocale()
  const [cart, session] = await Promise.all([getCart(), getSession()])
  const isGuest = !session.wcCustomerId
  const resolvedCart = await resolveCartItems(cart).catch(() => null)
  const cartUnavailable = resolvedCart === null
  const resolved = resolvedCart ?? { lines: [], unavailableCount: 0, subtotal: 0 }

  // Best-effort — a WooCommerce read failure here must never block checkout,
  // only skip the prefill.
  const customer = session.wcCustomerId
    ? await getWcCustomerById(session.wcCustomerId).catch(() => null)
    : null
  const initialAddress =
    customer?.shipping && customer.shipping.address_1 ? toAddressInput(customer.shipping) : undefined

  const isEmpty = resolved.lines.length === 0
  const hasChanged = resolved.unavailableCount > 0 || resolved.lines.some((line) => !line.purchasable)

  // Best-effort here too — a shipping lookup failure shouldn't block
  // rendering the page; the form's own country-change refetch (and the
  // server action's re-validation at submit time) can recover from it.
  const initialQuote: ShippingQuote = cartUnavailable || isEmpty || hasChanged
    ? { status: 'cart', error: 'Your saved cart needs attention before delivery can be calculated.', issues: checkoutCartIssues(resolved) }
    : await quoteResolvedCart(
        resolved,
        {
          country: initialAddress?.country ?? 'GR',
          city: initialAddress?.city,
          postcode: initialAddress?.postcode,
          address1: initialAddress?.address1,
        },
      )

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
          {t("CHECKOUT")}
        </h1>

        {cartUnavailable ? (
          <div role="alert" className="flex flex-col gap-3 border border-[#FF6B6B]/50 p-4 text-sm text-white">
            <p>{t("Could not verify your cart. Your saved items are still there. Please try again.")}</p>
            {/* A full reload rechecks WooCommerce and replaces any stale checkout client. */}
                        <a href={localePath("/checkout", locale)} className="inline-flex min-h-11 items-center text-[#FFD700] underline">{t("Retry checkout")}</a>
          </div>
        ) : isEmpty ? (
          <div
            className="hatching-bg flex flex-col items-center justify-center gap-4 py-24 text-center"
            style={{ border: '1px solid #444444' }}
          >
            <p className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
              {t("YOUR CART IS EMPTY")}
            </p>
            <Link href="/shop" className="btn-gold px-6 py-3 text-xs tracking-[0.1em] uppercase">
              {t("BROWSE PRODUCTS")}
            </Link>
          </div>
        ) : hasChanged ? (
          <div
            className="flex flex-col items-center justify-center gap-4 py-24 text-center"
            style={{ border: '1px solid #444444' }}
          >
            <CheckoutCartIssues error="Your saved cart needs attention before delivery can be calculated." issues={checkoutCartIssues(resolved)} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {isGuest && (
              <p className="text-xs text-[#999999]" style={{ fontFamily: MONO }}>
                {t("Have an account?")}{' '}
                <Link href="/sign-in?redirect_url=/checkout" className="text-[#FFD700] hover:underline">
                  {t("Sign in")}
                </Link>{' '}
                {t("for faster checkout, or just continue below.")}
              </p>
            )}
            <CheckoutForm
              boxNowPartnerId={process.env.BOX_NOW_PARTNER_ID}
              key={checkoutCartSignature(resolved.lines)}
              initialAddress={initialAddress}
              isGuest={isGuest}
              lines={resolved.lines}
              subtotal={resolved.subtotal}
              initialQuote={initialQuote}
            />
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
