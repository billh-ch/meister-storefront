import { wcFetchOrNull } from '../client'
import type { WcCustomer } from './create-customer'
import type { WcAddress } from './create-order'

export interface WcCustomerWithAddress extends WcCustomer {
  billing?: WcAddress
  shipping?: WcAddress
}

export async function fetchWcCustomerById(id: number): Promise<WcCustomerWithAddress | null> {
  return wcFetchOrNull<WcCustomerWithAddress>(`/customers/${id}`)
}
