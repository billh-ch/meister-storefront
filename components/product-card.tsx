'use client'

import WishlistButton from './wishlist/button'
import ProductCardImages from './product-card-images'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { type Product, type StockStatus, formatPrice } from '@/lib/mock-data'
import { addToCartAction } from '@/lib/cart/actions'
import { notifyCartAdded } from '@/lib/cart/client-events'

interface ProductCardProps {
  product: Product
}

/**
 * Product card — responsive version:
 * - Image area is square, so height follows whatever width the
 *   parent grid/carousel slide gives it instead of a fixed pixel height
 * - Footer adapts text size on smaller screens
 * - Touch-friendly ADD button
 */
const MONO = 'var(--font-space-mono), monospace'

/** Only unavailable stock gets a card badge; backorders remain purchasable. */
const STOCK_BADGES: Record<StockStatus, string | null> = {
  instock: null,
  outofstock: 'OUT OF STOCK',
  onbackorder: null,
}

function Badge({ label, tone }: { label: string; tone: 'gold' | 'muted' }) {
  return (
    <span
      className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase"
      style={{
        fontFamily: MONO,
        backgroundColor: tone === 'gold' ? 'var(--color-gold)' : 'var(--color-dark)',
        color: tone === 'gold' ? 'var(--color-dark)' : 'var(--color-foreground)',
        border: tone === 'gold' ? 'none' : '1px solid var(--color-foreground)',
      }}
    >
      {label}
    </span>
  )
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isPending, startTransition] = useTransition()
  const [justAdded, setJustAdded] = useState(false)
  const [error, setError] = useState('')

  const handleAddToCart = () => {
    setError('')
    startTransition(async () => {
      const result = await addToCartAction({ productId: product.id, quantity: 1 })
      if (result.ok) {
        setJustAdded(true)
        notifyCartAdded(product.name, 1, product.image)
        setTimeout(() => setJustAdded(false), 1500)
      } else {
        setError(result.error)
        setTimeout(() => setError(''), 2000)
      }
    })
  }

  const stockBadge = STOCK_BADGES[product.stockStatus]
  // Backorder stays purchasable — that is what the WooCommerce setting means,
  // and refusing the order would turn 13 sellable products into dead cards.
  const isSoldOut = product.stockStatus === 'outofstock'

  return (
    <article
      className="hatching-bg relative flex h-full w-full flex-col overflow-hidden"
      style={{ border: '1px solid #FFFFFF' }}
      aria-label={`${product.name}, ${formatPrice(product.price)}`}
    >
      <ProductCardImages product={product}>
        <WishlistButton id={product.id} name={product.name} card />
        {/* Badges — SALE leads, since it's the one a shopper acts on */}
        {(product.onSale || stockBadge) && (
          <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
            {product.onSale && <Badge label="SALE" tone="gold" />}
            {stockBadge && <Badge label={stockBadge} tone="muted" />}
          </div>
        )}
      </ProductCardImages>

      {/* Footer row — responsive height */}
      <footer
        className="flex flex-col"
        style={{
          borderTop: '1px solid #FFFFFF',
          backgroundColor: '#1B1B18',
          minHeight: '72px',
        }}
      >
        {/* Product details have the full width, including long option labels. */}
        <Link
          href={`/products/${product.slug}`}
          className="flex min-w-0 flex-col justify-center gap-1 overflow-hidden px-3 py-3"
        >
          {/* Product name */}
          <h3
            className="truncate text-xs font-bold text-white sm:text-sm"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            {product.name}
          </h3>

          {/* Swatches + options */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {product.swatches.map((color) => (
              <span
                key={color}
                className="inline-block h-3 w-3 flex-shrink-0 sm:h-3.5 sm:w-3.5"
                style={{
                  backgroundColor: color,
                  borderRadius: '200px',
                }}
                aria-label={`Colour ${color}`}
              />
            ))}
            <span
              className="truncate text-[10px] text-[#A0A0A0] sm:text-xs"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              {product.options}
            </span>
          </div>

          {/* Price */}
          <p
            className="text-xs font-bold text-white sm:text-sm"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            {product.priceFrom ? `From ${formatPrice(product.price)}` : formatPrice(product.price)}
          </p>
        </Link>

        {/* Full-width action — readable labels and a 44px touch target.
            Variable products (real size/attribute choices) have no room for
            a picker here — the PDP already owns that selector, so the card
            just routes there instead of pretending to add anything. */}
        {product.type === 'variable' ? (
          <Link
            href={`/products/${product.slug}`}
            className="btn-gold flex min-h-11 w-full items-center justify-center px-3 py-2 text-center text-xs font-bold tracking-wider uppercase"
            style={{
              borderTop: '1px solid #FFFFFF',
            }}
            aria-label={`Choose options for ${product.name}`}
          >
            SELECT OPTIONS
          </Link>
        ) : (
          <button
            // `.btn-gold:disabled` in globals.css already greys it out and sets
            // the not-allowed cursor, so there's nothing to override here.
            className="btn-gold flex min-h-11 w-full cursor-pointer items-center justify-center px-3 py-2 text-xs font-bold tracking-wider uppercase"
            style={{
              borderTop: '1px solid #FFFFFF',
            }}
            onClick={handleAddToCart}
            disabled={isSoldOut || isPending}
            aria-label={
              isSoldOut
                ? `${product.name} is out of stock`
                : error
                  ? error
                  : justAdded
                    ? `${product.name} added to cart`
                    : `Add ${product.name} to cart`
            }
          >
            {isSoldOut ? 'OUT OF STOCK' : isPending ? 'ADDING…' : justAdded ? 'ADDED TO CART' : 'ADD TO CART'}
          </button>
        )}
      </footer>
      <p className="sr-only" role="status">
        {error || (justAdded ? `${product.name} added to cart` : '')}
      </p>
      {error && (
        <p className="px-3 py-2 text-xs" style={{ color: 'var(--color-gold)', fontFamily: MONO }}>
          {error}
        </p>
      )}
    </article>
  )
}
