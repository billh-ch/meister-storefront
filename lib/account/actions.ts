'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { addressSchema, type AddressInput } from '@/lib/address/schema'
import { toWcAddress } from '@/lib/address/map-address'
import { updateWcCustomerAddress } from '@/lib/woocommerce/queries/update-customer-address'

export type AccountActionResult = { ok: true } | { ok: false; error: string }

/**
 * The explicit "save my address" action from the account page — unlike
 * checkout's best-effort auto-save, a failure here must be reported to the
 * user, since saving is the entire point of this action.
 */
export async function updateAddressAction(input: AddressInput): Promise<AccountActionResult> {
  const session = await getSession()
  const wcCustomerId = session.wcCustomerId
  if (!wcCustomerId) {
    return { ok: false, error: 'Please sign in to continue.' }
  }

  const parsed = addressSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Please fill in every required field.' }
  }

  try {
    await updateWcCustomerAddress(wcCustomerId, toWcAddress(parsed.data))
  } catch {
    return { ok: false, error: 'Could not save your address. Please try again.' }
  }

  revalidatePath('/account')
  revalidatePath('/checkout')
  return { ok: true }
}
