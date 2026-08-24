import { headers } from 'next/headers'

/**
 * Origin of the current request, derived from forwarded headers rather than
 * a hardcoded env var — works unchanged across local dev, Vercel previews,
 * and production without needing a NEXT_PUBLIC_SITE_URL to stay in sync.
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
