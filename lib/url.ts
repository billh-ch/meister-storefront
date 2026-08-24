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
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}
