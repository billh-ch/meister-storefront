'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addToCartAction } from '@/lib/cart/actions'
import { notifyCartUpdated } from '@/lib/cart/client-events'
import { formatPrice, type Product } from '@/lib/mock-data'

interface CartRecommendationsProps {
  productIds: string[]
  disabled?: boolean
  onPendingChange?: (pending: boolean) => void
  onNavigate?: () => void
}

export default function CartRecommendations({ productIds, disabled = false, onPendingChange, onNavigate }: CartRecommendationsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const headingId = useId()
  const cartKey = JSON.stringify([...new Set(productIds)].sort())

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/cart/recommendations', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : [])
      .then((next: Product[]) => { if (!controller.signal.aborted) setProducts(next) })
      .catch(() => { if (!controller.signal.aborted) setProducts([]) })
    return () => controller.abort()
  }, [cartKey])

  const add = (product: Product) => {
    setError('')
    setPendingId(product.id)
    onPendingChange?.(true)
    startTransition(async () => {
      try {
        const result = await addToCartAction({ productId: product.id, quantity: 1 })
        if (result.ok) {
          setProducts(current => current.filter(item => item.id !== product.id))
          notifyCartUpdated()
          router.refresh()
        } else setError(result.error)
      } catch {
        setError('Could not add this item. Please try again.')
      } finally {
        setPendingId('')
        onPendingChange?.(false)
      }
    })
  }

  const visible = products.filter(product => !productIds.includes(product.id))
  if (visible.length === 0) return null

  return (
    <section aria-label="Cart recommendations" className="mt-6 min-w-0 border-t border-white/20 pt-5" style={{ fontFamily: 'var(--font-space-mono), monospace' }}>
      <h2 id={headingId} className="mb-3 text-sm font-bold text-white">YOU MAY ALSO LIKE</h2>
      <div role="group" aria-label="Suggested products" tabIndex={0} className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory" aria-describedby={headingId}>
        {visible.map(product => (
          <article key={product.id} className="flex w-40 shrink-0 snap-start flex-col border border-white/20 bg-[#1B1B18]">
            <Link href={`/products/${product.slug}`} onClick={onNavigate} className="relative block aspect-square bg-[#222222]" aria-label={`View ${product.name}`}>
              {product.image ? <Image src={product.image} alt={product.name} fill sizes="160px" className="object-cover" /> : <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[#999999]">NO IMAGE AVAILABLE</span>}
            </Link>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <Link href={`/products/${product.slug}`} onClick={onNavigate} className="text-xs font-bold text-white">{product.name}</Link>
              <p className="mt-auto text-xs text-[#FFD700]">{product.priceFrom ? 'From ' : ''}{formatPrice(product.price)}</p>
            </div>
            {product.type === 'variable' ? (
              <Link href={`/products/${product.slug}`} onClick={onNavigate} className="btn-gold flex min-h-11 items-center justify-center px-2 text-center text-[10px]" aria-label={`Choose options for ${product.name}`}>SELECT OPTIONS</Link>
            ) : (
              <button type="button" onClick={() => add(product)} disabled={disabled || isPending} className="btn-gold min-h-11 px-2 text-[10px]" aria-label={`Add ${product.name} to cart`}>
                {pendingId === product.id ? 'ADDING…' : 'ADD TO CART'}
              </button>
            )}
          </article>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-[#FFD700]">{error}</p>}
    </section>
  )
}
