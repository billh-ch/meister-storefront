'use client'
import { useTranslation } from '@/components/i18n/locale-provider'

import Link from '@/components/i18n/localized-link'
import { HeartIcon } from './button'
import { useWishlist } from './provider'
export default function WishlistNavLink() {
  const t = useTranslation()

  const { ids } = useWishlist()
  return <Link href="/wishlist" scroll={false} onNavigate={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })} aria-label={ids.length ? t('Wishlist, {count} saved products', { count: ids.length }) : t("Wishlist")} className="relative flex h-11 w-11 shrink-0 items-center justify-center text-white transition-colors hover:text-[#FFD700]">
    <HeartIcon />
    {ids.length > 0 && <span aria-hidden="true" className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFD700] px-1 text-[10px] font-bold text-[#1B1B18]">{ids.length > 99 ? '99+' : ids.length}</span>}
  </Link>
}
