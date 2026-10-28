/**
 * Origin used to build redirect-sensitive URLs (Stripe's `return_url`).
 * Deliberately NOT derived from the request's `Host`/`X-Forwarded-*`
 * headers — those are attacker-controllable, and a forged Host header
 * could steer where Stripe redirects a customer after a real payment.
 * Vercel's injected deployment variables take precedence. NEXT_PUBLIC_SITE_URL
 * supplies the trusted origin on Cloudflare; local development uses
 * localhost. None of these settings can be supplied by an incoming request.
 */
import { getPublicSiteUrl } from './seo/site'

export function getBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`
  }
  // Workers has no Vercel-injected deployment origin. Use a trusted setting,
  // while retaining preview isolation on Vercel when SEO points at production.
  if (env.NEXT_PUBLIC_SITE_URL) return getPublicSiteUrl(env).origin
  return 'http://localhost:3000'
}
