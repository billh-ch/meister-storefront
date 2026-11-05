'use client'
import { useTranslation } from '@/components/i18n/locale-provider'
import type { PromotionQuote } from '@/lib/promotions/schema'
import type { ResolvedCartLine } from '@/lib/cart/resolve'
import { cartLineKey } from '@/lib/cart/line-key'
import { formatVariationLabel } from '@/lib/cart/variation-label'
import { formatPrice } from '@/lib/mock-data'

const MONO = 'var(--font-space-mono), monospace'

interface OrderSummaryProps {
  lines: ResolvedCartLine[]
  subtotal: number
  /** `undefined` when no delivery method is selected yet (or none exists
   *  for the country) — shown as "—" rather than a misleading €0. */
  promotionQuote?: PromotionQuote | null
  totalsPending?: boolean
  shippingCost?: number
}

/** The cart-lines + subtotal/shipping/total sidebar on `/checkout`. Moved out
 *  of `app/checkout/page.tsx` into a component `CheckoutForm` renders
 *  alongside itself, because shipping cost now depends on the delivery
 *  method the shopper picks in that same form — a plain server-rendered
 *  total can't react to that; this can, since its parent owns the selection
 *  state and passes the resolved cost down as a prop each render. */
export default function OrderSummary({ lines, subtotal, shippingCost, promotionQuote, totalsPending }: OrderSummaryProps) {
  const t = useTranslation()

  const total = promotionQuote ? promotionQuote.total / 100 : subtotal + (shippingCost ?? 0)
  if (promotionQuote) { subtotal = promotionQuote.subtotal / 100; shippingCost = promotionQuote.shipping / 100 }

  return (
    <div className="w-full lg:w-80 lg:flex-shrink-0" style={{ border: '1px solid #444444' }}>
      <div className="flex flex-col gap-3 p-4">
        {(promotionQuote ? promotionQuote.lines.map(line => ({ ...line, slug: '', image: '', unitPrice: line.subtotal / 100 / line.quantity, attributes: line.attributes })) : lines).map((line) => (
          <div
            key={'key' in line ? line.key as string : cartLineKey(line)}
            className="flex items-start justify-between gap-3 text-xs"
            style={{ fontFamily: MONO }}
          >
            <span className="flex min-w-0 flex-col text-[#CCCCCC]">
              <span>
                {line.quantity} × {line.name}
              </span>
              {Object.keys(line.attributes).length > 0 && (
                <span className="mt-0.5 text-[#999999]">{formatVariationLabel(line.attributes, ' · ', t)}</span>
              )}
            </span>
            <span className="whitespace-nowrap text-white">{formatPrice(line.unitPrice * line.quantity)}</span>
          </div>
        ))}

        <div
          className="flex items-center justify-between pt-2 text-xs"
          style={{ fontFamily: MONO, borderTop: '1px solid #222222', color: '#999999' }}
        >
          <span>{t("SUBTOTAL")}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {promotionQuote && promotionQuote.discount > 0 && <div className="flex items-center justify-between gap-3 text-xs text-[#FFD700]"><span>{t(promotionQuote.promotion?.type === 'bundle' ? 'Bundle saving' : 'Coupon saving')}{promotionQuote.promotion?.label ? ` · ${promotionQuote.promotion.label}` : ''}</span><span>−{formatPrice(promotionQuote.discount / 100)}</span></div>}
        <div className="flex items-center justify-between text-xs" style={{ fontFamily: MONO, color: '#999999' }}>
          <span>{t("SHIPPING")}</span>
          <span>
            {shippingCost === undefined ? '—' : shippingCost === 0 ? t("FREE") : formatPrice(shippingCost)}
          </span>
        </div>
        <div
          className="flex items-center justify-between pt-2 text-base font-bold"
          style={{ fontFamily: MONO, borderTop: '1px solid #444444' }}
        >
          <span className="text-white">{t("TOTAL")}</span>
          <span className="text-[#FFD700]">{totalsPending ? '—' : shippingCost === undefined ? t("Pending delivery") : formatPrice(total)}</span>
        </div>
        {promotionQuote && <p className="text-[10px] text-white/60">{t('Delivery is charged separately. Applicable taxes are included.')}</p>}
      </div>
    </div>
  )
}
