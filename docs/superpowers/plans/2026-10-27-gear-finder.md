# Gear Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the approved bilingual gear guide into the storefront with live catalogue destinations.
**Architecture:** Pure typed reference data/rules, a strict server catalogue adapter, and native React quiz/results components. Shared locale routing, navigation and metadata.
**Tech Stack:** Existing Next.js 16.2.12, React 19, TypeScript, CSS modules, Node test runner, Playwright; no new dependencies.
**Spec:** docs/superpowers/specs/2026-10-27-gear-finder-design.md

## Global Constraints
- Preserve approved questions, wording and matching rules from Site version 2.
- English /gear-finder, Greek /el/gear-finder; use existing locale-specific fonts.
- No WordPress edits, new database, analytics, or production deployment.
- Exact slug identity; never sell snapshot or fallback catalogue data.

## Review Focus
- Catalogue outage or missing/duplicate identity: explicit unavailable state, no stale purchase links.
- Current zero/missing price, sold-out model and changed budget eligibility: cannot recommend.
- Hash navigation, locale reload and invalid stored answers: preserve valid sessions safely.
- Mobile navigation crowding and long Greek strings: no horizontal overflow.
- Unknown temperature, below 15°C and plastic fins: no invented thickness/stiffness.

### Task 1: Typed guide rules and catalogue adapter
**Files:** lib/gear-finder/{types,reference,engine,catalogue}.ts; lib/gear-finder/load-catalogue.ts; tests/gear-finder.test.mjs.
**Interfaces:** export approved PRODUCTS, QUESTIONS, UI, FIN_PRODUCTS, FIN_QUESTIONS, FIN_UI, FIN_REASONS; rankSuits(answers,products?), rankFins(answers,products?), finStiffness(answers); connectCatalogue(products): {suits,fins}, where each model has current price/stock and internal href.
- [ ] Write and run failing contract tests for live price budget, exact decoded slug mapping, missing/duplicate/sold-out products and thermal/stiffness cases.
- [ ] Import approved bilingual data, port rule bodies without score changes, implement strict catalogue projection and loader.
- [ ] Run invariants/parity and full unit suite; commit.

### Task 2: Native quiz and results
**Files:** components/gear-finder/{finder,results,product-card}.tsx, guide.module.css, session.ts; app/gear-finder/page.tsx; tests/gear-finder.browser.mjs.
**Interfaces:** server page loads catalogue then passes serializable models/null to Finder; quiz mode from hash, sessions keyed by mode, labels from approved bilingual data.
- [ ] Write browser journey test and observe missing-route failure.
- [ ] Implement six/seven-step accessible quiz, mode switching, session validation, results, alternatives, care/fit sections, full range, no-match/outage handling, and print styles.
- [ ] Run complete journeys with a local WC fixture: English/Greek at mobile/desktop, history, session retention, keyboard and no-overflow assertions.

### Task 3: Storefront entry points and preview
**Files:** components/navbar.tsx; components/product/product-buy-box.tsx; lib/i18n/{paths.ts,dictionaries/gear-finder.ts,index.ts}; lib/seo/sitemap.ts.
- [ ] Assert new locale paths/metadata and wetsuit/fin PDP destinations in tests.
- [ ] Add responsive desktop/mobile navigation and contextual PDP links; register route, metadata and sitemap.
- [ ] Run full unit suite, lint, tsc and browser checks. Review branch, address important findings, commit and push a preview branch/PR; verify preview status.
