'use client'

import Image from 'next/image'
import { type Product, formatPrice } from '@/lib/mock-data'

interface ProductCardProps {
  product: Product
  onAddToCart?: (productId: string) => void
}

/**
 * Product card — faithful to Framer design:
 * - Fixed height 575px
 * - Diagonal SVG hatching background (via .hatching-bg CSS class)
 * - Image area: ~85% of card height
 * - Footer: product name + options + price (left 80%) + gold ADD button (right 20%)
 * - Border: 1px solid #222222
 * - Color swatches: grey #969696, orange #E8510C, red #FF0000
 *
 * Must be "use client" because of onClick handler.
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
      {/* Image area — ~85% height */}
      <div className="relative flex-1 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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

      {/* Footer row — 1px top border, dark background */}
      <footer
        className="flex items-stretch"
        style={{
          borderTop: '1px solid #222222',
          backgroundColor: '#1B1B18',
          height: '88px',
        }}
      >
        {/* Left: name + swatches + price (80%) */}
        <div
          className="flex flex-col justify-center gap-1.5 overflow-hidden px-3 py-2"
          style={{ width: '80%' }}
        >
          {/* Product name */}
          <h2
            className="truncate text-sm font-bold text-white"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            {product.name}
          </h2>

          {/* Swatches + options */}
          <div className="flex items-center gap-2">
            {product.swatches.map((color) => (
              <span
                key={color}
                className="inline-block h-3.5 w-3.5 flex-shrink-0"
                style={{
                  backgroundColor: color,
                  borderRadius: '200px',
                }}
                aria-label={`Colour ${color}`}
              />
            ))}
            <span
              className="truncate text-xs text-[#969696]"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              {product.options}
            </span>
          </div>

          {/* Price */}
          <p
            className="text-sm font-bold text-[#FFD700]"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            {formatPrice(product.price)}
          </p>
        </div>

        {/* Right: ADD button (20%) */}
        <button
          className="btn-gold flex flex-shrink-0 items-center justify-center text-xs font-bold tracking-wider uppercase"
          style={{
            width: '20%',
            borderLeft: '1px solid #222222',
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
