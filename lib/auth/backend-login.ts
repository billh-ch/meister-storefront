import { wcProxyHeaders } from '../woocommerce/proxy-auth'

/** Customer credentials are verified by WordPress, not by the admin API key. */
export function requestCustomerToken(baseUrl: string, username: string, password: string): Promise<Response> {
  return fetch(`${baseUrl.replace(/\/$/, '')}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    cache: 'no-store',
    headers: { ...wcProxyHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
}
