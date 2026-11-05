'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslation } from '@/components/i18n/locale-provider'
import { formatPrice } from '@/lib/mock-data'
import { captureCampaignIntent } from '@/lib/promotions/campaign-client'
import { promotionQuoteSchema, type PromotionQuote } from '@/lib/promotions/schema'

/** Bundle-only estimate. No coupon controls or personalized code is exposed in the cart. */
export default function PromotionSummary({ cartKey }: { cartKey: string }) {
  const locale = useLocale()
  const t = useTranslation()
  const [result, setResult] = useState<{ cartKey: string; locale: string; quote: PromotionQuote } | null>(null)
  const quote = result?.cartKey === cartKey && result.locale === locale ? result.quote : null
  useEffect(() => {
    const controller = new AbortController()
    captureCampaignIntent().then(() => fetch('/api/checkout/promotions', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ scope: 'cart', locale, address: { country: 'GR' } }) }))
      .then(async response => { if (response.ok) { const data = await response.json(); const parsed = promotionQuoteSchema.safeParse(data.quote); if (parsed.success && !controller.signal.aborted) setResult({ cartKey, locale, quote: parsed.data }) } })
      .catch(() => { /* Final pricing stays at checkout; do not invent a discount during an outage. */ })
    return () => controller.abort()
  }, [cartKey, locale])
  if (!quote || quote.promotion?.type !== 'bundle' || quote.discount <= 0) return null
  return <div className="flex flex-col gap-2 border-t border-white/20 pt-3 text-xs text-[#FFD700]" aria-live="polite"><div className="flex justify-between gap-3"><span>{t('Bundle saving')} · {quote.promotion.label}</span><span className="shrink-0">−{formatPrice(quote.discount / 100)}</span></div><div className="flex justify-between gap-3 text-white"><span>{t('Merchandise after discount')}</span><span>{formatPrice((quote.subtotal - quote.discount) / 100)}</span></div><p className="text-[10px] text-white/60">{t('Estimated saving. Final eligibility and delivery are confirmed at checkout.')}</p></div>
}
