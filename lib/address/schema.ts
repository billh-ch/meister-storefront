import { z } from 'zod'

/** First/last name kept separate, not one field, so this maps directly onto
 *  WooCommerce's `first_name`/`last_name` fields with no guesswork split.
 *  Shared by checkout and the account "saved address" form — both collect
 *  and validate the same shape. */
export const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  country: z.string().min(2).max(2).default('GR'),
  phone: z.string().min(1),
})

export type AddressInput = z.infer<typeof addressSchema>
