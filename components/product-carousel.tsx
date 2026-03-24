'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'
import ProductCard from './product-card'
import { type Product } from '@/lib/mock-data'

interface ProductCarouselProps {
  products: Product[]
}

function useSlideWidth() {
  const [slideWidth, setSlideWidth] = useState('33.333%')

  useEffect(() => {
    function update() {
      if (window.innerWidth < 640) {
        setSlideWidth('100%')
      } else if (window.innerWidth < 1024) {
        setSlideWidth('50%')
      } else {
        setSlideWidth('33.333%')
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return slideWidth
}

export default function ProductCarousel({ products }: ProductCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    slidesToScroll: 1,
  })

  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(true)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      setCanScrollPrev(emblaApi.canScrollPrev())
      setCanScrollNext(emblaApi.canScrollNext())
    }
    emblaApi.on('select', onSelect)
    onSelect()
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi])

  const slideWidth = useSlideWidth()

  return (
    <section
      className="w-full py-16"
      style={{ backgroundColor: '#1B1B18' }}
      aria-label="Most wanted products"
    >
      {/* Section header */}
      <div className="mb-8 flex items-center justify-between px-6 md:px-10">
        <h2
          className="text-3xl text-white md:text-5xl"
          style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
        >
          MOST WANTED
        </h2>

        {/* VIEW ALL button — thick yellow border, dark bg, white text */}
        <a
          href="/shop"
          className="hidden items-center justify-center px-8 py-3 text-xs font-bold tracking-wider text-white uppercase transition-opacity hover:opacity-80 sm:flex"
          style={{
            border: '3px solid #FFD700',
            backgroundColor: '#1B1B18',
            fontFamily: 'var(--font-space-mono), monospace',
          }}
        >
          VIEW ALL
        </a>
      </div>

      {/* Carousel with arrows inside */}
      <div className="relative">
        {/* Embla viewport */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex" style={{ touchAction: 'pan-y' }}>
            {products.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0"
                style={{ width: slideWidth }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        {/* Left arrow — inside the slider */}
        <button
          onClick={scrollPrev}
          className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-[#444444] bg-[#1B1B18]/80 text-white backdrop-blur-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700] disabled:opacity-30"
          aria-label="Show previous products"
          disabled={!canScrollPrev}
        >
          <ChevronLeft />
        </button>

        {/* Right arrow — inside the slider */}
        <button
          onClick={scrollNext}
          className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-[#444444] bg-[#1B1B18]/80 text-white backdrop-blur-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700] disabled:opacity-30"
          aria-label="Show next products"
          disabled={!canScrollNext}
        >
          <ChevronRight />
        </button>
      </div>
    </section>
  )
}

function ChevronLeft() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
