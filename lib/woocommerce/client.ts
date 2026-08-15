type NextFetchRequestConfig = {
  revalidate?: number | false
  tags?: string[]
}

type NextRequestInit = RequestInit & { next?: NextFetchRequestConfig }

export interface CacheOptions {
  revalidate?: number | false
  tags?: string[]
}

export interface WcPage<T> {
  data: T
  /** From `X-WP-TotalPages`. 1 when the store omits the header. */
  totalPages: number
  /** From `X-WP-Total`. 0 when the store omits the header. */
  total: number
}

/**
 * Like `wcFetch`, but also returns WooCommerce's pagination headers.
 *
 * Kept as a separate entry point rather than widening `wcFetch`: every other
 * caller wants the parsed body and nothing else, and none of them should have
 * to unwrap an envelope to get it.
 */
export async function wcFetchWithMeta<T>(
  path: string,
  params: Record<string, string> = {},
  cacheOptions?: CacheOptions,
): Promise<WcPage<T>> {
  const { data, response } = await wcRequest<T>(path, params, cacheOptions)

  return {
    data,
    totalPages: Number.parseInt(response.headers.get('x-wp-totalpages') ?? '', 10) || 1,
    total: Number.parseInt(response.headers.get('x-wp-total') ?? '', 10) || 0,
  }
}

export async function wcFetch<T>(
  path: string,
  params: Record<string, string> = {},
  cacheOptions?: CacheOptions,
): Promise<T> {
  const { data } = await wcRequest<T>(path, params, cacheOptions)
  return data
}

async function wcRequest<T>(
  path: string,
  params: Record<string, string>,
  cacheOptions?: CacheOptions,
): Promise<{ data: T; response: Response }> {
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

  return { data: (await response.json()) as T, response }
}
