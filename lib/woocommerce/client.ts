type NextFetchRequestConfig = {
  revalidate?: number | false
  tags?: string[]
}

type NextRequestInit = RequestInit & { next?: NextFetchRequestConfig }

export interface CacheOptions {
  revalidate?: number | false
  tags?: string[]
}

export async function wcFetch<T>(
  path: string,
  params: Record<string, string> = {},
  cacheOptions?: CacheOptions,
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_WC_URL
  const consumerKey = process.env.WC_CONSUMER_KEY
  const consumerSecret = process.env.WC_CONSUMER_SECRET

  if (!baseUrl || !consumerKey || !consumerSecret) {
    throw new Error(
      'WooCommerce env vars (NEXT_PUBLIC_WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET) are not configured',
    )
  }

  const url = new URL(`${baseUrl.replace(/\/$/, '')}/wp-json/wc/v3${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const basicAuth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

  const init: NextRequestInit = {
    headers: {
      Authorization: `Basic ${basicAuth}`,
    },
    ...(cacheOptions && { next: cacheOptions }),
  }

  const response = await fetch(url.toString(), init as RequestInit)

  if (!response.ok) {
    throw new Error(
      `WooCommerce request failed: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as T
}
