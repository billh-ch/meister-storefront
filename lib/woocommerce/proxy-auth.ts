/** Server-side origin protection. Never use this module in client components. */
export function wcProxyHeaders(): Record<string, string> {
  const token = process.env.WC_PROXY_TOKEN
  return token ? { 'X-Meister-API-Key': token } : {}
}
