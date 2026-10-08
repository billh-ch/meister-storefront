# Product updates and cache validation

## Behavior

Public catalog data keeps its 60-second revalidation interval and product detail/
variation data keeps 30 seconds. These intervals initiate request-driven refresh;
they are not a guaranteed maximum delay, particularly during backend outages.
Product HTML remains dynamically rendered because the deployed Greek-slug route
needs that workaround. This release does not promise a measured LCP improvement.

A signed WooCommerce product event expires the shared `products` tag and the
numeric parent `product:<id>` tag immediately. The next request refreshes data
instead of deliberately serving a stale price first. Shared invalidation covers
home/shop/category/related products, product descriptions/metadata/schema and
sitemap inputs, including old or deleted slugs. The XML response itself is
not CDN-cached, so a separate HTTP cache cannot hide refreshed catalog data. It also expires unrelated product
lookups carrying the shared tag: a deliberate tradeoff to avoid stale slug data
or an extra backend lookup. Variation payloads use `parent_id` where present.

Cart/payment product and variation verification bypasses the shared cache.
Customer, order and address-dependent shipping responses remain private and
uncached. A product update webhook never creates or modifies orders or products.
Repeated deliveries simply expire caches again. Out-of-order deliveries never
apply their payload data to the catalog; the storefront reads current WooCommerce
records. An invalid request cannot choose arbitrary cache tags.

## Owner configuration after deployment

1. Generate a random secret of at least 32 bytes with your password manager.
   Set **`WC_WEBHOOK_SECRET`** as a server-side secret in Vercel for the relevant
   deployment environment. It is separate from REST credentials and Stripe's
   webhook secret. Add it to Codex environment secrets if future integration
   work needs it. Never put its value in source code, chat or screenshots.
2. Redeploy after adding the secret. Without it the endpoint returns 503 and
   invalidates nothing.
3. In WooCommerce admin, open **Settings → Advanced → Webhooks**. Create active
   webhooks for **Product created**, **Product updated** and **Product deleted**.
   Use this delivery URL for production:
   `https://meister-storefront.vercel.app/api/webhooks/woocommerce`
   Set the same secret on each webhook. Keep the product-updated subscription
   active for stock and variation changes supported by your WooCommerce version.
4. WooCommerce's unsigned activation form ping is acknowledged without expiring
   caches. Normal events require the exact raw-body base64 HMAC-SHA256 signature
   and the product resource/event headers. JSON bodies are bounded to 256 KiB.
5. Inspect WooCommerce delivery logs for HTTP 200. HTTP 401 means signature mismatch;
   400 means malformed/unsupported event; 413 means oversized product payload;
   503 means missing storefront secret. Do not paste bodies/customer data into
   diagnostics. Monitor failed delivery retries and webhook status: WooCommerce
   may disable repeatedly failing subscriptions.
6. Use a development-copy product first. Change its price, description or stock,
   then verify product page, metadata/JSON-LD, listing, cart and sitemap. Test a
   variation update separately and confirm parent data refreshes. Test deletion
   only on an expendable development product. No payment is needed.

A protected Vercel preview may reject WooCommerce delivery before this route is
reached. Use the appropriate deployment environment when validating; this batch
has not changed preview authentication or fixed its cart connection.

Keep periodic refresh enabled if webhook delivery fails. Do not remove it merely
because one webhook delivery succeeded. Existing open tabs can retain their UI
until refresh/navigation; payment verification still reads fresh backend data.

## Reproducible checks

Stop any Next server running in this checkout:

```sh
npm test
CHROMIUM_PATH=/usr/bin/chromium npm run test:cache
```

The cache runner starts a local WooCommerce fixture, builds and serves the real
production app, counts backend reads on repeated Greek-slug product visits,
checks fresh cart variation prices before event delivery, checks that an unsigned update does not refresh a cached price, delivers signed
updates twice, and verifies refreshed product/schema/listing and deletion/404/
sitemap behavior. It uses dummy credentials, no real customer data and no orders.
The fixture secret is test-only and does not configure Vercel or WooCommerce.

Recorded pre-change baseline: cold product navigation 1,777 ms, warm navigation
708 ms; one uncached detail lookup, zero additional backend reads on the repeat
visit. Catalog data was already warmed during build. These are one-run local
fixture observations, not production speed or statistically comparable LCP
measurements. After-change fixture navigation was 1,816 ms cold and 72 ms warm,
with the same one cold detail request and zero repeated backend reads. These
timing differences do not establish a performance gain. The goal of this release is freshness and reliable cache boundaries.
