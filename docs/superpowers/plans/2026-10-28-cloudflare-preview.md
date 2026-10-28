# Cloudflare Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare, deploy and test a free Cloudflare copy without altering the live store.
**Architecture:** Parallel vinext/Workers build and runtime on the existing Next16 source tree, with environment-specific secrets and noindex test hosting. Retain ordinary Next/Vercel commands.
**Tech Stack:** Next16, React19, vinext, Vite, Cloudflare Workers, existing Node/Playwright checks.
**Spec:** docs/superpowers/specs/2026-10-28-cloudflare-preview-design.md

## Global Constraints
- No paid provisioning, domain/DNS changes, production deployment, WordPress changes or live charges.
- Use actual secure credentials, not workspace proxy placeholders; secrets never printed or committed.
- Vercel workflow stays available; test account sessions and noindex are isolated.
- Preserve original image delivery, locale styling and all existing shopper flows.

## Review Focus
- Next16 proxy must protect accounts and preserve locale header/query/slug bytes.
- Server Actions/cookies must retain variant and cart state under Workers.
- Node crypto/Stripe webhook/Redis compatibility must be exercised, not inferred from build success.
- Free CPU limits and adapter beta gaps must be reported honestly.
- No test host indexed, production secret leaked into client bundles or live payment triggered.

### Task 1: Compatibility and isolated build
**Files:** package.json/lockfile, vite/cloudflare configuration, .gitignore, docs/cloudflare-preview.md.
**Interfaces:** preserve npm run dev/build/start; add dev/build/preview/deploy commands for Cloudflare.
- [x] Run compatibility scanner before changes; record supported/partial features.
- [x] Apply adapter initializer non-interactively for the user-selected Cloudflare platform and named test Worker; inspect every generated change.
- [x] Run native unit suite and adapter build; address actual compatibility failures and record them.

### Task 2: Test environment and browser/runtime checks
**Files:** Worker configuration, scripts/tests for environment validation and Cloudflare runtime, setup guide.
**Interfaces:** serializable test configuration, Worker secrets, fixture-backed local backend; no production side effects.
- [x] Write regression tests before any application compatibility/security fixes.
- [ ] Exercise English/Greek shopper flows in built adapter/Worker runtime; verify auth, actions, original photos, checkout/shipping and webhook handling with test dependencies.
- [x] Generate environment documentation with actual secret names, safe setup commands and unverified boundaries.

### Task 3: Cloudflare deployment and live validation
**Interfaces:** active authorized Cloudflare connection, exact account ID, existing Free plan and workers.dev address.
- [x] Authenticate and confirm account/plan; check existing Worker names before creating anything.
- [ ] Install only actual secrets through approved secure mechanisms; deploy the dedicated test Worker without touching production.
- [ ] Verify public deployment, inspect CPU/errors and run permitted end-to-end tests. Report pass/fail/missing-secret limits separately.

Connection active; the dedicated Worker is deployed at
https://meister-storefront-test.hbill5488.workers.dev using fixture data.
The connection-provider 403 cleared, the user initialized workers.dev and
connected GitHub, and the trigger was corrected to the Cloudflare branch/build.
The account has no paid Workers plan. Hosted shopping, locale, wishlist,
compare and mobile variants passed. A unique test session secret is installed.
Initial CPU/errors were inspected; high CPU quantiles require further Free-plan
reliability assessment. Real-service Redis/WooCommerce and Stripe fulfillment
remain unverified; the final two tasks remain incomplete for that reason.

## Connect the real WooCommerce catalog

The user authorized this next stage after reviewing the hosted fixture preview.
Use the same Pi backend and catalog. Runtime WooCommerce secrets must be supplied
securely to the Worker; the managed workspace's proxy placeholders cannot be
exported. Preserve the working fixture deployment until those secrets exist.

- [x] Inspect existing Worker bindings and the backend's public reachability.
- [x] Add an independent server-side payment-off guard before disabling mock data;
  verify both checkout entry points and Greek/English errors with real code tests.
- [x] Install/verify the three actual WooCommerce secret bindings, configure the
  known public backend origin at build/runtime and switch mock mode off together.
- [x] Deploy the Cloudflare branch and verify real product/variant/Greek content,
  photos, cart and Greece shipping from the hosted Worker. Do not enable Stripe,
  place an order, edit WordPress, change production or activate a paid plan.

WooCommerce stage complete: three encrypted credentials verified; backend has83
published products. Real-catalog build68ade7ff-e4a1-42ea-8334-b24057b58347 on
77df1a3 succeeded. Hosted fins/wetsuit options, photos, server-priced cart,
GR→CY→GR delivery, mobile checkout and Greek mobile/desktop product checks
passed. Payments remain explicitly disabled. High CPU quantiles require further
Free-plan optimization and reliability testing before any production migration.
