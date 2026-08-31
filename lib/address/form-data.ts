import type { AddressInput } from './schema'

/** Shared by every form that submits `AddressFields` (checkout, account) so
 *  the 8 field names/fallbacks only live in one place. */
export function addressFromFormData(formData: FormData): AddressInput {
  return {
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    address1: String(formData.get('address1') ?? ''),
    address2: String(formData.get('address2') ?? '') || undefined,
    city: String(formData.get('city') ?? ''),
    postcode: String(formData.get('postcode') ?? ''),
    country: String(formData.get('country') ?? 'GR'),
    phone: String(formData.get('phone') ?? ''),
  }
}
