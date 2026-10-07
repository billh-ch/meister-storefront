# Meister owner checklist: improving the store and maintaining the outcome

Updated: 7 October 2026. Use alongside the [optimization plan](../superpowers/plans/2026-10-07-storefront-optimization.md).

Technical implementation can improve presentation, discoverability, update handling and measurement. You own the product facts, business terms, accounts, budgets and operational follow-through. Not everything below is needed before the first SEO release.

## 1. Before real-data preview acceptance

- [ ] In Vercel, confirm Preview has the working WooCommerce URL/key/secret settings. Use real-data mode (`NEXT_PUBLIC_USE_MOCK_DATA=false`) for integration acceptance; deliberately configured mock mode is for isolated UI tests only.
- [ ] Compare Preview and Production variable scopes, not just variable names. Redeploy after changing settings. Do not post secret values in chat; give access through supported account permissions or secure environment settings.
- [ ] Provide an authorized way to inspect the protected preview and its deployment/function logs. A login-protected preview is fine, but testing must use an authorized session.
- [ ] Identify which WooCommerce database each environment uses and which Stripe mode it uses. Keep development orders/test payments separate from live sales; identify emails/fulfillment automations that test activity could trigger.
- [ ] Move the backend to a stable HTTPS endpoint or a stable managed tunnel when ready. Decide hosting/DNS ownership and arrange backups/restoration tests. The current observed media URLs still use a temporary Cloudflare tunnel.
- [ ] Confirm whether the public storefront stays on `meister-storefront.vercel.app` or moves to a custom domain. We can begin with the current address; do not change domains/slugs without redirects and a migration plan.

**Done when:** a preview using real products can add simple/variable products, edit/remove lines, display images and complete an authorized test checkout. Knowing the local tests pass is not a substitute for this check.

## 2. Before publishing policy, trust and shipping changes

Previously deferred business details stay under your control. The public site you supplied (`https://dive-meister.com/`) is a reference; confirm the information applies to this storefront before publication.

- [ ] Confirm legal/business name, trading name, location, actual support email/phone and support hours.
- [ ] Supply final links to your social profiles; generic platform homepages do not help customers find you.
- [ ] Approve privacy/terms/returns/shipping text with qualified advice where needed. Include exclusions for custom-made goods and handling of defective items if relevant.
- [ ] List shipping countries, actual delivery methods/rates, pickup instructions and any real free-shipping thresholds. Confirm taxes/duties wording for international purchases.
- [ ] Set realistic in-stock dispatch times and backorder/custom-production lead times. Do not use one blanket promise unless it is true for all affected products.
- [ ] Confirm which products are new/used and what warranties apply before these claims appear in schema or marketing.
- [ ] Supply only genuine reviews that can be attributed/published appropriately. “Verified purchase” requires verification; review stars must not be invented.

**Done when:** contact/policy pages are accurate and reachable, checkout matches the stated rates/rules and no dummy contact information or unconfirmed promise remains.

## 3. Improve WooCommerce product records

Prioritize top-selling/high-value products and those with poor descriptions or many sizing questions. Technical formatting fixes cannot replace missing or incorrect facts.

For each priority product:

- [ ] Use a clear product name: brand/model, product type and important differentiator. Preserve the present language until the planned English conversion.
- [ ] Write a short description answering “what is it, who is it for, why choose it?” using substantiated benefits.
- [ ] Structure the full description: suitability, specifications, sizing/compatibility, included items, care/maintenance and limitations. Avoid copy-pasted builder markup.
- [ ] Repair broken characters/encoding in the source. Verify model/material/thickness/length/specification values against manufacturer information.
- [ ] Check all selectable variations: size/color/thickness/other axes, prices, sale prices, stock, images and deliberate “Any…” settings. Repair legacy empty variation attributes where they prevent reliable selection/fulfillment.
- [ ] Assign correct categories and brand attributes. Add genuine SKU/GTIN/MPN identifiers when available; leave unknown identifiers blank.
- [ ] Upload sharp, accurate photos: main product image, details, alternative views and useful sizing/scale images. Avoid embedding large blank margins in the image file; CSS cannot remove photographic whitespace reliably.
- [ ] Keep sale dates, prices, stock and backorder settings accurate. Remove obsolete products intentionally and plan redirects when changing URLs.
- [ ] Do not rename/transliterate existing slugs until we have a tested redirect map; existing links and search traffic must keep working.

**Suggested starting batch:** 10 important products covering fins, suits, guns and accessories, including at least one variable and one legacy-description product. This is a manageable editing batch, not a claim about which items are your best sellers.

## 4. During cache and checkout implementation

- [ ] Configure signed WooCommerce product update/delete webhooks using the documented storefront endpoint and a secure shared secret. Verify delivery logs with us after setup.
- [ ] Verify Stripe webhook endpoints/events and signing secrets belong to the correct test/live environment. Do not change payment mode just because the website deployment is called Production.
- [ ] Provide authorized access to test payment/order/Redis diagnostics if needed. Confirm a test payment creates one order with matching total and all selected options.
- [ ] Check order emails, inventory adjustments, refunds/cancellations, fulfillment status and customer/account visibility against your operational workflow.
- [ ] If testing identifies a required WooCommerce plugin/server change, arrange its installation and backup through whoever maintains WordPress. REST product/order credentials do not imply plugin/hosting administration access.

## 5. After technical SEO is deployed

- [ ] Verify ownership of the final public domain in Google Search Console. Add appropriate collaborator access if you want help reviewing it.
- [ ] Submit the production sitemap once the route is live; inspect representative products/categories for canonical URL, indexability and rendered content.
- [ ] Monitor indexing errors and product rich-result reports. Optional schema warnings do not justify inventing missing business data.
- [ ] Check whether the old store (`dive-meister.com`) remains live and how duplicate product content/domain migration should be handled. We need an explicit domain strategy before redirects or cross-domain canonicals.
- [ ] When ready for Google Shopping, establish Merchant Center ownership, business verification, shipping/returns policies and accurate product identifiers/feed. Resolve feed disapprovals before advertising.
- [ ] Plan English translation as its own catalog/URL/content release. Translate verified meaning and specifications; do not assume adding English keywords translates the store.

## 6. Before enabling analytics, email or paid campaigns

- [ ] Choose an analytics provider; GA4 is the suggested starting point. Provide the property/measurement ID through configuration, plus account permissions if needed.
- [ ] Approve cookie/analytics consent behavior and privacy wording. Choose how internal/test traffic is excluded.
- [ ] Choose an email provider and approve subscription wording, unsubscribe/double-opt-in behavior and any incentive. Authenticate the sending domain with the provider's SPF/DKIM/DMARC guidance.
- [ ] Decide whether you actually offer a welcome discount, bundles or free shipping. Configure real backend rules and exclusions before advertising them.
- [ ] Approve newsletter/welcome/post-purchase content and a reasonable sending schedule. Abandoned-cart emails require a supported integration and an appropriate consent/legal basis; a cart drawer alone does not enable them.
- [ ] Set target audience/countries, campaign objective, margins and budget. Use consistent campaign URLs/UTM naming.
- [ ] Validate a complete measured purchase and order reconciliation before increasing paid traffic. Advertising accounts, spending and outbound campaigns remain your decisions.

## 7. Ongoing routine

| Frequency | Your check | Follow-up |
| --- | --- | --- |
| Daily / while actively selling | Failed payments, paid sessions without orders, fulfillment exceptions, backend/image downtime | Resolve customer-impacting incidents first; reconcile Stripe and WooCommerce records |
| Weekly | Inventory, sale/backorder promises, support questions, mobile shopping check, email delivery/unsubscribes | Update product facts and identify recurring purchase friction |
| Weekly after measurement is live | Product-view -> add -> checkout -> purchase funnel by device/source | Look for meaningful drop-offs; account for test traffic, consent and attribution limits |
| Monthly | Search Console indexing/rich-result errors, Merchant Center issues, field performance, broken links | Correct genuine issues and compare against the recorded baseline |
| Monthly | Priority product descriptions/photos, campaign profitability including refunds/returns | Improve weak pages; adjust spend using actual margin rather than clicks alone |
| Quarterly / before major changes | Policies, providers/access, backups/restores, platform/plugin updates | Review changes on preview; preserve rollback and redirect plans |

Do not interpret a few orders or a higher click-through rate as proof of better conversion. Compare equivalent periods and traffic sources with enough volume; change one major experiment at a time when practical.

## Who does what

| Responsibility | Storefront development | Owner / service administrator |
| --- | --- | --- |
| Metadata, schema, sitemap, robots, presentation, safe cache invalidation | Implement and test | Confirm domain/business facts; register services/webhooks |
| Product descriptions | Normalize formatting and prepare factual drafts/templates | Verify and publish product facts in WooCommerce |
| Pricing, inventory, coupons, delivery/policies | Reflect configured data accurately | Configure and maintain business rules |
| Hosting/media/domain migration | Prepare code/configuration/redirect requirements | Choose service, fund it, grant access and approve migration |
| Analytics/email/feed | Implement approved integration and debug measurement | Choose providers, grant access, approve wording and operate campaigns |
| Production releases | Prepare preview, test evidence and rollback reference | Review and choose when to publish |
