'use client'
import { useTranslation, useLocale } from '@/components/i18n/locale-provider'

import Link from '@/components/i18n/localized-link'
import { useEffect, useState } from 'react'
import type { Product } from '@/lib/mock-data'
import ProductCard from '@/components/product-card'
import WishlistButton from './button'
import { useWishlist } from './provider'

export default function WishlistContent() {
  const t = useTranslation()
  const locale = useLocale()

  const { ids, ready, customerId, error, syncing } = useWishlist()
  const [catalog, setCatalog] = useState<{ key: string; products: Product[]; error: boolean }>({ key: '', products: [], error: false })
  const [attempt, setAttempt] = useState(0)
  const key = ids.join(',')
  useEffect(() => {
    if (!ready || !key) return
    const controller = new AbortController()
    const productIds = key.split(',')
    const batches = Array.from({ length: Math.ceil(productIds.length / 40) }, (_, index) => productIds.slice(index * 40, index * 40 + 40))
    void Promise.all(batches.map(async batch => {
      const response = await fetch(`/api/wishlist/products?ids=${batch.join(',')}&locale=${locale}`, { cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw Error('Catalog unavailable')
      const data = await response.json() as { products: Product[] }
      return data.products
    })).then(products => setCatalog({ key, products: products.flat(), error: false }))
      .catch(() => { if (!controller.signal.aborted) setCatalog({ key, products: [], error: true }) })
    return () => controller.abort()
  }, [ready, key, attempt, locale])

  if (!ready) return <p role="status" className="py-12 text-sm text-[#999999]">{t("Loading your wishlist…")}</p>
  if (!ids.length) return <div className="flex flex-col items-center gap-4 border border-[#444444] px-4 py-20 text-center">
    <p className="text-lg text-white">{t("Your wishlist is empty")}</p>
    <p className="text-sm text-[#999999]">{t("Tap a product’s heart to save it for later.")}</p>
    <Link href="/shop" className="btn-gold px-6 py-3 text-xs uppercase">{t("Continue shopping")}</Link>
  </div>
  const current = catalog.key === key
  return <>
    <p className="mb-6 text-xs text-[#999999]">{customerId ? (syncing ? t("Syncing your wishlist…") : error ? t("Some changes may not be saved yet. Retry to sync them.") : t("Saved to your account. Available on your other devices.")) : <>{t("Your wishlist on this browser.")}{' '}
      <Link href="/sign-in?redirect_url=/wishlist" className="text-[#FFD700] underline">{t("Sign in")}</Link>{' '}
      {t("to keep your wishlist across devices.")}</>}</p>
    {!current ? <p role="status" className="py-12 text-sm text-[#999999]">{t("Loading saved products…")}</p>
      : catalog.error ? <div className="border border-[#444444] p-6"><p role="status" className="text-sm">{t("Could not load saved products. Your wishlist is still saved.")}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="btn-gold mt-4 min-h-11 px-4 text-xs">{t("Retry products")}</button></div>
      : <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {ids.map(id => {
          const product = catalog.products.find(product => product.id === id)
          return product ? <ProductCard key={id} product={product} /> : <div key={id} className="flex flex-col justify-center gap-4 border border-[#444444] p-4"><p className="text-xs text-[#999999]">{t("This saved product is no longer available.")}</p><WishlistButton id={id} name={`product ${id}`} /></div>
        })}
      </div>}
  </>
}
