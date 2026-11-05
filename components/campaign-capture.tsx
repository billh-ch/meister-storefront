'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { captureCampaignIntent } from '@/lib/promotions/campaign-client'
import { useTranslation } from '@/components/i18n/locale-provider'

export default function CampaignCapture() {
  const pathname = usePathname()
  const t = useTranslation()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    const clear = () => setFailed(false)
    window.addEventListener('mm:campaign-dismissed', clear)
    captureCampaignIntent().catch(() => { if (active) setFailed(true) })
    return () => { active = false; window.removeEventListener('mm:campaign-dismissed', clear) }
  }, [pathname])
  return failed ? <p role="alert" className="border-b border-white/20 px-4 py-3 text-center text-xs text-white">{t('We could not remember the campaign offer. Please enter its code at checkout.')}</p> : null
}
