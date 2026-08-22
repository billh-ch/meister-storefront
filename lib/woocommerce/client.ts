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

/**
 * Like `wcFetch`, but resolves to `null` on a 404 instead of throwing — for
 * lookups where "doesn't exist" is an expected, real outcome (resolving a
 * product/variation id a shopper's cart cookie references), not a
 * store-unreachable failure. Any other non-2xx still throws.
 */
export async function wcFetchOrNull<T>(
  path: string,
  params: Record<string, string> = {},
  cacheOptions?: CacheOptions,
): Promise<T | null> {
  try {
    const { data } = await wcRequest<T>(path, params, cacheOptions, { nullOn404: true })
    return data
  } catch (error) {
    if (error instanceof WcNotFoundError) return null
    throw error
  }
}

/**
 * `POST`/`PUT` to the WooCommerce REST API — for creating/updating
 * customers and orders. Never cached (mutations never carry `next.revalidate`).
 */
export async function wcMutate<T>(
  path: string,
  method: 'POST' | 'PUT',
  body: unknown,
): Promise<T> {
  const { data } = await wcRequest<T>(path, {}, undefined, { method, body })
  return data
}

class WcNotFoundError extends Error {}

async function wcRequest<T>(
  path: string,
  params: Record<string, string>,
  cacheOptions?: CacheOptions,
  options?: { method?: 'POST' | 'PUT'; body?: unknown; nullOn404?: boolean },
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
    method: options?.method,
    headers: {
      Authorization: `Basic ${basicAuth}`,
      ...(options?.body !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(options?.body !== undefined && { body: JSON.stringify(options.body) }),
    ...(cacheOptions && { next: cacheOptions }),
  }

  const response = await fetch(url.toString(), init as RequestInit)

  if (!response.ok) {
    if (options?.nullOn404 && response.status === 404) {
      throw new WcNotFoundError()
    }
    throw new Error(
      `WooCommerce request failed: ${response.status} ${response.statusText}`,
    )
  }

  return { data: (await response.json()) as T, response }
}
