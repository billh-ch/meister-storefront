# Greek storefront locale

English keeps every existing shopper URL. Greek uses `/el` and `/el/...`, including product URLs with their original encoded slug bytes. APIs, webhooks, assets, integrations and technical `/docs` pages keep their existing URLs.

## Architecture and navigation

`proxy.ts` identifies the locale from the URL, overwrites the request's locale/original-path headers and rewrites Greek shopper routes to the existing page tree. `lib/i18n/server.ts` provides request-scoped server translators; `LocaleProvider` provides the same locale to interactive components. Dictionaries use English source phrases, contextual Greek translations and plain interpolation. Unknown catalog text remains authored content. See `lib/i18n/README.md` for dictionary extension.

`LocalizedLink` and `useLocalePath` preserve the chosen language. The compact globe/EN/EL disclosure opens full English/Ελληνικά choices, marks the active language and supports keyboard focus, Escape and outside dismissal. It lives in the desktop navigation and mobile menu. The language switch links the equivalent URL, including query/hash and unknown shopper 404 pages, and refreshes the root layout. An explicit choice is remembered in `meister_locale` localStorage: a later bare homepage entry may restore Greek; direct English deep links and homepage entries with query/hash keep their requested language. First visits remain English. Disabled browser storage does not prevent URL-based locale selection.

Private account routes use the same encrypted session protection in both languages, including the page's fallback guard. Authentication redirects validate same-origin relative destinations before localization. Logout returns to the homepage in the current language. Localized API/asset/docs prefixes remain inaccessible; ordinary missing shopper pages render a useful localized 404.

## Typography, terminology and formatting

Greek body text uses Cascadia Mono through `next/font/google`, with its Greek subset and 200–700 weight axis. English body text uses Space Mono. Both locales use Syne at weight 700 for headings, with native Greek glyphs and synthetic heading bold disabled. Generated font assets include the Greek glossary glyphs; no runtime Google Fonts stylesheet or DOM translation widget is used.

Terminology was reviewed against https://dive-meister.com/ and existing WooCommerce category/attribute fields; company facts were checked against https://meister.gr/about-us. Use Πέδιλα, Λεπίδες, Πέλματα, Παρατροπίδες, Στολές Κατάδυσης, Ψαροτούφεκα, Εξοπλισμός and Ένδυση. Commerce uses Προσθήκη στο καλάθι, Καλάθι, Ολοκλήρωση παραγγελίας, Αγαπημένα and Σύγκριση. Preserve Carbon, brands/models, Λείο / Ξυρισμένο and Φόδρα where authored. Backorder is Κατόπιν παραγγελίας without a delivery promise.

Country names and customer-facing attribute labels translate at display time. The footer Google map also uses the selected en/el display locale while retaining its store location. ISO country codes, Woo shipping method IDs, product/variation IDs, option values, cart cookies and saved product IDs remain unchanged. Order dates follow the selected locale (`en-GB`/`el-GR`); order-status display uses the dictionaries while raw status IDs remain intact.

## Checkout and delivery integrations

Stable `/api/checkout/shipping` and `/api/checkout/session` requests carry an explicit `locale` in their JSON body. Saved-product/cart read APIs use an explicit `locale` query; wishlist mutations carry it in their body. Only `en` and `el` are accepted. Omission keeps legacy English behavior; malformed explicit locales are rejected. An error with no usable locale (for example invalid JSON or a rejected cross-origin request) uses the English default. APIs keep private/no-store responses.

The checkout action preserves its original four parameters and adds locale after the optional locker argument. Stripe receives `locale: en/el`, localized confirmation/cancel URLs and `metadata.locale`. Display-only variation labels and recognized delivery titles translate on hosted Checkout; price amounts, raw cartLines, extra option attributes, shipping metadata and canonical verified BOX NOW locker metadata stay unchanged. Verified paid webhooks continue to own fulfillment; locale does not alter payment verification, locking, reconciliation or order identity.

BOX NOW uses `language=gr` for Greek and `language=en` for English. Its country remains `gr`, with the proven `autoselect=yes` and `autoclose=no` iframe settings. Selection still requires the exact widget origin and matching iframe window. Server checkout resolves the locker ID through the public Greek directory and rejects mismatched/foreign/unavailable lockers. BOX NOW controls the iframe content: its visible map controls use Greek, while some provider-owned screen reader guidance remains English.

## SEO and limits

Public pages publish localized canonicals, en/el/x-default alternates, Open Graph locale and localized breadcrumb/offer URLs. The sitemap contains both public shopper equivalents; private pages stay noindex and do not publish public hreflang. Technical docs and the existing negotiated public Markdown representation remain English.

Catalog product names/descriptions and authored option values stay in their source language; this feature does not automatically translate products or provision a multilingual WooCommerce plugin. Woo transactional email language follows the backend's settings unless separately changed. Unknown carrier/brand text remains its authored name. Existing unavailable policy links render localized 404 pages; no policy or fulfillment promises were invented.

## Verification

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `node tests/i18n-audit.mjs`. Payment and backend tests replace external dependencies and assert strict locale validation, English compatibility, Greek errors, guest/account checkout, return URLs, unchanged amounts/cartLines and canonical locker metadata. Existing webhook/BOX NOW regressions remain part of the full suite.

`node tests/locale-integration.browser.mjs` starts its own Woo-shaped local fixture, performs an optimized build, launches an owned Next server, verifies English/Greek pages at 320/390/768/1440, state continuity, authenticated account/address/logout, shipping failures/recovery and the iframe contract, then shuts down both processes. All Woo/Stripe/Redis credentials used by this fixture are overridden. Valid payment submission is intercepted in the browser; no real session/order/customer/shipment is created. Set `LOCALE_TEST_MODE=dev` only for development checks. Stop other dev/build processes first because Next shares `.next`. `LOCALE_FIXTURE_PORT` and `LOCALE_APP_PORT` override its default 4055/3043 ports.

A live third-party map smoke requires normal browser flags: Playwright normally disables ThirdPartyStoragePartitioning. The automated integration suite uses an iframe fixture and verifies the application contract; it does not book delivery or claim live-map availability.
