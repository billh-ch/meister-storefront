/**
 * WooCommerce returns media URLs on the store's internal siteurl (e.g. a
 * LocalWP `*.local` domain), which only resolves on the machine running
 * WordPress. Rewrite to the WC base URL's origin (the ngrok tunnel) so
 * images are reachable from wherever this app runs.
 */
export function resolveImageUrl(rawUrl: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_WC_URL
  if (!baseUrl || !rawUrl) return rawUrl

  try {
    const image = new URL(rawUrl)
    const base = new URL(baseUrl)
    image.protocol = base.protocol
    image.host = base.host
    return image.toString()
  } catch {
    return rawUrl
  }
}
