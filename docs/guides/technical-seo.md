# Technical SEO configuration and verification

Canonical URLs use `NEXT_PUBLIC_SITE_URL`, defaulting to
`https://meister-storefront.vercel.app`. If the storefront moves, configure the
final HTTPS origin without a path/query/credentials. Do not use the WooCommerce
origin or a Vercel preview URL. This setting does not alter payment redirects.

Production catalog pages receive unique titles/descriptions, canonical URLs,
Open Graph and Twitter metadata. Product descriptions are extracted from existing
WooCommerce content with entity decoding; no product facts or translations are
invented. The social fallback is the existing homepage hero image.

Unfiltered paginated collection pages use the displayed page's canonical URL.
Filtered/sorted views use the base collection canonical and noindex. Campaign
tracking parameters are omitted from canonical URLs. Search, cart, checkout,
account and auth pages are noindex; protected/private paths also receive
X-Robots-Tag headers so redirects are covered. Robots allows crawling these
pages to see their noindex directives and disallows `/api/`. Robots rules do not
replace authentication or access control.

Preview/development/demo environments are excluded through metadata, headers
and robots, with an empty sitemap. Outage fallback catalog/product pages are
also marked noindex. This does not make demo products purchasable or repair a
preview's WooCommerce configuration.

`/sitemap.xml` contains home, shop, the five existing category routes and real
published product URLs. It handles Greek/encoded slugs once, deduplicates URLs
and does not invent modification dates or include private/policy pages that do
not exist. Successful production output has a 60-second shared cache window.
Backend failures return 503, no-store and Retry-After: 60; they never publish
mock products. A catalog larger than the current 1,000-product fetch bound
returns a retryable failure rather than silently omitting products. Expand that
bound or adopt split sitemaps before exceeding it.

Verification:

1. Run `npm test`, lint, TypeScript and the production build.
2. Run `CHROMIUM_PATH=/usr/bin/chromium npm run test:seo` with no other Next dev
   server in this checkout. It uses local fixtures and tests deployment modes.
3. Once this release is promoted, inspect the live home/shop/category/Greek PDP
   metadata and `/robots.txt` and `/sitemap.xml`. Confirm the listed
   product URLs resolve to your real published products.
4. Submit the production sitemap in Search Console after domain ownership is
   verified. Check indexing and canonical reports; crawling/indexing is not
   immediate and these changes do not guarantee rankings or rich results.

Structured-data expansion, cache invalidation webhooks, English translation,
policy publication, analytics and marketing remain later optimization batches.
