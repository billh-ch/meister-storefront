import { wcMutate } from '../client'
import type { WcAddress } from './create-order'

/**
 * Writes the same address to both `billing` and `shipping` on the
 * WooCommerce customer record — matches `createOrder`'s existing behavior
 * of using one address for both when placing an order (this app collects
 * a single address, not separate billing/shipping ones).
 *
 * Confirmed live against the store (PUT company/state, then PUT only these
 * 8 fields, then GET): WooCommerce merges `billing`/`shipping` per-field
 * rather than replacing the sub-object wholesale — fields this app never
 * sends (`company`, `state`, billing `email`) survive untouched.
 */
export async function updateWcCustomerAddress(customerId: number, address: WcAddress): Promise<void> {
  await wcMutate(`/customers/${customerId}`, 'PUT', { billing: address, shipping: address })
}
