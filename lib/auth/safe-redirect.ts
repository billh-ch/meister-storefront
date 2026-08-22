const DEFAULT_REDIRECT = '/account'

/**
 * `redirect_url` comes straight from a query string a shopper's browser
 * sends — `/sign-in?redirect_url=https://evil.example` is a request anyone
 * can construct. Only ever navigate to it if it's genuinely a same-origin
 * relative path; otherwise fall back to `/account` rather than trusting it.
 */
export function getSafeRedirectUrl(candidate: string | undefined | null): string {
  if (!candidate) return DEFAULT_REDIRECT
  if (!candidate.startsWith('/')) return DEFAULT_REDIRECT
  // `//evil.com` and `/\evil.com` are both browser-parsed as protocol-relative
  // external URLs despite starting with a single slash-like character.
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return DEFAULT_REDIRECT
  return candidate
}
