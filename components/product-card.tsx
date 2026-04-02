'use client'

import Image from 'next/image'
import { type Product, formatPrice } from '@/lib/mock-data'

interface ProductCardProps {
  product: Product
  onAddToCart?: (productId: string) => void
}

/**
 * Product card — responsive version:
 * - Scales from ~400px on mobile to 575px on desktop
 * - Footer adapts text size on smaller screens
 * - Touch-friendly ADD button
 */
export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const handleAddToCart = () => {
    onAddToCart?.(product.id)
  }

  return (
    <article
      className="hatching-bg relative flex h-full w-full flex-col overflow-hidden"
      style={{ border: '1px solid #222222', minHeight: '575px' }}
      aria-label={`${product.name}, ${formatPrice(product.price)}`}
    >
      {/* Image area — flexible height */}
      <div className="relative flex-1 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          priority={false}
        />
        {/* Subtle overlay to keep text legible */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(27,27,24,0.6) 100%)' }}
          aria-hidden="true"
        />
      </div>

      {/* Footer row — responsive height */}
      <footer
        className="flex items-stretch"
        style={{
          borderTop: '1px solid #222222',
          backgroundColor: '#FFFFFF',
          minHeight: '72px',
        }}
      >
        {/* Left: name + swatches + price (80%) */}
        <div
          className="flex flex-col justify-center gap-1 overflow-hidden px-3 py-2"
          style={{ width: '80%' }}
        >
          {/* Product name */}
          <h2
            className="truncate text-xs font-bold text-[#1B1B18] sm:text-sm"
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
              className="truncate text-[10px] text-[#666666] sm:text-xs"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              {product.options}
            </span>
          </div>

          {/* Price */}
          <p
            className="text-xs font-bold text-[#1B1B18] sm:text-sm"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            {formatPrice(product.price)}
          </p>
        </div>

        {/* Right: ADD button (20%) — min-width for touch target */}
        <button
          className="btn-gold flex flex-shrink-0 cursor-pointer items-center justify-center text-[10px] font-bold tracking-wider uppercase sm:text-xs"
          style={{
            width: '20%',
            minWidth: '44px',
            borderLeft: '1px solid #E0E0E0',
          }}
          onClick={handleAddToCart}
          aria-label={`Add ${product.name} to cart`}
        >
          ADD
        </button>
      </footer>
    </article>
  )
}
