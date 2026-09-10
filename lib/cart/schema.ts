import { z } from 'zod'

/**
 * WooCommerce ids are always numeric. Constraining to digits here isn't just
 * shape validation — `lib/woocommerce/client.ts` concatenates this string
 * directly into a REST path (`/products/${id}`) before calling `new URL()`,
 * so an id like `"../customers"` would otherwise resolve, via ordinary URL
 * dot-segment normalization, to a request against a completely different
 * WooCommerce endpoint using this app's admin credentials. Rejecting
 * anything non-numeric here closes that off before the string ever reaches
 * a fetch.
 */
const wcIdSchema = z.string().regex(/^\d+$/, 'Invalid id')

/**
 * Shape-only validation for the cart cookie. This constrains *types*, not
 * *validity* — a corrupted or hand-edited cookie decodes to `[]` here rather
 * than throwing, but a well-formed-yet-fake product id still has to survive
 * a live WooCommerce lookup before it's trusted anywhere (see
 * `lib/cart/resolve.ts` and `lib/cart/actions.ts`). This schema alone can
 * never let a tampered cookie misprice anything.
 */
/**
 * The full set of variation-axis choices the shopper made on the PDP, keyed
 * by attribute name (`{ "Σκληρότητα": "M", "Skin Color": "Πράσινο - Green" }`).
 *
 * WooCommerce only pins *some* axes on a variation — any axis left as "Any …"
 * in WP admin is absent from the variation object, so `variationId` alone
 * loses those picks. Storing the shopper's whole selection here keeps the
 * cart, checkout summary, and order line honest about what was actually
 * chosen. Bounded (12 keys, 120 chars each) so the cart cookie stays small;
 * values are re-checked against the live product in `addToCartAction`.
 */
const selectedOptionsSchema = z
  .record(z.string().min(1).max(120), z.string().min(1).max(120))
  .refine((options) => Object.keys(options).length <= 12, {
    message: 'Too many options',
  })

export const cartItemSchema = z.object({
  productId: wcIdSchema,
  variationId: wcIdSchema.optional(),
  quantity: z.number().int().positive().max(99),
  selectedOptions: selectedOptionsSchema.optional(),
})

export const cartSchema = z.array(cartItemSchema).max(50)

export type CartItem = z.infer<typeof cartItemSchema>
