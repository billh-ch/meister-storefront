import { wcFetch, wcMutate } from '../client'

export interface WcCustomer {
  id: number
  email: string
  first_name: string
  last_name: string
}

export class DuplicateEmailError extends Error {}

/** WooCommerce's own by-email lookup — also used after login (see
 *  `lib/auth/actions.ts`) to resolve the numeric customer id, since the
 *  WordPress JWT plugin's response only echoes back the email, not an id. */
export async function findWcCustomerByEmail(email: string): Promise<number | null> {
  const results = await wcFetch<WcCustomer[]>('/customers', { email, per_page: '1' })
  return results[0]?.id ?? null
}

/**
 * Creates a WooCommerce customer (= a WordPress user) with a real password,
 * using the existing admin consumer key/secret — no WordPress-side plugin
 * needed for registration, only for the login/password-check step.
 */
export async function createWcCustomer(input: {
  email: string
  firstName: string
  lastName: string
  password: string
}): Promise<number> {
  const existing = await findWcCustomerByEmail(input.email)
  if (existing) throw new DuplicateEmailError()

  const customer = await wcMutate<WcCustomer>('/customers', 'POST', {
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    password: input.password,
  })

  return customer.id
}
