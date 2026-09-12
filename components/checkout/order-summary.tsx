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
  shippingCost?: number
}

/** The cart-lines + subtotal/shipping/total sidebar on `/checkout`. Moved out
 *  of `app/checkout/page.tsx` into a component `CheckoutForm` renders
 *  alongside itself, because shipping cost now depends on the delivery
 *  method the shopper picks in that same form — a plain server-rendered
 *  total can't react to that; this can, since its parent owns the selection
 *  state and passes the resolved cost down as a prop each render. */
export default function OrderSummary({ lines, subtotal, shippingCost }: OrderSummaryProps) {
  const total = subtotal + (shippingCost ?? 0)

  return (
    <div className="w-full lg:w-80 lg:flex-shrink-0" style={{ border: '1px solid #444444' }}>
      <div className="flex flex-col gap-3 p-4">
        {lines.map((line) => (
          <div
            key={cartLineKey(line)}
            className="flex items-start justify-between gap-3 text-xs"
            style={{ fontFamily: MONO }}
          >
            <span className="flex min-w-0 flex-col text-[#CCCCCC]">
              <span>
                {line.quantity} × {line.name}
              </span>
              {Object.keys(line.attributes).length > 0 && (
                <span className="mt-0.5 text-[#999999]">{formatVariationLabel(line.attributes)}</span>
              )}
            </span>
            <span className="whitespace-nowrap text-white">{formatPrice(line.unitPrice * line.quantity)}</span>
          </div>
        ))}

        <div
          className="flex items-center justify-between pt-2 text-xs"
          style={{ fontFamily: MONO, borderTop: '1px solid #222222', color: '#999999' }}
        >
          <span>SUBTOTAL</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-xs" style={{ fontFamily: MONO, color: '#999999' }}>
          <span>SHIPPING</span>
          <span>
            {shippingCost === undefined ? '—' : shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
          </span>
        </div>
        <div
          className="flex items-center justify-between pt-2 text-base font-bold"
          style={{ fontFamily: MONO, borderTop: '1px solid #444444' }}
        >
          <span className="text-white">TOTAL</span>
          <span className="text-[#FFD700]">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  )
}
