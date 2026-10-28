import type { ImageLoaderProps } from 'next/image'
import manifest from './generated-manifest.json' with { type: 'json' }
import { selectImageVariant } from './select-variant'

/** Static derivatives only: no image transformations or origin requests in a Worker. */
export default function imageLoader({ src, width }: ImageLoaderProps): string {
  return selectImageVariant(src, width, manifest)
}
