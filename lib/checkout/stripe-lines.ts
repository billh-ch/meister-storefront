import type { ResolvedCartLine } from '@/lib/cart/resolve'
import { formatVariationLabel } from '@/lib/cart/variation-label'
import { encodeAddonRefs, toCents } from '@/lib/addons/contract'
import { formatPrice } from '@/lib/mock-data'

/**
 * Pure builders for the Stripe Checkout Session, kept out of the Server
 * Action so the exact amounts and metadata can be unit-tested.
 */

/** Stripe caps one metadata value at 500 characters. */
export const STRIPE_METADATA_VALUE_LIMIT = 500

export interface CartLineMeta {
  p: string
  v?: string
  q: number
  /** Axis picks the variation does not pin ("Any …" axes). Nice to have. */
  a?: Record<string, string>
  /** Chosen add-ons, `"group:option,group:option"`. Never dropped: they are paid for. */
  o?: string
}

export function cartLineMeta(lines: ResolvedCartLine[]): CartLineMeta[] {
  // `a` is only the axes the variation does NOT pin ("Any …" axes like skin
  // colour / hardness) — WooCommerce already records the pinned ones on the
  // order from `variation_id`, so this is the minimum the shop needs to
  // fulfil the right item.
  return lines.map((line) => {
    const extraOptions = Object.fromEntries(
      Object.entries(line.attributes).filter(([name]) => !(name in line.variantAttributes)),
    )
    return {
      p: line.productId,
      v: line.resolvedVariationId ?? line.variationId,
      q: line.quantity,
      ...(Object.keys(extraOptions).length > 0 ? { a: extraOptions } : {}),
      ...(line.chosenAddons?.length ? { o: encodeAddonRefs(line.chosenAddons.map((addon) => addon.ref)) } : {}),
    }
  })
}

/**
 * The `cartLines` metadata value. If a big multi-axis cart would exceed
 * Stripe's limit, the `a` fields go first (our own summary still shows
 * them). Add-ons are part of what is paid for and are never dropped: if even
 * the reduced form does not fit, checkout must stop instead.
 */
export function cartLinesMetadata(lines: ResolvedCartLine[]): string | null {
  const meta = cartLineMeta(lines)
  const full = JSON.stringify(meta)
  if (full.length <= STRIPE_METADATA_VALUE_LIMIT - 20) return full
  const reduced = JSON.stringify(meta.map(({ p, v, q, o }) => ({ p, v, q, ...(o ? { o } : {}) })))
  return reduced.length <= STRIPE_METADATA_VALUE_LIMIT ? reduced : null
}

export interface StripeLineItem {
  price_data: {
    currency: 'eur'
    product_data: { name: string; description?: string }
    unit_amount: number
  }
  quantity: number
}

/** "Full camo pattern (+€40.00), Knee pads (+€25.00)" in the shopper's language. */
export function addonSummary(line: Pick<ResolvedCartLine, 'chosenAddons'>): string {
  return (line.chosenAddons ?? []).map((addon) => `${addon.optionName} (+${formatPrice(addon.priceCents / 100)})`).join(', ')
}

/**
 * Product lines for Stripe's hosted page. `unit_amount` is exactly the
 * resolved `unitPrice` (variation + add-ons) in cents, never anything the
 * browser sent. Add-ons are named in the description so the last screen
 * before payment and the receipt match our own checkout summary.
 */
export function stripeProductLineItems(lines: ResolvedCartLine[], t: (source: string) => string): StripeLineItem[] {
  return lines.map((line) => {
    const variation = formatVariationLabel(line.attributes, ', ', t)
    const addons = addonSummary(line)
    return {
      price_data: {
        currency: 'eur',
        product_data: {
          name: variation ? `${line.name} (${variation})` : line.name,
          ...(addons ? { description: `${t('Add-ons')}: ${addons}` } : {}),
        },
        unit_amount: toCents(line.unitPrice),
      },
      quantity: line.quantity,
    }
  })
}
