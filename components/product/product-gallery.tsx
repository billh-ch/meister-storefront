'use client'

import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'
import type { ProductImage } from '@/lib/mock-data'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
  /**
   * Variant image, when the shopper has picked a combination that has one.
   * Shown in place of the gallery's current slide rather than injected into
   * the strip, so the thumbnail indices never shift under the user.
   */
  activeImage?: string | null
}

const SIZES = '(max-width: 1023px) 100vw, 50vw'
const MONO = 'var(--font-space-mono), monospace'

/** Bare frame shared by all three branches — matches the ProductCard motif. */
function GalleryFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="hatching-bg relative aspect-square w-full overflow-hidden"
      style={{ border: '1px solid #FFFFFF' }}
    >
      {children}
    </div>
  )
}

export default function ProductGallery({
  images,
  productName,
  activeImage = null,
}: ProductGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' })
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  )
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  // --- Branch 1: no images at all ---
  if (images.length === 0) {
    return (
      <GalleryFrame>
        <div
          className="absolute inset-0 flex items-center justify-center text-sm text-[#999999]"
          style={{ fontFamily: MONO }}
        >
          NO IMAGE AVAILABLE
        </div>
      </GalleryFrame>
    )
  }

  // --- Branch 2: a single image needs no carousel, dots, or thumbnails ---
  if (images.length === 1) {
    return (
      <GalleryFrame>
        <Image
          src={activeImage ?? images[0].src}
          alt={images[0].alt || productName}
          fill
          sizes={SIZES}
          className="object-cover"
          preload
        />
      </GalleryFrame>
    )
  }

  // --- Branch 3: full gallery ---
  return (
    <div>
      <div className="relative">
        <GalleryFrame>
          <div className="absolute inset-0 overflow-hidden" ref={emblaRef}>
            <div className="flex h-full" style={{ touchAction: 'pan-y pinch-zoom' }}>
              {images.map((image, index) => (
                <div
                  key={`${image.src}-${index}`}
                  className="relative h-full w-full flex-shrink-0"
                >
                  <Image
                    // The variant image replaces only the slide in view, so
                    // thumbnail positions stay stable while browsing.
                    src={index === selectedIndex && activeImage ? activeImage : image.src}
                    alt={image.alt || `${productName} — image ${index + 1}`}
                    fill
                    sizes={SIZES}
                    className="object-cover"
                    preload={index === 0}
                    loading={index === 0 ? undefined : 'lazy'}
                  />
                </div>
              ))}
            </div>
          </div>
        </GalleryFrame>

        {/* Arrows — always visible, never hover-dependent */}
        <button
          type="button"
          onClick={scrollPrev}
          disabled={selectedIndex === 0}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center border border-[#444444] bg-[#1B1B18]/85 text-white backdrop-blur-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          onClick={scrollNext}
          disabled={selectedIndex === images.length - 1}
          aria-label="Next image"
          className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center border border-[#444444] bg-[#1B1B18]/85 text-white backdrop-blur-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Chevron direction="right" />
        </button>
      </div>

      {/* Position announcement for screen readers */}
      <p className="sr-only" aria-live="polite">
        Image {selectedIndex + 1} of {images.length}
      </p>

      {/* Dots — a second, larger-target way to jump between images */}
      <div className="mt-3 flex justify-center gap-2">
        {images.map((image, index) => (
          <button
            key={`dot-${image.src}-${index}`}
            type="button"
            onClick={() => scrollTo(index)}
            aria-label={`Go to image ${index + 1}`}
            aria-current={index === selectedIndex}
            className="flex h-11 w-8 cursor-pointer items-center justify-center"
          >
            <span
              className="block h-2.5 w-2.5 rounded-full transition-colors"
              style={{
                backgroundColor: index === selectedIndex ? '#FFD700' : '#555555',
              }}
            />
          </button>
        ))}
      </div>

      {/* Thumbnail strip */}
      <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
        {images.map((image, index) => (
          <button
            key={`thumb-${image.src}-${index}`}
            type="button"
            onClick={() => scrollTo(index)}
            aria-label={`Show image ${index + 1}`}
            aria-current={index === selectedIndex}
            className="relative h-16 w-16 flex-shrink-0 cursor-pointer overflow-hidden sm:h-20 sm:w-20"
            style={{
              border:
                index === selectedIndex ? '2px solid #FFD700' : '1px solid #444444',
            }}
          >
            <Image
              src={image.src}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points={direction === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  )
}
