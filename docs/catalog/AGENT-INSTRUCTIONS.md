# New catalog: instructions for the migration agent

You are building a **new WooCommerce catalog on a TEST server** for Meister & Meister Dive, a headless Next.js storefront (this repository). You run on the test server with WP-CLI. The old catalog lives on a Raspberry Pi ("the Pi"); you may only **read** from it.

Read these first: `docs/catalog/structure.json` (the target structure, settings, gear-finder bindings and glossary), `wordpress/README.md` (translations plugin), `docs/frontend-product-translations.md`, `docs/guides/product-content-template.md`.

## Hard rules (never break these)

1. **The Pi is read-only.** Only HTTP `GET` requests to the Pi. No POST/PUT/PATCH/DELETE, no SSH, no WP-CLI against the Pi.
2. **Confirm the target.** Before any write, check `wp option get siteurl` equals the `TEST_SITE_URL` the owner gave you. If it doesn't, stop.
3. **Back up before every write phase:** `wp db export` into the private work directory. Record the file name in the report.
4. **Secrets stay secret.** Read credentials only from `~/.config/meister/pi-export.env` (owner-created, mode 600). Never print, log, commit or copy them into reports or files. Never paste them into chat.
5. **Dry run first.** Every write script supports `--dry-run` and is run that way first. Writes must be idempotent: re-running updates the same objects instead of duplicating them (match products by the `meister_legacy_id` meta).
6. **Drafts only.** Every product you create stays `draft`. Never publish. Never publish translations.
7. **Stop at the gates** marked 🛑 and wait for the owner's explicit approval.
8. **Never invent facts.** No made-up specs, sizes, prices, stock, SKUs, compatibility, shipping promises or reviews. If something is missing or ambiguous, leave it empty and list it in the report.
9. **Do not migrate** customers, orders, coupons, reviews or users. Do not install plugins that are not listed here.
10. **Do not push to GitHub.** Put all scripts and outputs in the private work directory `~/catalog-migration/` (mode 700).

## Inputs from the owner

- `TEST_SITE_URL` and the WordPress install path (e.g. `/var/www/html`).
- A WordPress **admin user ID** for `wp --user=<id>`. Don't guess one.
- `~/.config/meister/pi-export.env` containing `PI_WC_URL`, `PI_WC_KEY`, `PI_WC_SECRET` (read-only WooCommerce REST key) and `PI_PROXY_TOKEN`. Every Pi request must send the header `X-Meister-API-Key: $PI_PROXY_TOKEN` and use HTTP basic auth with the key/secret, over HTTPS.

## Phase 0: Preflight (no writes)

- Record versions: WordPress, PHP (needs ≥ 8.1), WooCommerce (needs ≥ 9.6 for built-in Brands; if WooCommerce is missing, note that Phase 1 installs it), WP-CLI.
- Confirm the target site URL (rule 2).
- Test **one** read-only request to the Pi: `GET $PI_WC_URL/wp-json/wc/v3/products?per_page=1`. Report the HTTP status only.
- Report and continue to Phase 1 only if everything passes.

## Phase 1: Baseline setup (writes to the TEST server)

Back up first (rule 3). Then:

1. Install and activate **WooCommerce** (latest stable) if it isn't active.
2. Apply every option in `structure.json → settings` (`wp option update`). Set the permalink structure with `wp rewrite structure '/%postname%/' && wp rewrite flush`.
3. Tax: create the rates in `structure.json → tax` (standard class). **This is a placeholder for the owner's accountant. Say so in the report.**
4. Disable every email class in `structure.json → disable_native_emails` (set each email's `enabled` to `no` in its `woocommerce_<id>_settings` option). The storefront sends its own emails, and this server can't send mail reliably.
5. Create the category tree from `structure.json → sections`: each section as a top-level `product_cat` with **exactly** the given slug, and its children under it. Use the English `name`. Store `name_el` as the term description for reference.
6. Install the translations plugin from this repo: `wp plugin install <repo>/wordpress/dist/meister-product-translations-1.0.0.zip --activate`. First verify the ZIP contents and SHA-256 as described in `wordpress/README.md`.
7. Install and activate **"JWT Authentication for WP REST API"** (slug `jwt-authentication-for-wp-rest-api`). Generate a random 64-character secret **on the server** (`openssl rand -hex 32`) and add `define('JWT_AUTH_SECRET_KEY', '...');` to `wp-config.php` above "That's all, stop editing". Never print the value. If the web server is Apache, make sure the `Authorization` header reaches PHP (the plugin's readme explains how). Report which web server it is.
8. **Do not** install BOX NOW, payment gateways, caching, SEO or page-builder plugins. BOX NOW needs the owner's credentials and comes later.

Report what you changed.

## Phase 2: Export from the Pi (read-only)

Into `~/catalog-migration/export-<YYYYMMDD>/`:

- All **published** products (`status=publish`, paginate with `per_page=100`), raw JSON including `meta_data`, `attributes`, `categories`, `images`, `sku`, prices, stock, `weight`, `dimensions`, `type`.
- For every variable product: all its variations (`/products/<id>/variations`, paginated).
- All product categories, product attributes and their terms, shipping zones with their locations and methods, tax rates, and the general settings group. These are for reference only.
- Do **not** export customers, orders, coupons or reviews.

Write a manifest with counts (products by type, variations, categories, attributes) and the export time.

## Phase 3: Proposal (no writes) 🛑

Analyse the export and write `~/catalog-migration/proposal.md` plus `mapping.json`.

1. **Category mapping:** every Pi category ID → a new category slug, using `legacy_ids` in `structure.json`. List any Pi category used by products that has **no** mapping, with product counts. Don't guess these. Propose a mapping and mark it "needs owner decision".
2. **Attribute plan:** list every attribute (global and custom) and its values. Propose a consolidated set of **global** attributes with English names and slugs (e.g. `pa_size`, `pa_thickness`, `pa_stiffness`, `pa_color`), and how each old attribute and value maps. Merge duplicates and spelling variants. Never merge values that mean different things. Brand (`pa_εταιρία`) becomes WooCommerce **Brands**, not an attribute.
3. **Per-product table:** legacy ID, Greek name, proposed English name and slug, type, target categories, SKU, price, stock, number of images and variations, and issues.
4. **Issues to flag:** missing or duplicate SKUs; variable products whose variations have empty or partial attributes, or that are unreachable or duplicated; prices ≤ 0 or missing; sale price ≥ regular price; missing images; page-builder shortcodes (`vc_`, `woodmart_`) in descriptions; products in no mapped category; any `structure.json → gear_finder` legacy ID that isn't in the export.
5. **Shipping:** describe the Pi's zones and methods. Recreate them with the **before-VAT costs in `structure.json → shipping`** (not the Pi's old €3/€5/€10/€15, which the storefront would now charge plus VAT). Don't recreate BOX NOW; the owner enters its price, also before VAT.

**Stop here.** Tell the owner the proposal is ready. Continue only when the owner approves it, with their decisions on every flagged item.

## Phase 4: Import (writes, after approval)

Back up first. Scripts must be idempotent and dry-run first.

1. Create the approved global attributes and terms. Create Brands terms (`product_brand`).
2. For each product (find by `meister_legacy_id` meta → update, else create), with `status=draft`:
   - **English** `name`, `short_description`, `description`. Translate faithfully from the Greek using `structure.json → glossary_el_en`.
     - Keep all numbers, units, model names and brand names exactly.
     - Turn manually typed `>` bullet lines into real `<ul>` lists. Strip page-builder shortcodes. Use H2+ headings only.
     - No marketing additions, no new claims.
     - Where a term is uncertain, keep the meaning literal and list it in the report.
   - **Slug:** English, lowercase, hyphenated, unique.
   - **Commerce fields, exactly as on the Pi:** `sku` (keep the existing one; never invent), `regular_price`, `sale_price`, `manage_stock`, `stock_quantity`, `stock_status`, `backorders`, `weight`, `dimensions`, `tax_status=taxable`, `tax_class` standard.
   - **Categories:** the product's **top-level section** (exactly one) **plus** its mapped subcategories. This is the storefront's contract: it reads the section slug.
   - **Brand:** the Brands term.
   - **Attributes:** the approved global attributes, with the original `visible` and `variation` flags.
   - **Images:** sideload from the Pi image URL into this site's media library. Keep their order, set meaningful English alt text, and don't hotlink.
   - **Meta:** `meister_legacy_id` = the Pi product ID. `meister_gear_finder` = the value from `structure.json → gear_finder.by_legacy_id` for those 16 products only.
3. **Variations:** recreate each with its exact attribute combination, prices, stock, SKU and image. If a Pi variation has empty or ambiguous attributes, **skip it** and report it. Never guess which option it was.
4. Don't create products the owner excluded in the approval.

## Phase 5: Greek translations (writes, drafts only)

For products in batches of at most 50 IDs, logged in as the admin user:

1. `wp --user=<id> meister-translations export --ids=<ids> --locale=el` gives each product's current English source and its `source_hash`.
2. Build a job (`version: 1`, `locale: "el"`) where each product's `translation` is the **original Greek** name, short description and description from the Pi export, cleaned the same way (lists, no shortcodes). Keep the `id` and `source_hash` from step 1.
3. Run the import **without** `--apply` (dry run), check the output, then run it with `--apply`. **Never use `--publish` or `--overwrite`.** Never use `generate`; it calls a paid provider.

If the English text of a product changes after this, its Greek translation stops showing (hash mismatch). That is by design. Note it in the report.

## Phase 6: Verify and report

Write `~/catalog-migration/report.md`:

- **Counts:** exported, created, updated, skipped (with reasons), and variations created or skipped.
- **Checks, with a pass/fail line each:**
  - every product has exactly one top-level section category;
  - every variable product has at least one purchasable variation;
  - every price is > 0;
  - every product has at least one image;
  - each of the 16 `meister_gear_finder` values is on exactly one product;
  - every product has a Greek translation draft.
- **Lists:**
  - items needing a decision (uncertain translations, missing data, skipped variations);
  - the backup file names;
  - the placeholders (VAT rate, shipping) still waiting on the owner.
- **A short "how to review"** for the owner: which products to look at first (the 16 gear-finder products, then best sellers).

Don't publish anything. The owner reviews and publishes.
