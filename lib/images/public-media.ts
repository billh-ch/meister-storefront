import { imageVersion } from './version'

type MediaProduct = { status: string; images?: { src: string; date_modified?: string }[] }

/** Project public photos only; never serialize WooCommerce records or credentials. */
export function projectPublishedMedia(products: readonly MediaProduct[], baseUrl: string): { src: string }[] {
  const base = new URL(baseUrl)
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('Invalid public media origin')
  const seen = new Set<string>()
  const images: { src: string }[] = []
  for (const product of products) {
    if (product.status !== 'publish') continue
    for (const image of product.images ?? []) {
      try {
        const original = new URL(image.src)
        if (!['http:', 'https:'].includes(original.protocol) || !original.pathname.startsWith('/wp-content/uploads/') || !/\.(?:jpe?g|png|webp|avif|gif)$/i.test(original.pathname)) continue
        const publicUrl = new URL(original.pathname, base.origin)
        const version = imageVersion(image.date_modified)
        if (version) publicUrl.searchParams.set('v', version)
        const src = publicUrl.toString()
        if (!seen.has(src)) { seen.add(src); images.push({ src }) }
      } catch { /* Invalid media stays out of the public inventory. */ }
    }
  }
  return images
}
