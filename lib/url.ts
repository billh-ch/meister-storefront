/**
 * Origin used to build redirect-sensitive URLs (Stripe's `return_url`).
 * Deliberately NOT derived from the request's `Host`/`X-Forwarded-*`
 * headers — those are attacker-controllable, and a forged Host header
 * could steer where Stripe redirects a customer after a real payment.
 * `VERCEL_URL`/`VERCEL_PROJECT_PRODUCTION_URL` are Vercel-injected runtime
 * env vars, not headers, so they can't be spoofed by an incoming request;
 * localhost is the only manual fallback needed, for local dev.
 */
export function getBaseUrl(): string {
  // Explicit public origin for a deployment whose Vercel URL is not the one
  // customers use, e.g. a staging branch served on staging.meister.gr while
  // its *.vercel.app URLs sit behind Vercel's login. A server env var, so it
  // can't be steered by a request either.
  const explicit = parseOrigin(process.env.APP_BASE_URL)
  if (explicit) return explicit
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

function parseOrigin(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const bare = url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password
    return url.protocol === 'https:' && bare ? url.origin : null
  } catch {
    return null
  }
}
