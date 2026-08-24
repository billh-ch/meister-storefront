import type { AddressInput } from './schema'
import type { WcAddress } from '@/lib/woocommerce/queries/create-order'

export function toWcAddress(input: AddressInput): WcAddress {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    address_1: input.address1,
    address_2: input.address2,
    city: input.city,
    postcode: input.postcode,
    country: input.country,
    phone: input.phone,
  }
}

export function toAddressInput(wc: WcAddress): AddressInput {
  return {
    firstName: wc.first_name,
    lastName: wc.last_name,
    address1: wc.address_1,
    address2: wc.address_2,
    city: wc.city,
    postcode: wc.postcode,
    country: wc.country,
    phone: wc.phone ?? '',
  }
}
