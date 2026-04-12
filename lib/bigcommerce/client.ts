type NextFetchRequestConfig = {
  revalidate?: number | false
  tags?: string[]
}

type NextRequestInit = RequestInit & { next?: NextFetchRequestConfig }

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

export interface CacheOptions {
  revalidate?: number | false
  tags?: string[]
}

export async function bcFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  cacheOptions?: CacheOptions,
): Promise<T> {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH
  const token = process.env.BIGCOMMERCE_STOREFRONT_TOKEN

  if (!storeHash || !token) {
    throw new Error(
      'BigCommerce env vars (BIGCOMMERCE_STORE_HASH, BIGCOMMERCE_STOREFRONT_TOKEN) are not configured',
    )
  }

  const endpoint = `https://store-${storeHash}.mybigcommerce.com/graphql`

  const init: NextRequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    ...(cacheOptions && { next: cacheOptions }),
  }

  const response = await fetch(endpoint, init as RequestInit)

  if (!response.ok) {
    throw new Error(
      `BigCommerce request failed: ${response.status} ${response.statusText}`,
    )
  }

  const json = (await response.json()) as GraphQLResponse<T>

  if (json.errors?.length) {
    throw new Error(
      `BigCommerce GraphQL errors: ${json.errors.map(e => e.message).join(', ')}`,
    )
  }

  if (!json.data) {
    throw new Error('BigCommerce GraphQL response missing data field')
  }

  return json.data
}
