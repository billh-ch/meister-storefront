'use client'

import { useId, useState, useTransition } from 'react'
import QuantityStepper from '@/components/product/quantity-stepper'
import { removeFromCartAction, updateQuantityAction } from '@/lib/cart/actions'
import { notifyCartUpdated } from '@/lib/cart/client-events'

interface CartLineControlsProps {
  productId: string
  variationId?: string
  /** Carried back into the cart actions so they address this exact line —
   *  two lines can share a `variationId` but differ on "Any …" axis picks. */
  selectedOptions?: Record<string, string>
  quantity: number
  onPendingChange?: (pending: boolean) => void
}

const MONO = 'var(--font-space-mono), monospace'

export default function CartLineControls({
  productId,
  variationId,
  selectedOptions,
  quantity,
  onPendingChange,
}: CartLineControlsProps) {
  const [isPending, startTransition] = useTransition()
  const stepperId = useId()
  const [error, setError] = useState('')

  const mutate = (action: () => ReturnType<typeof updateQuantityAction>) => {
    setError('')
    onPendingChange?.(true)
    startTransition(async () => {
      try {
        const result = await action()
        if (result.ok) notifyCartUpdated()
        else setError(result.error)
      } catch {
        setError('Could not update your cart. Please try again.')
      } finally {
        onPendingChange?.(false)
      }
    })
  }

  const handleQuantityChange = (next: number) => {
    mutate(() => updateQuantityAction({ productId, variationId, selectedOptions, quantity: next }))
  }

  const handleRemove = () => {
    mutate(() => removeFromCartAction({ productId, variationId, selectedOptions }))
  }

  return (
    <fieldset
      disabled={isPending}
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
      {error && <p role="alert" className="w-full text-xs" style={{ color: 'var(--color-gold)', fontFamily: MONO }}>{error}</p>}
    </fieldset>
  )
}
