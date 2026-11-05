# Storefront Promotions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the approved Woo-authoritative coupons, newsletter issuance contract, automatic bundles and consistent Stripe checkout.

**Architecture:** A separate Meister Promotions Woo plugin owns canonical cart quotes, native coupons, bundle allocation and durable pending-order attempts. A feature-flagged storefront adapter adds checkout-only coupon controls and campaign intent, projects Woo's monetary snapshot to Stripe, and reconciles the existing Woo order from verified payment events. Existing checkout stays available while installation/event isolation remain unverified.

**Tech Stack:** PHP 8.1+, WooCommerce CRUD/Cart/Discounts and MySQL, Next 16.2.12/React 19, Stripe Checkout, Zod, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-promotions-design.md` (approved 2026-11-05).

## Global Constraints

- Use the backend serving Cloudflare; do not change the new empty staging catalog or unrelated WordPress sites.
- One coupon per order, guests allowed, checkout-only entry, English/Greek; coupons never discount delivery.
- Newsletter eligibility is first confirmed subscription per email, independent of purchase history; real newsletter/email integration is later.
- Explicit selected-product bundles apply automatically; choose the best alternative to a coupon, never stack.
- Woo is authoritative for money/tax/restrictions; no browser prices, negative discount fees, public coupon enumeration or silent higher charge.
- Preserve existing legacy Stripe sessions; new checkout cannot activate until every receiver is isolated/scoped.
- Feature disabled by default; no new paid services, live payment activation, DNS or production deployment.

## Review Focus

- Concurrency and ambiguous writes: one checkout attempt/order/redemption across lost acknowledgments and duplicate events.
- Mixed product/variation requirements: no unit can satisfy two bundle requirements; deterministic best-offer and cent allocation.
- Zero/odd-cent/tax-inclusive totals: Stripe lines sum exactly to the Woo total without discounting delivery.
- Guest privacy and campaign intent: verified session ownership, email-bound eligibility, no passive application or subscriber disclosure.
- Payment event ordering: late expiry/failure cannot cancel paid/processing attempts; Redis loss cannot create duplicates.

## Task 1: Backend promotion engine and management

**Files:** create `wordpress/meister-promotions/{meister-promotions.php,engine.php,admin.php,readme.txt}`, `tests/promotions-engine.php`, `tests/promotions-php-run.py`.

**Interfaces:** `Meister_Promotions_Engine::bundle_sets(array $lines,array $rule): array` returns non-overlapping item key/quantity allocations; Woo adapter consumes those allocations. Admin stores versioned validated rules and welcome template; native coupon metadata carries campaign/influencer identifiers.

- [x] Write PHP tests for specific variation vs parent matching, missing quantity, overlaps, set caps, invalid rules and selected-only allocation; observe failures before implementation.
- [x] Implement deterministic matching using most specific requirements first and a bounded maximum-set search, with Woo-admin validation, dates and no enabled campaigns by default.
- [x] Run PHP tests and lint in PHP container; commit task.

## Task 2: Canonical Woo quote and newsletter issuance

**Files:** create `wordpress/meister-promotions/{cart.php,store.php,newsletter.php,api.php}` and `tests/promotions-woo.integration.php`.

**Interfaces:** authenticated `POST /wc/v3/meister-promotions/quote` consumes `{items,customerId,email,address,shippingId,coupon}`; returns versioned EUR minor-unit `PromotionQuote` with line allocations, methods, totals, promotion, opaque reference and expiry. `issue` service consumes confirmed trusted program/email identity and returns the existing/new one-use coupon. Public storefront never calls issuance directly.

- [x] Write integration assertions for actual Woo native percent/fixed restrictions, selected bundles vs codes, independent shipping and taxes, email binding and duplicate issuance; observe failures on disposable local Woo.
- [x] Implement scoped Woo carts with canonical tax/shipping, server-only quote references and single-coupon alternatives; expose only authenticated management-capability endpoints with bounded validation.
- [x] Implement unique durable newsletter ledger and retry-safe coupon generation, disabled welcome configuration and WP-CLI issuance for future trusted adapters.
- [x] Run engine/integration tests and PHP lint; commit task.

## Task 3: Durable pending checkout lifecycle

**Files:** create `wordpress/meister-promotions/{attempts.php,lifecycle.php,cli.php}`; extend integration tests.

**Interfaces:** protected `prepare` accepts quote reference, ownership and attempt key, persists canonical order and capacity holds; `bind` records Stripe session; `complete` verifies supplied server-verified session facts; `reconcile` releases only confirmed terminal attempts; `receipt` requires attempt ownership. Attempt identity, session binding and coupon reservation outlive Redis.

- [x] Add tests for concurrent prepare/final coupon use, duplicate issuance/attempts, lost acknowledgments, stock reservation, duplicate/late payment events, zero total and invalid session/currency/amount/owner.
- [x] Implement DB-backed attempt uniqueness and serialization, Woo stock/coupon reservation integration, immutable pending-order snapshot, idempotent completion and explicit failure/reconciliation state.
- [x] Add protected bounded reconciliation/CLI operations and health gate; no unsafe timeout-only cancellation or production cron assumptions.
- [x] Run integration tests including cross-checkout coupon limits; commit task.

## Task 4: Storefront protocol, intent and Stripe projection

**Files:** create `lib/promotions/{schema.ts,client.ts,session.ts,checkout.ts,stripe-lines.ts,events.ts}`, `app/api/checkout/promotions/route.ts`, `app/api/promotions/campaign/route.ts`, `app/api/orders/by-attempt/route.ts`; modify checkout session/webhook/confirmation routing and session options. Test `tests/promotions.test.mjs`, `tests/promotions-checkout.test.mjs`.

**Interfaces:** Zod `PromotionQuote` validates backend invariants; quote endpoint reads cookie cart and authenticated identity; `createPromotionsCheckout` reuses stable session attempt and returns URL from backend snapshot; `handlePromotionEvent` finalizes known protocol orders and declines foreign events. Legacy events retain existing handling.

- [x] Write failing tests for malformed/negative/inconsistent quotes, cent-perfect quantity splitting, same-origin mutation, stale quote, missing email, one code, bad guest ownership, session/amount/currency mismatch and delayed events.
- [x] Implement no-store authenticated backend client, signed/encrypted promotion state, campaign capture, bounded persistent rate limits, attempt preparation and Stripe idempotency using original validated snapshot.
- [x] Route verified protocol events before legacy code, retaining legacy behavior; add ownership-scoped receipt for paid/zero-total orders.
- [x] Verify targeted tests, full Node suite and TypeScript; commit task.

## Task 5: Checkout and cart presentation

**Files:** create `components/checkout/coupon-control.tsx`, `components/cart/promotion-summary.tsx`, campaign-link capture component; modify checkout form/summary/page, cart/drawer, locale dictionary and root layout. Test `tests/promotions.browser.mjs`.

**Interfaces:** checkout owns latest quote/request guard; coupon control only edits coupon intent; monetary UI consumes backend quote; cart summaries request bundle-only provisional quote; checkout action requires matching fresh reference.

- [x] Write browser scenarios for mobile/desktop EN/EL apply/remove/error, address/email revalidation, rapid out-of-order responses, automatic bundle and campaign link replacement/dismissal.
- [x] Add compact accessible checkout-only entry, canonical savings/totals and guarded payment state; cart/drawer show automatic savings without coupon entry. Preserve current behavior when flag disabled.
- [x] Run browser checks on fixture backend and production builds sequentially; commit task.

## Task 6: Packaging, installation evidence and whole-change review

**Files:** add deterministic plugin packaging, operations/install/reconcile/rollback guide and local-Codex handoff; update this plan's ledger with evidence.

- [x] Package plugin and verify allowlist/ZIP reproducibility, all PHP lint/tests, Node suite, types, lint and native/vinext builds.
- [x] Inspect current Cloudflare runtime backend read-only; attempt authorized protected reads, record any missing administration/VPN access; perform actual installation/preview sandbox validation only when safe access and isolated receivers are established.
- [x] Obtain required fresh whole-change review; fix material findings with regression tests and record remaining infrastructure blockers accurately.
- [ ] Commit and push feature branch (repository convention); do not promote to production or enable unverified flow. Provide concrete installation handoff/artifact if remote administration is unavailable.

Status: source, local integration, independent review and packaging complete. Owner-backend installation and isolated Stripe sandbox verification remain blocked by unavailable private administration; follow the concrete local-Codex handoff before activation.
