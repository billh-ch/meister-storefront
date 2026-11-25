import type { StoreApiShippingRate } from '../queries/get-shipping-rates'

export interface ShippingAmounts {
  /** What the customer pays, VAT included: Store API `price` + `taxes`. */
  cost: number
  /** WooCommerce's own rate before VAT (Store API `price`). Sent as the order's
   *  shipping line, so WooCommerce adds back exactly the VAT it quoted. */
  netCost: number
}

const minorUnits = (value: string | undefined): number | null => {
  if (value === undefined || value === '') return 0
  return /^\d+$/.test(value) ? Number.parseInt(value, 10) : null
}

/**
 * WooCommerce stores delivery rates WITHOUT VAT (unlike product prices) and
 * the Store API reports the rate's `price` and its `taxes` separately, in
 * minor units. Charging only `price` (the old behaviour) undercharged every
 * paid delivery by its VAT while the WooCommerce order recorded it.
 */
export function shippingAmounts(rate: Pick<StoreApiShippingRate, 'price' | 'taxes' | 'currency_minor_unit'>): ShippingAmounts {
  const price = minorUnits(rate.price)
  const taxes = minorUnits(rate.taxes)
  if (price === null || taxes === null) throw new Error('WooCommerce returned an unreadable delivery price.')
  const scale = 10 ** rate.currency_minor_unit
  return { cost: (price + taxes) / scale, netCost: price / scale }
}
