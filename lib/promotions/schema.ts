import { z } from 'zod'

const minor = z.number().int().nonnegative().max(100_000_000)
export const couponCodeSchema = z.string().max(100).refine(value => !/[\x00-\x1f\x7f]/.test(value))
export function normalizeCoupon(value: unknown): string { return couponCodeSchema.parse(value).trim().toLowerCase() }
export const promotionSchema = z.object({
  type: z.enum(['coupon', 'bundle']), id: z.string().min(1).max(100), label: z.string().max(200),
  code: couponCodeSchema.optional(), version: z.string().max(100), campaign: z.string().max(200), influencer: z.string().max(200),
})
export const quoteLineSchema = z.object({
  key: z.string().min(1).max(100), productId: z.number().int().positive(), variationId: z.number().int().nonnegative(),
  attributes: z.preprocess(value => Array.isArray(value) && value.length === 0 ? {} : value, z.record(z.string().max(120), z.string().max(120))).default({}),
  quantity: z.number().int().min(1).max(99), name: z.string().min(1).max(2000), subtotal: minor, total: minor,
})
export const promotionQuoteSchema = z.object({
  version: z.literal(1), currency: z.literal('EUR'), minorUnit: z.literal(2), backendId: z.string().min(1).max(100),
  reference: z.uuid(), expiresAt: z.number().int().positive(), subtotal: minor, discount: minor, shipping: minor, total: minor, tax: minor,
  lines: z.array(quoteLineSchema).min(1).max(50),
  methods: z.array(z.object({ id: z.string().max(150), wcMethodId: z.string().max(100), title: z.string().max(300), cost: minor, isPickup: z.boolean() })).max(30),
  shippingId: z.string().max(150), promotion: promotionSchema.nullable(), provisional: z.boolean(),
  coupon: z.object({ code: couponCodeSchema, status: z.enum(['none', 'invalid', 'email_required', 'applied', 'not_better']) }),
}).superRefine((q, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
  if (q.subtotal - q.discount + q.shipping !== q.total) fail('Inconsistent checkout total')
  if (q.lines.reduce((sum, line) => sum + line.total, 0) + q.shipping !== q.total) fail('Inconsistent line totals')
  if (q.lines.some(line => line.total > line.subtotal + 1)) fail('Invalid merchandise saving')
  if (new Set(q.lines.map(line => line.key)).size !== q.lines.length) fail('Duplicate quote lines')
  const method = q.methods.find(m => m.id === q.shippingId)
  if (q.methods.length ? !method || method.cost !== q.shipping : q.shipping !== 0 || q.shippingId !== '') fail('Inconsistent delivery total')
  if (q.coupon.status === 'applied' && (q.promotion?.type !== 'coupon' || q.promotion.code !== q.coupon.code)) fail('Inconsistent coupon')
  if (q.promotion?.type === 'bundle' && q.coupon.status === 'applied') fail('Promotions cannot stack')
})
export type PromotionQuote = z.infer<typeof promotionQuoteSchema>
export type Promotion = z.infer<typeof promotionSchema>
export const attemptSchema = z.object({
  attemptId: z.string().regex(/^[a-f0-9]{64}$/), email: z.email(), orderId: z.number().int().positive(), number: z.string(),
  quote: promotionQuoteSchema, origin: z.url(), locale: z.enum(['en', 'el']), mode: z.enum(['test', 'live']),
  state: z.enum(['prepared', 'open', 'processing', 'paid', 'expired', 'failed', 'review']), sessionId: z.string(),
  expiresAt: z.number().int().positive(), createdAt: z.number().int().positive(), supersede: z.boolean().optional(),
})
export type PromotionAttempt = z.infer<typeof attemptSchema>
