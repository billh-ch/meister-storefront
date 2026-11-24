'use client'
import type { ChosenAddon } from '@/lib/addons/contract'
import { formatPrice } from '@/lib/mock-data'

/** One line per chosen add-on under a cart item, with its current price. */
export default function AddonLines({ addons, className }: { addons: ChosenAddon[] | undefined; className?: string }) {
  if (!addons?.length) return null
  return (
    <ul className={className} data-cart-addons>
      {addons.map((addon) => (
        <li key={addon.ref}>+ {addon.optionName} ({formatPrice(addon.priceCents / 100)})</li>
      ))}
    </ul>
  )
}
