'use client'

import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProductImage } from '@/lib/mock-data'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
  /** Variant image, when the shopper has picked a combination that has one. */
  activeImage?: string | null
}

const SIZES = '(max-width: 1023px) 100vw, 50vw'
const THUMB_SIZES = '(max-width: 640px) 25vw, 150px'
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

/**
 * One large image with every other shot laid out as tiles beneath it.
 *
 * Chosen over a carousel because a carousel hides its own contents: a
 * shopper has to know to swipe or hunt for arrows to discover there are
 * twelve photos, and plenty never do. The tiles show the whole set at once.
 *
 * The main image is still an Embla viewport purely so swiping keeps working
 * on touch — the arrows are gone, since the tiles make them redundant.
 * Selection syncs both ways: tapping a tile scrolls the main image, and
 * swiping the main image highlights the matching tile.
 *
 * The variant image (`activeImage`) gets its own tile in the list rather
 * than being overlaid onto whichever tile happens to be in view — an
 * overlay meant the highlighted tile's own thumbnail never matched what was
 * actually enlarged above it, and made the plain default photo unreachable
 * for as long as an image-bearing variant stayed selected.
 */
export default function ProductGallery({
  images,
  productName,
  activeImage = null,
}: ProductGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' })
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reuses an existing tile's slot if the variant image already happens to
  // be one of the product's own gallery photos; otherwise adds it as a new
  // tile up front, alongside — not instead of — every original photo.
  const displayImages = useMemo(() => {
    if (!activeImage) return images
    if (images.some((image) => image.src === activeImage)) return images
    return [{ src: activeImage, alt: `${productName} — selected option` }, ...images]
  }, [images, activeImage, productName])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  // Jump straight to the variant's own image whenever one becomes active,
  // so picking a variant always shows its photo without the shopper having
  // to notice and manually swipe/tap to find it.
  useEffect(() => {
    if (!activeImage || !emblaApi) return
    const targetIndex = displayImages.findIndex((image) => image.src === activeImage)
    if (targetIndex !== -1) emblaApi.scrollTo(targetIndex, true)
  }, [activeImage, displayImages, emblaApi])

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  )

  // --- Branch 1: no images at all ---
  if (displayImages.length === 0) {
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

  // --- Branch 2: a single image needs no viewport and no tiles ---
  if (displayImages.length === 1) {
    return (
      <GalleryFrame>
        <Image
          src={displayImages[0].src}
          alt={displayImages[0].alt || productName}
          fill
          sizes={SIZES}
          className="object-cover"
          preload
        />
      </GalleryFrame>
    )
  }

  // --- Branch 3: main image + tile grid ---
  return (
    <div>
      <GalleryFrame>
        <div className="absolute inset-0 overflow-hidden" ref={emblaRef}>
          <div className="flex h-full" style={{ touchAction: 'pan-y pinch-zoom' }}>
            {displayImages.map((image, index) => (
              <div
                key={`${image.src}-${index}`}
                className="relative h-full w-full flex-shrink-0"
              >
                <Image
                  src={image.src}
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

      {/* Position announcement for screen readers — the tiles carry this
          visually, but nothing announces a swipe otherwise. */}
      <p className="sr-only" aria-live="polite">
        Image {selectedIndex + 1} of {displayImages.length}
      </p>

      {/* Tile grid — every shot visible at once, no discovery required */}
      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {displayImages.map((image, index) => {
          const isSelected = index === selectedIndex

          return (
            <button
              key={`tile-${image.src}-${index}`}
              type="button"
              onClick={() => scrollTo(index)}
              aria-label={`Show image ${index + 1} of ${displayImages.length}`}
              aria-current={isSelected}
              // The selected tile is already on show above, so it's the
              // unselected ones that need to read as tappable.
              className={`hatching-bg relative aspect-square w-full cursor-pointer overflow-hidden transition-opacity ${
                isSelected ? 'opacity-100' : 'opacity-[0.6] hover:opacity-100'
              }`}
              style={{
                border: isSelected ? '2px solid #FFD700' : '1px solid #444444',
              }}
            >
              <Image
                src={image.src}
                alt=""
                fill
                sizes={THUMB_SIZES}
                className="object-cover"
                loading="lazy"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
