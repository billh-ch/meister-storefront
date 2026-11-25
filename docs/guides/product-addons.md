# Product add-ons

Optional paid extras on a product, for example a camo pattern or knee pads on a wetsuit. A customer can combine them with any size or thickness, including made to measure. There are two parts:

- **WordPress plugin** `wordpress/meister-product-addons/` (ZIP in `wordpress/dist/`). It stores the add-ons, gives the shop an editor box, and prices the add-ons on WooCommerce orders.
- **Storefront** `lib/addons/contract.ts`. It parses the add-ons, and the product page, cart, checkout, Stripe webhook and emails all use it.

Both sides follow the contract below exactly. `wordpress/fixtures/product-addons-contract.json` holds valid and invalid cases. Both the TypeScript test and the PHP test run them, so the two validators cannot drift apart.

## Data contract (version 1)

The add-ons live in the product meta `meister_addons`, on the parent product, never on a variation. The key has no leading underscore, so WooCommerce REST returns it in `meta_data`. The value is a JSON string:

```json
{ "version": 1, "groups": [
  { "id": "camo", "type": "single",
    "name": { "en": "Camo pattern", "el": "Μοτίβο παραλλαγής" },
    "options": [ { "id": "split", "name": { "en": "Split camo pattern", "el": "…" }, "price": "30.00" } ] } ] }
```

- **`type`** is `single` (pick at most one, shown as radios with "None") or `multi` (any number, shown as checkboxes). Every add-on is optional. v1 has no required groups.
- **`price`** is in EUR with exactly 2 decimals, includes VAT like product prices, and is above 0 and below 100000.
- **Ids** are lowercase slugs (`a-z`, `0-9`, single hyphens, at most 40 characters). Group ids are unique within the product. Option ids are unique across the whole product. Once saved, an id never changes.
- **Names** need both `en` and `el`. Each is at most 80 characters, with no `<`, `>`, control characters or surrounding spaces.
- **Limits:** at most 10 groups, 20 options per group, 40 options in total, and 20000 bytes of JSON.
- **Exact keys only.** An unknown version, invalid JSON, an unknown key or a duplicate `meister_addons` meta entry each mean the product has **no add-ons** (fail closed). Nothing is guessed or repaired.

The storefront only offers add-ons when the product's REST response also carries `meister_addons_pricing: 1`. The active plugin adds that field. Without it, the shop could charge for extras that the WooCommerce order would not contain.

## Editing add-ons in WP Admin

**Products → edit product → "Add-ons (paid extras)"** box (classic product editor).

- Each group has an English name, a Greek name and a type: **Choose one (or none)** or **Any number**.
- Each option has an English name, a Greek name and a price in € including VAT. You can type `30`, `30,5` or `30.50`.
- Ids are created from the English name the first time you save, then shown read-only.
- Blank rows are ignored. To add another group, fill the "New group" block and save. Each save adds a fresh blank group and blank option rows.
- **Remove** checkboxes delete an option or a whole group. Removing everything deletes the field.
- **Invalid input is refused as a whole.** The stored add-ons stay as they were, and a red notice explains the problem. The box checks the nonce and the `edit_product` permission.
- **Duplicate** (WooCommerce's "Copy to a new draft") copies the add-ons.
- **WP-CLI:** `wp meister-addons get <product-id>` prints the stored JSON. `wp meister-addons set <product-id> --file=addons.json [--dry-run]` validates and stores it.
- A generic REST write of an invalid `meister_addons` value is refused with HTTP 400.

To reuse the same add-ons on a new product, duplicate an existing wetsuit, or `get` the JSON from one product and `set` it on another. No code change is needed.

## How pricing flows

1. **Product page.** It shows the groups with their prices (display only), the unit price including the chosen add-ons, and the line price.
2. **Add to cart.** `addToCartAction` sends only references like `camo:full` and `extras:knee-pads`. They are checked strictly against the live product, and anything invalid is refused. The cart cookie stores the sorted references. The same product with different add-ons is a separate cart line (`lib/cart/line-key.ts`).
3. **Every cart read.** `lib/cart/resolve.ts` re-reads the product from WooCommerce and sets `unitPrice = variation price + sum(add-on prices)`, in whole cents. Nothing from the cookie is ever charged. A reference the product no longer offers, or a tampered one (duplicate, or two options of a pick-one group), makes the line **unpurchasable**, and the customer is asked to remove and re-add it. An add-on is never silently dropped or charged.
4. **Coupons.** `lib/coupons/` works on `unitPrice`, so percentage coupons discount the add-ons too.
5. **Stripe.** `lib/checkout/stripe-lines.ts` sets `unit_amount = unitPrice` in cents and lists the add-ons in the line description. Session metadata `cartLines[].o` carries the references (`camo:full,extras:knee-pads`), never prices. If the metadata would exceed Stripe's 500-character limit, the optional `a` labels are dropped first. Add-ons are never dropped: checkout stops instead. The checkout signature includes add-on prices, so a price change between the summary and payment is caught.
6. **WooCommerce order.** The verified Stripe webhook creates the order with the hidden line meta `_meister_addons`, ids only and no price field. The plugin hooks `woocommerce_rest_pre_insert_shop_order_object`. That hook runs after the lines exist and before WooCommerce calculates taxes, totals and coupons. The plugin then:
   - re-checks the references against the product;
   - takes the VAT-inclusive unit price (the product's current price plus the add-ons) and passes it through WooCommerce's own `wc_get_price_excluding_tax` to get the line's net subtotal and total, exactly as WooCommerce prices a product. WooCommerce then adds VAT and applies coupons itself;
   - records each add-on as visible line meta, for example `Camo pattern: Full camo pattern (+€40.00)`, plus the hidden `_meister_addons_total`.

   A line the plugin cannot price keeps the product price and gets `_meister_addons_error`. The order is never blocked, because the customer has already paid.
7. **Total check.** `lib/checkout/total-check.ts` runs whenever an order has a coupon **or add-ons**. It compares WooCommerce's total with Stripe's `amount_total` in whole cents and adds a private order note on any difference.
8. **Emails.** The confirmation, owner alert, completed, cancelled and refund emails list the visible add-on meta under each item, because they print the line's non-underscore meta.
9. **Cancellation and refunds.** A customer cancellation refunds the whole Stripe payment (`lib/orders/cancel-deps.ts` passes no amount), so the add-on cost is included. Refunds made in Stripe are mirrored with Stripe's own amount.

## Verified on staging (2026-11-24, WooCommerce 11.2.1, prices include 24% VAT)

Test orders were created through `/wc/v3/orders` with the same body the storefront sends. They were then deleted, together with a temporary 10% coupon.

| Case | Stripe would charge | WooCommerce total |
|---|---|---|
| MTM 5mm + full camo, knee pads, urine system | 590.00 | 590.00 |
| 4mm × 2 + split camo | 760.00 | 760.00 |
| MTM 5mm + 3 add-ons, 10% coupon | 531.00 | 531.00 |
| 5mm × 3 + 2 add-ons and a plain line, 10% coupon | 1629.00 | 1629.00 |
| 7mm × 2 + every add-on | 1420.00 | 1420.00 |

**Known pre-existing difference (not caused by add-ons):** WooCommerce adds VAT on top of the `shipping_lines` total that the webhook sends (€3.00 became €3.72). The storefront charges the delivery price as shown. Orders with paid delivery therefore come out 24% of the delivery price higher in WooCommerce, and the total check will flag those that have add-ons or a coupon.

## Tests

```sh
pnpm test                                            # includes tests/product-addons.test.mjs and the webhook cases
python3 tests/product-addons-php-run.py              # plugin PHP tests (or --ssh user@host -i key: stdin only)
python3 tests/product-addons-php-package.test.py     # reproducible ZIP, matches wordpress/dist/
python3 wordpress/build-zip.py --plugin meister-product-addons
node tests/product-addons.browser.mjs                # mock-mode dev server on :3001 (mock wetsuit "wetsuit-3mm")
```
