# Gear Finder maintenance

The storefront guide lives at `/gear-finder` and `/el/gear-finder`, with `#wetsuits` and `#fins` deep links. The desktop and mobile navigation and wetsuit/fin buying boxes link here.

## Approved content

`lib/gear-finder/reference.ts` contains the approved bilingual questions, model facts and guidance from Meister Gear Finder Site version 2 (commit 99516e3f0b1502c275e0c6a001f1877f89469e69). `engine.ts` preserves the original deterministic recommendation rules. Golden hashes in `tests/gear-finder.test.mjs` check all 2,160 wetsuit and 4,860 fin answer combinations against that approved source.

## Catalogue connection

`identity.ts` pins the sixteen curated model keys to the current WooCommerce numeric product IDs, verified against public storefront products on 27 October 2026. The old reference shop used Greek slugs; the current storefront uses English slugs. Product titles, translations and URLs can change without breaking the ID binding. If an actual WooCommerce product is replaced/recreated with a new ID, update this mapping after verifying its model and suitability facts. Additional models require approved facts/rules, not automatic guessing from names.

The server loader reads all published WooCommerce products with `fresh: true`. Other storefront catalogue callers retain their existing cached behavior. Prices, names, images, availability and PDP links are projected from that response; snapshot prices in the approved reference are never shown as live commerce data. Only explicit `instock`/`onbackorder` statuses can become recommendations. Unknown/sold-out stock is excluded from recommendations. Missing, duplicate, nonpositive-price and unpublished models are excluded. Sold-out mapped models can remain in the explicitly labelled full range. A failed or incomplete catalogue read produces an unavailable message and retry action, never mock purchase links.

The displayed price is the current starting price, not a quote for the recommended thickness, stiffness, pockets or size. Prices/stock reflect the page's catalogue load; the product page and checkout remain responsible for the final configuration.

## Browser state and privacy

Answers are held in memory and in `sessionStorage` under `meister_gear_finder_v1` so native locale switching retains progress. This is a tab session, not account storage. Both modes retain independent progress. Stored answers are validated against approved options. Storage restrictions do not prevent using the quiz. No answer submission, analytics, AI service or new database is used.

## Verification

- `npm test`: rule parity, current inventory mapping, source ID migration, stock/outage behavior, session validation, locale metadata and existing regressions.
- `npm run lint` and `npx tsc --noEmit`.
- Browser fixture: run `node tests/fixtures/gear-finder-wc.mjs`, then start Next dev with `NEXT_PUBLIC_WC_URL=http://127.0.0.1:4881 WC_CONSUMER_KEY=fixture WC_CONSUMER_SECRET=fixture NEXT_PUBLIC_USE_MOCK_DATA=false npx next dev --port 3080`. These are test-only credentials and data; never deploy the fixture server or its environment.
- `node tests/gear-finder.browser.mjs`: both quizzes/locales at 390/1440px, product destinations, history, reload, native language changes, print visibility, overflow and 1024–1280px language menu bounds.
