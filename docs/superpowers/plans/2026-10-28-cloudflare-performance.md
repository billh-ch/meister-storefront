# Cloudflare Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, with one final independent review.

**Goal:** Improve the authorized preview's data and image delivery, then report measured performance and selling readiness.
**Architecture:** Supported KV fetch cache plus pre-generated responsive images hosted as static assets, with original-image fallback and metadata freshness.
**Tech Stack:** vinext1.3.1, Cloudflare Workers/KV Free, Next16, Sharp, Playwright.
**Spec:** docs/superpowers/specs/2026-10-28-cloudflare-performance-design.md

## Global Constraints
No paid plan, production/DNS/WordPress changes, live payments or credential export. Preserve checkout fresh data and existing locale/design. Build Next and vinext sequentially because they share generated type paths.

## Review Focus
- No caching private or shopper-specific data, prices and stock freshly checked at checkout.
- Free KV quota failures and eventual invalidation are bounded and reported.
- Media inventory exposes published public uploads only; no credentials/private metadata or arbitrary remote fetch inputs.
- Unknown, changed, missing and external photos continue to load safely.
- Generated asset routing bypasses Worker CPU; no source image loss or stale filename reuse.

### Task 1: Catalog cache and public media inventory
- [ ] Add meaningful tests for media projection/allowlist and retain cache-bypass regression checks; run RED.
- [ ] Configure supported KV adapter/binding and build a strict published-media endpoint with no private fields.
- [ ] Run tests/build, deploy preview, verify cache entries and strict catalog behavior.
Expected: shared cache warms without changing guest cart, private routes or payment-off behavior.

### Task 2: Responsive generated assets
- [ ] Test custom loader selection, version mismatch/original fallback and standard Next Image output; run RED.
- [ ] Generate validated photo variants and local compressed assets using Sharp, with bounded downloads and public metadata only.
- [ ] Wire custom image loader and CSS backgrounds; build, verify representative photo sizes and UI.
Expected: real images stay available, smaller encoded bytes, no Vercel image optimizer dependency.

### Task 3: Hosted verification and commercial readiness
- [ ] Independent review, fix important issues and run applicable full suite/types/lint/builds.
- [ ] Deploy and repeat timing, locale, photos, cart, Greece/Cyprus shipping and disabled-payments checks.
- [ ] Document measured improvements, remaining CPU/free quota constraints and exact missing payment/fulfillment setup.
Expected: evidence-backed report, no premature production or selling-ready claim.
