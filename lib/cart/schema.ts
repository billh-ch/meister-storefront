import { z } from 'zod'

/**
 * Shape-only validation for the cart cookie. This constrains *types*, not
 * *validity* — a corrupted or hand-edited cookie decodes to `[]` here rather
 * than throwing, but a well-formed-yet-fake product id still has to survive
 * a live WooCommerce lookup before it's trusted anywhere (see
 * `lib/cart/resolve.ts` and `lib/cart/actions.ts`). This schema alone can
 * never let a tampered cookie misprice anything.
 */
export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variationId: z.string().min(1).optional(),
  quantity: z.number().int().positive().max(99),
})

export const cartSchema = z.array(cartItemSchema).max(50)

export type CartItem = z.infer<typeof cartItemSchema>
