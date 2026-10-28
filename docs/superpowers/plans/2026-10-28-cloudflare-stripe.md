# Cloudflare Stripe checkout implementation plan

User delegated implementation. Continue in the isolated feat/cloudflare-preview worktree; keep Vercel production, DNS and paid services unchanged.

Goal: enable existing hosted Stripe checkout in test mode only after credentials, return origin, Redis and separate signed webhook are working.

1. Test-first: configured preview refuses live/unknown Stripe keys, and the preview webhook ignores other origins/live events before Redis or Woo writes. Preserve unconfigured Vercel behavior and existing idempotency/reconciliation tests.
2. Add explicit preview origin/session metadata and test-mode configuration. Keep CHECKOUT_PAYMENTS_ENABLED=false until required secrets and hosted checks are complete. Existing Vercel endpoint receives the same account's events: use the same active Redis locks to prevent overlapping duplicate order writes; scope the new endpoint to its own sessions.
3. Install portable existing Stripe test key as encrypted Worker secret. Create a separate test webhook for the workers.dev URL, transfer its signing secret directly, and preserve production endpoint. Redis restore_* secrets are write-only: user must copy the active pair, not the archived unprefixed database.
4. Run full tests, lint, type/build checks and an independent final review. Deploy scoped webhook and trusted return origin with payments off. Verify signed/tampered/foreign-origin events without creating an order.
5. After user supplies Redis and its connectivity is verified, enable test checkout, verify hosted cart → Stripe test session → return origin, then complete one test payment and verify exactly one WooCommerce order/receipt and retry protection. No real charges or shipments. If credentials or payment completion remain unavailable, keep payments off and report the exact blocker.

Constraints: no managed outbound-proxy placeholders exported as real credentials, no secret output/source files, no paid upgrade, no live credentials, no production changes. Test Woo order creation is an expected transactional side effect of checkout verification; identify test data explicitly. Free CPU suitability remains a separate launch blocker.

Status: steps1–2 complete, step3 Stripe key/separate signed webhook complete and
Redis awaiting user-supplied write-only values. Step4 complete:180 tests, both
builds, types/lint, independent review and hosted signature/isolation/payment-off
checks passed. Deployed6d66cff/2301f62 in buildc9d0705f-d418-479c-b3d9-b30ce18a81c6.
Step5 remains blocked by missing KV_REST_API_URL/TOKEN; payment creation stays off.
