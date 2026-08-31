const DEFAULT_REDIRECT = '/account'

/**
 * `redirect_url` comes straight from a query string a shopper's browser
 * sends — `/sign-in?redirect_url=https://evil.example` is a request anyone
 * can construct. Only ever navigate to it if it's genuinely a same-origin
 * relative path; otherwise fall back to `/account` rather than trusting it.
 *
 * Origin-based, not substring-based: the WHATWG URL parser strips ASCII tab
 * and newline characters before parsing, so a prefix check alone (blocking
 * literal `//` / `/\`) can be bypassed with e.g. `/\t/evil.example` — that
 * string doesn't start with `//`, but browsers (and Next's own router, via
 * `new URL(href, location.href)`) parse it as `//evil.example` after
 * stripping the tab, i.e. a protocol-relative external URL. Parsing the
 * candidate the same way the router will and comparing origins closes that
 * off regardless of which stripped/encoded form an attacker tries.
 */
export function getSafeRedirectUrl(candidate: string | undefined | null): string {
  if (!candidate) return DEFAULT_REDIRECT
  if (!candidate.startsWith('/')) return DEFAULT_REDIRECT

  try {
    const placeholderOrigin = 'https://placeholder.invalid'
    const resolved = new URL(candidate, placeholderOrigin)
    if (resolved.origin !== placeholderOrigin) return DEFAULT_REDIRECT
    return candidate
  } catch {
    return DEFAULT_REDIRECT
  }
}
