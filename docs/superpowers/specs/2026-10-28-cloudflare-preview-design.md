# Cloudflare storefront compatibility preview

The user authorized configuring and testing a separate Cloudflare environment, with a $0 hosting target for future commercial use. Existing Vercel production and the Pi/WooCommerce backend remain unchanged. Do not enable a paid Cloudflare product or change domains/DNS/production routing.

Use a named `meister-storefront-test` Worker and its workers.dev preview URL on the existing user's Free account. Preserve the original Next.js commands alongside the adapter commands. The image-delivery fix on base57c075f stays enabled so neither provider's paid image optimizer is required.

Approaches: Cloudflare's current default vinext adapter is selected for this compatibility preview after its scanner reported17 supported items,1 partial images item and no issues (97%). It supports this app's Next16 proxy; OpenNext currently documents missing Node middleware support. vinext is beta: successful compilation alone is not production readiness. Plain static Pages cannot run the app's checkout/API/session server features.

A test deployment is noindex and must never perform live Stripe charges or reuse production customer sessions. Generate its own session secret. Only actual credentials supplied through authorized secure sources may be installed as Worker secrets; never export this workspace's outbound credential-proxy placeholders. Missing WooCommerce proxy/Stripe/Redis secrets are blockers to real-service verification, not permission to simulate success. Existing live webhook endpoints must not be changed.

Validation includes the existing unit suite, both native Next and adapter type/build checks, local production/Worker browser journeys in English/Greek, original media delivery, navigation, account protection, cart/variants/wishlist/compare/Gear Finder/checkout/shipping, and Stripe webhook crypto. Use test fixtures for local side effects. Real service tests require verified test Stripe keys and an isolated state strategy. Confirm deployment URL and Free plan before writes; inspect errors and CPU usage before recommending migration.
