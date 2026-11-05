/** Browser-only coordination so a first-visit quote cannot overwrite campaign session creation. */
declare global { interface Window { __meisterCampaignCapture?: Promise<void> } }
export function captureCampaignIntent(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const url = new URL(window.location.href)
  const code = url.searchParams.get('coupon')
  if (!code) return window.__meisterCampaignCapture ?? Promise.resolve()
  url.searchParams.delete('coupon')
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  if (code.length > 100 || /[\x00-\x1f\x7f]/.test(code)) return Promise.resolve()
  const operation = fetch('/api/promotions/campaign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', keepalive: true, body: JSON.stringify({ code }) })
    .then(response => { if (!response.ok) throw new Error('Campaign capture failed'); window.dispatchEvent(new Event('mm:campaign-captured')) })
  window.__meisterCampaignCapture = operation
  return operation
}

/** Explicit manual intent is a valid recovery from an unsuccessful automatic capture. */
export function resolveCampaignCaptureFailure(): void {
  if (typeof window !== 'undefined') { window.__meisterCampaignCapture = Promise.resolve(); window.dispatchEvent(new Event('mm:campaign-dismissed')) }
}
