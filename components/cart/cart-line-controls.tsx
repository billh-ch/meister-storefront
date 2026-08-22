'use client'

import { useTransition } from 'react'
import QuantityStepper from '@/components/product/quantity-stepper'
import { removeFromCartAction, updateQuantityAction } from '@/lib/cart/actions'
import { notifyCartUpdated } from '@/lib/cart/client-events'

interface CartLineControlsProps {
  productId: string
  variationId?: string
  quantity: number
}

const MONO = 'var(--font-space-mono), monospace'

export default function CartLineControls({
  productId,
  variationId,
  quantity,
}: CartLineControlsProps) {
  const [isPending, startTransition] = useTransition()
  const stepperId = `cart-qty-${productId}-${variationId ?? 'simple'}`

  const handleQuantityChange = (next: number) => {
    startTransition(async () => {
      await updateQuantityAction({ productId, variationId, quantity: next })
      notifyCartUpdated()
    })
  }

  const handleRemove = () => {
    startTransition(async () => {
      await removeFromCartAction({ productId, variationId })
      notifyCartUpdated()
    })
  }

  return (
    <div
      className="flex flex-wrap items-center gap-4"
      style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 150ms' }}
    >
      <QuantityStepper id={stepperId} value={quantity} onChange={handleQuantityChange} />
      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        className="text-xs text-[#999999] underline transition-colors hover:text-[#FF6B6B] disabled:cursor-not-allowed"
        style={{ fontFamily: MONO }}
      >
        Remove
      </button>
    </div>
  )
}
