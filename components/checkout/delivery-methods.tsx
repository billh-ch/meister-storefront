import type { ShippingMethod } from '@/lib/woocommerce'
import { formatPrice } from '@/lib/mock-data'

const MONO = 'var(--font-space-mono), monospace'

interface DeliveryMethodsProps {
  methods: ShippingMethod[]
  selectedId: string
  onSelect: (id: string) => void
}

/** Radio group of whatever delivery methods WooCommerce actually returns for
 *  the shopper's country/cart (`getShippingMethods`, `lib/woocommerce/index.ts`)
 *  — a courier flat rate, free shipping once eligible, in-store pickup, or
 *  any future method (e.g. a BoxNow locker) an admin adds in WooCommerce.
 *  Nothing here hardcodes which methods exist; only `isPickup` gets a
 *  distinct icon/label treatment. */
export default function DeliveryMethods({ methods, selectedId, onSelect }: DeliveryMethodsProps) {
  if (methods.length === 0) {
    return (
      <p className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
        No delivery method is available for this country yet — try a different
        address or contact us.
      </p>
    )
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-xs font-bold tracking-wide text-white uppercase" style={{ fontFamily: MONO }}>
        Delivery method
      </legend>
      {methods.map((method) => (
        <label
          key={method.id}
          className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm text-white"
          style={{
            border: `1px solid ${selectedId === method.id ? '#FFD700' : '#444444'}`,
            fontFamily: MONO,
          }}
        >
          <span className="flex items-center gap-2">
            <input
              type="radio"
              name="deliveryMethod"
              value={method.id}
              checked={selectedId === method.id}
              onChange={() => onSelect(method.id)}
              required
              className="accent-[#FFD700]"
            />
            {method.title}
            {method.isPickup && (
              <span className="text-[10px] tracking-wide text-[#999999] uppercase">Pickup</span>
            )}
          </span>
          <span className="whitespace-nowrap text-[#CCCCCC]">
            {method.cost === 0 ? 'FREE' : formatPrice(method.cost)}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
