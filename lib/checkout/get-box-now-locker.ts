import { boxNowLockerSchema, boxNowLockerSelectionSchema, requiresBoxNowLocker, type BoxNowLocker, type BoxNowLockerSelection } from './box-now'

/** BOX NOW's v5 widget reads this same public directory. Fixed host/country
 * and validated numeric identity prevent arbitrary URLs or foreign lockers.
 * Keep it separate from authenticated shipment/label creation. */
const GREEK_LOCKER_DIRECTORY = 'https://globallockersprod.z28.web.core.windows.net/PROD/greece/lockers'

export async function resolveCheckoutLocker(country: string, methodId: string, selection?: BoxNowLockerSelection): Promise<BoxNowLocker | undefined> {
  if (!requiresBoxNowLocker(country, methodId)) return undefined
  const parsed = boxNowLockerSelectionSchema.safeParse(selection)
  if (!parsed.success) throw new Error('Please select a BOX NOW locker before continuing to payment.')

  let response: Response
  let data: Record<string, unknown>
  try {
    response = await fetch(`${GREEK_LOCKER_DIRECTORY}/${parsed.data.id}.json`, { cache: 'no-store', signal: AbortSignal.timeout(8_000) })
    if (!response.ok) throw new Error('Locker lookup failed')
    data = await response.json()
  } catch {
    throw new Error('Could not verify your BOX NOW locker. Please try again or choose another delivery method.')
  }
  if (!data || typeof data !== 'object') throw new Error('Please choose another BOX NOW locker.')
  const locker = boxNowLockerSchema.safeParse({ id: data.id, name: data.name, address: data.addressLine1, postcode: data.postalCode, country: data.country })
  if (!locker.success || locker.data.id !== parsed.data.id) throw new Error('Please choose another BOX NOW locker.')
  return locker.data
}
