import { z } from 'zod'

/** First/last name kept separate, not one field, so this maps directly onto
 *  WooCommerce's `first_name`/`last_name` order fields with no guesswork split. */
export const checkoutAddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  country: z.string().min(2).max(2).default('GR'),
  phone: z.string().min(1),
})

export type CheckoutAddressInput = z.infer<typeof checkoutAddressSchema>
