import type { Locale } from '@/lib/i18n'
import { z } from 'zod'

export const BOX_NOW_METHOD_ID = 'box_now_delivery'
export const BOX_NOW_WIDGET_ORIGIN = 'https://widget-v5.boxnow.gr'
const lockerIdSchema = z.string().regex(/^\d{1,12}$/)
const detailSchema = z.string().trim().min(1).max(300).refine(value => !/[<>\u0000-\u001f]/.test(value))

/** Checkout accepts only an identity. The server obtains the address itself. */
export const boxNowLockerSelectionSchema = z.object({ id: lockerIdSchema })
export type BoxNowLockerSelection = z.infer<typeof boxNowLockerSelectionSchema>
export const boxNowLockerSchema = boxNowLockerSelectionSchema.extend({
  name: detailSchema,
  address: detailSchema,
  postcode: z.string().trim().regex(/^\d{3}\s?\d{2}$/),
  country: z.literal('GR'),
})
export type BoxNowLocker = z.infer<typeof boxNowLockerSchema>

export function requiresBoxNowLocker(country: string, methodId?: string): boolean {
  return country === 'GR' && methodId === BOX_NOW_METHOD_ID
}

/** Same iframe transport used by BOX NOW's WooCommerce plugin. No global
 * script is needed, which also allows React to cleanly mount/unmount it. */
export function boxNowWidgetUrl(postcode: string, partnerId?: string, locale: Locale = 'en'): string {
  const url = new URL('/iframe.html', BOX_NOW_WIDGET_ORIGIN)
  // The current iframe sends selection on marker/list taps. Its explicit
  // Select button path emits only in popup mode, so use the iframe default.
  url.search = new URLSearchParams({ countryCode: 'gr', language: locale === 'el' ? 'gr' : 'en', gps: 'no', autoselect: 'yes', autoclose: 'no', zip: postcode }).toString()
  if (partnerId && /^\d+$/.test(partnerId)) url.searchParams.set('partnerId', partnerId)
  return url.href
}

export function lockerFromWidgetMessage(data: unknown, origin: string, matchesFrame: boolean): BoxNowLocker | null {
  if (origin !== BOX_NOW_WIDGET_ORIGIN || !matchesFrame || !data || typeof data !== 'object') return null
  const message = data as Record<string, unknown>
  const result = boxNowLockerSchema.safeParse({
    id: typeof message.boxnowLockerId === 'number' ? String(message.boxnowLockerId) : message.boxnowLockerId,
    name: message.boxnowLockerName,
    address: message.boxnowLockerAddressLine1,
    postcode: message.boxnowLockerPostalCode,
    country: message.boxnowCountry,
  })
  return result.success ? result.data : null
}

export function lockerToStripeMetadata(locker: BoxNowLocker): Record<string, string> {
  return { boxnow_locker_id: locker.id, boxnow_locker_name: locker.name, boxnow_locker_address: locker.address, boxnow_locker_postcode: locker.postcode, boxnow_locker_country: locker.country }
}

export function lockerFromStripeMetadata(metadata: Record<string, string>): BoxNowLocker | undefined {
  if (!Object.keys(metadata).some(key => key.startsWith('boxnow_locker_'))) return undefined
  const result = boxNowLockerSchema.safeParse({ id: metadata.boxnow_locker_id, name: metadata.boxnow_locker_name, address: metadata.boxnow_locker_address, postcode: metadata.boxnow_locker_postcode, country: metadata.boxnow_locker_country })
  if (!result.success) throw new Error('Checkout Session locker details are invalid')
  return result.data
}

/** Official BOX NOW plugin order fields, used in admin and label generation. */
export function lockerOrderMetaData(locker: BoxNowLocker): { key: string; value: string }[] {
  return [
    { key: '_boxnow_locker_id', value: locker.id },
    { key: '_boxnow_locker_name', value: locker.name },
    { key: '_boxnow_locker_address', value: locker.address },
    { key: '_boxnow_locker_postal_code', value: locker.postcode },
  ]
}
