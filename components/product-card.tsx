'use client'

import Image from 'next/image'
import Link from 'next/link'
import { type Product, type StockStatus, formatPrice } from '@/lib/mock-data'

interface ProductCardProps {
  product: Product
  onAddToCart?: (productId: string) => void
}

/**
 * Product card — responsive version:
 * - Image area is square, so height follows whatever width the
 *   parent grid/carousel slide gives it instead of a fixed pixel height
 * - Footer adapts text size on smaller screens
 * - Touch-friendly ADD button
 */
const MONO = 'var(--font-space-mono), monospace'

/**
 * Shown instead of `next/image` when WooCommerce has no photo for a product.
 * Matches the gallery's own empty state (`product/product-gallery.tsx`) so the
 * two read as one treatment, and names the product so the tile still says what
 * it is rather than looking like a failed image load.
 */
function ImagePlaceholder({ productName }: { productName: string }) {
  return (
    <div className="hatching-bg absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="text-xs tracking-widest text-[#999999]" style={{ fontFamily: MONO }}>
        NO IMAGE AVAILABLE
      </span>
      <span className="text-[10px] text-[#666666]" style={{ fontFamily: MONO }}>
        {productName}
      </span>
    </div>
  )
}

/** Badge copy per stock status. `instock` gets none. */
const STOCK_BADGES: Record<StockStatus, string | null> = {
  instock: null,
  outofstock: 'OUT OF STOCK',
  onbackorder: 'BACKORDER',
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

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const handleAddToCart = () => {
    onAddToCart?.(product.id)
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
      {/* Image area — square, which with the 72px footer below makes the card
          itself taller than it is wide (a 576px desktop slide → 576px image +
          72px footer = 648px card). 8:7 here left the whole card square; 4:5
          overshot into a card half again as tall as it was wide. */}
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-square overflow-hidden"
        aria-label={`View ${product.name}`}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            priority={false}
          />
        ) : (
          <ImagePlaceholder productName={product.name} />
        )}
        {/* Subtle overlay to keep text legible */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(27,27,24,0.6) 100%)' }}
          aria-hidden="true"
        />

        {/* Badges — SALE leads, since it's the one a shopper acts on */}
        {(product.onSale || stockBadge) && (
          <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
            {product.onSale && <Badge label="SALE" tone="gold" />}
            {stockBadge && <Badge label={stockBadge} tone="muted" />}
          </div>
        )}
      </Link>

      {/* Footer row — responsive height */}
      <footer
        className="flex items-stretch"
        style={{
          borderTop: '1px solid #FFFFFF',
          backgroundColor: '#1B1B18',
          minHeight: '72px',
        }}
      >
        {/* Left: name + swatches + price (80%) */}
        <Link
          href={`/products/${product.slug}`}
          className="flex flex-col justify-center gap-1 overflow-hidden px-3 py-2"
          style={{ width: '80%' }}
        >
          {/* Product name */}
          <h2
            className="truncate text-xs font-bold text-white sm:text-sm"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            {product.name}
          </h2>

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

        {/* Right: ADD button (20%) — min-width for touch target */}
        <button
          // `.btn-gold:disabled` in globals.css already greys it out and sets
          // the not-allowed cursor, so there's nothing to override here.
          className="btn-gold flex flex-shrink-0 cursor-pointer items-center justify-center text-sm font-bold tracking-wider uppercase sm:text-base"
          style={{
            width: '20%',
            minWidth: '44px',
            borderLeft: '1px solid #FFFFFF',
          }}
          onClick={handleAddToCart}
          disabled={isSoldOut}
          aria-label={
            isSoldOut
              ? `${product.name} is out of stock`
              : `Add ${product.name} to cart`
          }
        >
          {isSoldOut ? '—' : 'ADD'}
        </button>
      </footer>
    </article>
  )
}
