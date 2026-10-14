'use client'
import { useTranslation, useLocale } from '@/components/i18n/locale-provider'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { boxNowWidgetUrl, lockerFromWidgetMessage, type BoxNowLocker } from '@/lib/checkout/box-now'

interface BoxNowLockerPickerProps {
  postcode: string
  partnerId?: string
  locker: BoxNowLocker | null
  disabled: boolean
  onSelect: (locker: BoxNowLocker) => void
}

export default function BoxNowLockerPicker({ postcode, partnerId, locker, disabled, onSelect }: BoxNowLockerPickerProps) {
  const t = useTranslation()
  const locale = useLocale()

  const iframeRef = useRef<HTMLIFrameElement>(null)
  // Seed once when BOX NOW is selected; editing the address must not reload
  // the map mid-selection. Customers can also search within BOX NOW's map.
  const [initialPostcode] = useState(postcode)
  const [showMap, setShowMap] = useState(!locker)
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const acceptMessage = useEffectEvent((event: MessageEvent) => {
    if (disabled || !showMap) return
    const selected = lockerFromWidgetMessage(event.data, event.origin, !!iframeRef.current && event.source === iframeRef.current.contentWindow)
    if (!selected) return
    onSelect(selected)
    setShowMap(false)
  })

  useEffect(() => {
    const listener = (event: MessageEvent) => acceptMessage(event)
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [])

  useEffect(() => {
    if (!showMap || !loading) return
    const timer = setTimeout(() => { setLoading(false); setLoadError(true) }, 20_000)
    return () => clearTimeout(timer)
  }, [showMap, loading, attempt])

  const openMap = () => { setLoading(true); setLoadError(false); setAttempt(value => value + 1); setShowMap(true) }

  return (
    <div className="min-w-0 border border-white/20 p-3 sm:p-4">
      <h3 className="text-sm font-bold text-white">{t("Choose your BOX NOW locker")}</h3>
      <p className="mt-1 text-xs text-white/70">{t("Collect your parcel from the locker you select.")}</p>
      {locker ? (
        <div role="status" className="mt-3 flex flex-wrap items-start justify-between gap-2 border-l-2 border-[#FFD700] pl-3">
          <div className="min-w-0 flex-1 text-sm text-white">
            <p className="break-words font-bold">{locker.name}</p>
            <p className="break-words text-xs text-white/70">{locker.address}, {locker.postcode}</p>
          </div>
          <button type="button" disabled={disabled} onClick={openMap} className="min-h-11 shrink-0 text-xs text-[#FFD700] underline">{t("Change locker")}</button>
        </div>
      ) : <p className="mt-3 text-xs text-[#FFD700]">{t("Select a locker on the map to continue to payment.")}</p>}
      {showMap ? (
        <div className="mt-3">
          {loading ? <p role="status" className="mb-2 text-xs text-white/70">{t("Loading BOX NOW lockers…")}</p> : null}
          {loadError ? <p role="alert" className="mb-2 text-xs text-[#FF6B6B]">{t("The locker map could not load. Try again or choose another delivery method.")}</p> : null}
          <div className="relative h-[440px] overflow-hidden bg-white sm:h-[520px]">
            <iframe
              key={attempt}
              ref={iframeRef}
              title={t("BOX NOW locker map for Greece")}
              src={boxNowWidgetUrl(initialPostcode, partnerId, locale)}
              className="h-full w-full border-0"
              allow="geolocation"
              onLoad={() => { setLoading(false); setLoadError(false) }}
              onError={() => { setLoading(false); setLoadError(true) }}
            />
            {disabled ? <div className="absolute inset-0 bg-black/10" aria-hidden="true" /> : null}
          </div>
          <button type="button" disabled={disabled} onClick={openMap} className="mt-2 min-h-11 text-xs text-white/70 underline">{t("Reload locker map")}</button>
        </div>
      ) : null}
    </div>
  )
}
