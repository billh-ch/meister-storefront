import { wcMutate } from '../client'
import { lockerOrderMetaData, requiresBoxNowLocker, type BoxNowLocker } from '@/lib/checkout/box-now'

export interface WcAddress {
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  city: string
  postcode: string
  country: string
  phone?: string
  /** Guest orders need the email on the billing address — a logged-in order
   *  gets it from the WooCommerce customer record instead. */
  email?: string
}

export interface CreateOrderLineItem {
  productId: number
  variationId?: number
  quantity: number
  /** Extra choices the variation doesn't already carry (e.g. an "Any …" skin
   *  colour the shopper picked) — surfaced on the order so the shop can pick
   *  and pack the right item. `key`/`value` is WooCommerce's line-item meta
   *  shape; `key` shows as the label in the admin. */
  metaData?: { key: string; value: string }[]
  /** Chosen add-ons (`"group:option"`, `lib/addons`). Sent as the hidden line
   *  meta `_meister_addons`; the meister-product-addons plugin re-checks them
   *  against the product, prices them and adds the visible add-on lines. */
  addonRefs?: string[]
}

/** Hidden order-line meta read by `wordpress/meister-product-addons`. */
export const ADDONS_LINE_META_KEY = '_meister_addons'

export interface CreateOrderShippingLine {
  /** WooCommerce's shipping method *type* (`flat_rate`, `local_pickup`, a
   *  plugin's own slug, …) — from `ShippingMethod.wcMethodId`
   *  (`lib/woocommerce/index.ts`), not the app's own zone-scoped selection id. */
  methodId: string
  methodTitle: string
  /** Decimal string, e.g. `'3'` or `'0'` — same format WooCommerce itself
   *  uses for `shipping_lines[].total`. */
  total: string
}

export interface CreateOrderInput {
  /** Omitted / undefined for a guest checkout — sent to WooCommerce as
   *  `customer_id: 0`, which creates a real guest order keyed off
   *  `billing.email`. */
  customerId?: number
  lineItems: CreateOrderLineItem[]
  billing: WcAddress
  shipping: WcAddress
  transactionId: string
  /** Omitted only if checkout somehow completed with no resolvable method —
   *  the order then simply has no shipping_lines, same as before this field
   *  existed. */
  shippingLine?: CreateOrderShippingLine
  boxNowLocker?: BoxNowLocker
  /** Shopper's language, kept on the order so later emails use it. */
  locale?: string
  /** Native WooCommerce coupon, already validated and charged by Stripe. */
  coupon?: { code: string; discount: number }
}

export interface WcCreatedOrder {
  id: number
  number: string
  status: string
  total: string
  transaction_id: string
}

/**
 * Creates the real WooCommerce order. Deliberately **no price field** on any
 * line item — WooCommerce prices `line_items` itself from its own live
 * product data when only `product_id`/`variation_id`/`quantity` are given,
 * so nothing here can dictate a price, only reference a product/variation id.
 * Add-ons follow the same rule: only their ids travel (`_meister_addons`),
 * and the meister-product-addons plugin prices them inside WooCommerce with
 * WooCommerce's own VAT calculation, before totals and coupons are applied.
 *
 * Deliberately **no mock fallback and no try/catch-to-mock** — a failed
 * order creation must throw and surface as a real failure, never silently
 * succeed against fake data.
 */
export async function createOrder(input: CreateOrderInput): Promise<WcCreatedOrder> {
  if (!input.coupon) return wcMutate<WcCreatedOrder>('/orders', 'POST', orderBody(input))
  try {
    // WooCommerce applies the coupon itself and records its usage.
    return await wcMutate<WcCreatedOrder>('/orders', 'POST', { ...orderBody(input), coupon_lines: [{ code: input.coupon.code }] })
  } catch (error) {
    // The customer has already paid the discounted amount. If WooCommerce now
    // refuses the coupon (for example its last use was just taken), the order
    // must still be created at the paid price. Only a definite 4xx answer is
    // retried — a timeout may have committed and is reconciled by the caller.
    if (!(error instanceof Error) || !/request failed: 4\d\d\b/.test(error.message)) throw error
    const { code, discount } = input.coupon
    return wcMutate<WcCreatedOrder>('/orders', 'POST', {
      ...orderBody(input),
      fee_lines: [{ name: `Discount code ${code}`, total: (-discount).toFixed(2), tax_status: 'none' }],
      meta_data: [
        ...(orderBody(input).meta_data ?? []),
        { key: 'meister_coupon_fallback', value: `${code}: WooCommerce rejected the coupon after payment; discount applied as a fee. VAT lines not reduced.` },
      ],
    })
  }
}

/** Visible to the shop team only. */
export async function addOrderNote(orderId: number, note: string): Promise<void> {
  await wcMutate(`/orders/${orderId}/notes`, 'POST', { note, customer_note: false })
}

function orderMeta(input: CreateOrderInput): { key: string; value: string }[] {
  return [
    ...(input.boxNowLocker && requiresBoxNowLocker(input.shipping.country, input.shippingLine?.methodId) ? lockerOrderMetaData(input.boxNowLocker) : []),
    ...(input.locale === 'en' || input.locale === 'el' ? [{ key: 'meister_locale', value: input.locale }] : []),
  ]
}

function orderBody(input: CreateOrderInput) {
  return {
    customer_id: input.customerId ?? 0,
    line_items: input.lineItems.map((item) => {
      const metaData = [
        ...(item.metaData ?? []),
        ...(item.addonRefs && item.addonRefs.length > 0 ? [{ key: ADDONS_LINE_META_KEY, value: item.addonRefs.join(',') }] : []),
      ]
      return {
        product_id: item.productId,
        variation_id: item.variationId,
        quantity: item.quantity,
        ...(metaData.length > 0 ? { meta_data: metaData } : {}),
      }
    }),
    ...(input.shippingLine
      ? {
          shipping_lines: [
            {
              method_id: input.shippingLine.methodId,
              method_title: input.shippingLine.methodTitle,
              total: input.shippingLine.total,
            },
          ],
        }
      : {}),
    billing: input.billing,
    shipping: input.shipping,
    ...(orderMeta(input).length > 0 ? { meta_data: orderMeta(input) } : {}),
    payment_method: 'stripe',
    payment_method_title: 'Credit Card (Stripe)',
    set_paid: true,
    transaction_id: input.transactionId,
    status: 'processing',
  } as { meta_data?: { key: string; value: unknown }[] } & Record<string, unknown>
}
