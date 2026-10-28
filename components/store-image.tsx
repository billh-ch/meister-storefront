'use client'

import type { ImageProps } from 'next/image'
import { forwardRef, useState } from 'react'
import { preload as preloadResource } from 'react-dom'
import imageLoader from '@/lib/images/loader'
import manifest from '@/lib/images/generated-manifest.json' with { type: 'json' }
import { imageVariants } from '@/lib/images/select-variant'

/** Native responsive markup avoids runtime optimizers and adapter-specific image gaps. */
const StoreImage = forwardRef<HTMLImageElement, ImageProps>(function StoreImage({ src, alt, width, height, fill, sizes, style, priority, preload, loading, quality: _quality, loader: _loader, unoptimized, placeholder, blurDataURL, onLoadingComplete, onLoad, overrideSrc, ...rest }, ref) {
  const [blurComplete, setBlurComplete] = useState(false)
  // Encoding is fixed at build time; callers cannot trigger runtime transforms.
  void _quality; void _loader
  const image: { src: string; width?: number; height?: number; blurDataURL?: string } = typeof src === 'string' ? { src } : 'default' in src ? src.default : src
  const variants = unoptimized ? [] : imageVariants(image.src, manifest)
  const srcSet = variants.length ? variants.map(item => `${item.src} ${item.width}w`).join(', ') : undefined
  const resolvedSrc = overrideSrc || (unoptimized ? image.src : imageLoader({ src: image.src, width: Number(width) || 1600 }))
  const imageSizes = sizes || (fill ? '100vw' : width ? `${width}px` : undefined)
  const fetchPriority = priority ? 'high' : rest.fetchPriority
  if (priority || preload) preloadResource(resolvedSrc, { as: 'image', imageSrcSet: srcSet, imageSizes, fetchPriority })
  const blur = blurDataURL || image.blurDataURL
  const blurStyle = placeholder === 'blur' && !blurComplete && blur?.startsWith('data:image/') ? { backgroundImage: `url("${blur}")`, backgroundSize: 'cover' } : {}
  // eslint-disable-next-line @next/next/no-img-element -- pre-generated srcSet replaces the platform image optimizer.
  return <img {...rest} ref={ref} src={resolvedSrc} srcSet={srcSet} sizes={imageSizes} alt={alt} width={fill ? undefined : width ?? image.width} height={fill ? undefined : height ?? image.height} loading={priority ? 'eager' : loading ?? 'lazy'} fetchPriority={fetchPriority} decoding="async" data-nimg={fill ? 'fill' : '1'} style={{ ...(fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', color: 'transparent' } as const : {}), ...blurStyle, ...style }} onLoad={event => { if (placeholder === 'blur') setBlurComplete(true); onLoad?.(event); onLoadingComplete?.(event.currentTarget) }} />
})
export default StoreImage
