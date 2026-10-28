# Cloudflare Stripe checkout implementation plan

User delegated implementation. Continue in the isolated feat/cloudflare-preview worktree; keep Vercel production, DNS and paid services unchanged.

Goal: enable existing hosted Stripe checkout in test mode only after credentials, return origin, Redis and separate signed webhook are working.

1. Test-first: configured preview refuses live/unknown Stripe keys, and the preview webhook ignores other origins/live events before Redis or Woo writes. Preserve unconfigured Vercel behavior and existing idempotency/reconciliation tests.
2. Add explicit preview origin/session metadata and test-mode configuration. Keep CHECKOUT_PAYMENTS_ENABLED=false until required secrets and hosted checks are complete. Existing Vercel endpoint receives the same account's events: use the same active Redis locks to prevent overlapping duplicate order writes; scope the new endpoint to its own sessions.
3. Install portable existing Stripe test key as encrypted Worker secret. Create a separate test webhook for the workers.dev URL, transfer its signing secret directly, and preserve production endpoint. Redis restore_* secrets are write-only: user must copy the active pair, not the archived unprefixed database.
4. Run full tests, lint, type/build checks and an independent final review. Deploy scoped webhook and trusted return origin with payments off. Verify signed/tampered/foreign-origin events without creating an order.
5. After user supplies Redis and its connectivity is verified, enable test checkout, verify hosted cart → Stripe test session → return origin, then complete one test payment and verify exactly one WooCommerce order/receipt and retry protection. No real charges or shipments. If credentials or payment completion remain unavailable, keep payments off and report the exact blocker.

Constraints: no managed outbound-proxy placeholders exported as real credentials, no secret output/source files, no paid upgrade, no live credentials, no production changes. Test Woo order creation is an expected transactional side effect of checkout verification; identify test data explicitly. Free CPU suitability remains a separate launch blocker.

Status: steps1–5 complete. Active Redis write/read/delete and shared Vercel/
Cloudflare receipt probes passed. Encrypted checkout_ aliases replaced plaintext
settings, and test checkout is enabled. The actual mobile Stripe sandbox payment
created WooCommerce test order4918 (TEST DO NOT FULFIL), showed its confirmation
and cleared the cart. Replaying its signed paid event returned duplicate and
retained the same order. No real charge, shipment or production cutover occurred.

The real flow exposed a stale header badge. A hosted browser test reproduced
missing confirmation notification (RED), and independent review identified an
older count response overwriting the new count. A deterministic held-response
test reproduced actual1 versus expected0 (RED). Confirmation notification and
navbar request-generation guards fixed both cases. Both hosted browser cases
passed GREEN on application commitf528084/build2af88635-07f7-48ff-beb8-0d6a00c30540.
All180 unit tests, both builds and type checks passed. ESLint exited0 with one
unused existing suppression warning in navbar.tsx; no errors. No review findings
remain unresolved. Live payments and Free CPU reliability remain separate gates.
