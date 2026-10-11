import type { ResolvedCart, ResolvedCartLine } from '@/lib/cart/resolve'
import type { ShippingMethod } from '@/lib/woocommerce'
import type { AddressInput, ShippingAddressInput } from '@/lib/address/schema'

export interface CheckoutCartIssue { name: string; slug: string; message: string }
export type ShippingQuote =
  | { status: 'ready'; methods: ShippingMethod[]; cartSignature: string }
  | { status: 'cart'; error: string; issues: CheckoutCartIssue[] }
  | { status: 'error' | 'address'; error: string }

export function normalizeShippingAddress(values: Partial<AddressInput>): ShippingAddressInput {
  return {
    country: (values.country ?? 'GR').trim().toUpperCase(),
    ...(values.city?.trim() && { city: values.city.trim() }),
    ...(values.postcode?.trim() && { postcode: values.postcode.trim() }),
    ...(values.address1?.trim() && { address1: values.address1.trim() }),
  }
}

/** A consistency check only. All charged amounts still come from WooCommerce. */
export function checkoutCartSignature(lines: ResolvedCartLine[]): string {
  return JSON.stringify(lines.map(line => [line.productId, line.resolvedVariationId ?? line.variationId ?? '', line.quantity, line.unitPrice, Object.entries(line.attributes).sort()]))
}

export function checkoutCartIssues(cart: ResolvedCart): CheckoutCartIssue[] {
  return cart.lines.filter(line => !line.purchasable).map(line => ({
    name: line.name, slug: line.slug,
    message: line.checkoutIssue ?? 'This option is out of stock. Please update or remove this item.',
  }))
}
