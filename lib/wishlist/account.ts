import { wcFetch, wcMutate } from '@/lib/woocommerce/client'
import { readWishlistMetadata, wishlistMetadata } from './model'

interface Customer { id: number; meta_data?: unknown }
export async function readAccountWishlist(customerId: number): Promise<string[]> {
  const customer = await wcFetch<Customer>(`/customers/${customerId}`)
  return readWishlistMetadata(customer.meta_data)
}
export async function changeAccountWishlist(customerId: number, additions: string[], removals: string[]): Promise<string[]> {
  const customer = await wcMutate<Customer>(`/customers/${customerId}`, 'PUT', {
    meta_data: [...wishlistMetadata(additions, true), ...wishlistMetadata(removals, false)],
  })
  return readWishlistMetadata(customer.meta_data)
}
