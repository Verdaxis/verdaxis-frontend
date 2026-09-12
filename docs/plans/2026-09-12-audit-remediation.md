# Verdaxis Audit Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correct the confirmed reporting, interaction, accessibility, and layout defects from the reviewed 12 September audit.

**Architecture:** Keep the current React application, canonical market identity, routing, and design system. Make small changes at existing shared seams, with focused tests followed by a read-only local browser pass. Backend work is isolated in the sibling `audit-20260912-be` worktree and has its own plan.

**Tech Stack:** React 19, TypeScript, Vite 6, Tailwind, Vitest, React Testing Library.

---

## Boundaries and order

- Base: `b311520ef66bc2c22ae2087d3e60f1a1a8fb80ab`; branch `fix/audit-20260912`.
- Do not edit the production/staging checkouts, their dependencies, or pre-existing lesson changes. Do not push, deploy, or submit business mutations.
- Owner-confirmed transaction policy: only the seller pays; buyers are always free. Pilot is $2/MT and Professional is $1.50/MT by default, with configurable rates. Preserve historical trade snapshots.
- Preserve the intentional under-768px desktop gate. No new component library, visual identity, search service, or subscription checkout.
- Each batch: write a focused failing check, implement, run that check, inspect the diff, then get independent review. Keep commits scoped to the repair work.
- Owner authorized parallel implementation from 05:31:27 to 07:01:27 UTC on 12 September 2026. Separate file ownership; review concurrent changes before the final gate.

## Task 1 — Accurate performance references (R1, R2)

Files: `src/utils/tradeAnalytics.ts`, `src/components/TradeHistoryPage.tsx`, `src/tests/trade-analytics.test.ts`, and a focused component test if request identity is not covered.

1. Extend analytics tests with two delivery windows for the same product/port and a previous-year trade with the same month name. Confirm failure with `npm test -- src/tests/trade-analytics.test.ts`.
2. Key references by canonical product + delivery point + availability window. Include the window in requests and reject mismatched reference responses; do not choose a first unrelated response.
3. Aggregate only the current six UTC year-month buckets, formatting labels separately. Preserve numeric conversion and the disclosed 20-trade scope.
4. Run focused tests and typecheck. Review buyer/supplier savings sign and missing-reference behavior.

## Task 2 — Working, accessible controls (R3, R4)

Files: `src/components/layout/{Header,Sidebar}.tsx`, `src/components/Settings.tsx`, `src/pages/{RegisterPage,OnboardingPage}.tsx`, relevant EN/ZH locales, and existing component tests.

1. Add behavior checks for absent nonfunctional search, fixed USD display, named compact sidebar actions, associated form labels, and selected role/control state.
2. Remove dead header search; replace the currency selector with fixed USD text; route Upgrade through the existing sales-contact path without changing fee terms.
3. Associate all registration/onboarding field labels and help/error text. Use native role radio semantics or complete pressed-state semantics as appropriate.
4. Name sidebar expand/collapse and compact order actions. Expose selection in existing view button groups; retain handlers, route links, and tutorial targets.
5. Run focused tests, `npm run typecheck`, and the existing EN/ZH parity checker.

## Task 3 — Contract identity and useful density (R10, R11)

Files: `src/components/{Marketplace,MyTrades,TradeHistoryPage}.tsx`, relevant locales, `src/tests/my-trades.test.tsx`, and marketplace component tests.

1. Add a rendered assertion that narrow-row markup includes canonical delivery-window, expiry, and qualification detail, and that the embedded blotter has only one page heading.
2. Keep delivery-window identity visible below `xl`; put concise metadata in the existing sticky product cell and use labelled disclosure for longer qualification details. Reuse current formatters.
3. Make `MyTrades` support its actual standalone and embedded callers. The parent owns the embedded page frame; keep refresh, status filters, loading/error states, and horizontal scrolling.
4. Run focused tests and inspect 1440×1000 and 1024×768 screenshots, including keyboard access to details.

## Task 4 — Small interaction repairs

Files: `src/components/{OrderBook,BuyerMap,OrderPlaceModal,MobileDesktopGate,Settings}.tsx`, relevant locales, and existing tests.

1. Make non-executable orderbook levels keyboard-inspectable without giving them execution semantics.
2. Remove pointer/hover promises from inert recent-map rows.
3. Add a public-site exit to the desktop gate and respect reduced motion in order-success feedback.
4. Remove the duplicate profile compliance-email toggle; retain the explicitly named detailed preference and its existing behavior.
5. Raise affected supporting market text to the existing 11px minimum where practical; do not perform a global cosmetic rewrite.
6. Run focused behavioral checks and the browser pass. Context-free order defaults remain a lower-priority design decision, not a trading logic change in this batch.

## Task 5 — Configurable seller fees (R9)

Read the public backend fee schedule and authenticated current subscription through the existing API service. Show actual current plan, seller-only per-MT rates, and always-free buyer transaction fees. Include honest loading/error/retry states. Keep subscription seat pricing unchanged. Add changed-configuration and error-state regressions. The backend stores immutable per-trade rates; do not calculate historical fees from today's configuration.

## Final gate

Run the complete frontend test suite, typecheck, translation parity, release/artifact guard tests, and a local build. Reuse the audit's loopback preview and normal approved staging sign-in with business writes blocked. Inspect home, map, marketplace, order dialog without submission, trades, settings, 1024px desktop, and the mobile gate. Apply Web Interface Guidelines to touched UI. Record tests, review results, changed commits, and any remaining product decisions. Production release requires separate operator authorization.

## Progress

- [x] Isolated repair branch created; production work preserved.
- [x] Tasks 1–4 implemented; specification review passed.
- [x] Complete quality-review corrections (password-rule state and async test wait); first-batch quality review passed.
- [x] Billing reads the public configured rates and effective current subscription; buyer-free copy, private cache boundary, failure/retry states, and current-plan actions verified. Fee specification review passed.
- [x] First full regression run: 89 files, 507 tests passed before the final small corrections and fee work.
- [x] Local read-only preview verified at 1024px, 1440px, and the mobile gate; subscription GET is blocked because it can create a row.
- [x] Final Billing visuals inspected at 1024px and 1440px and in Chinese using explicitly marked local fixtures. Changed fixture rates prove API-driven display, not a deployed backend contract.
- [x] Typecheck, translation parity, artifact guard tests, mocked release policy tests, local production-mode build, and canonical production API artifact check passed.
- [x] Final full regression run: 90 files, 512 tests passed after correcting two test-only async-readiness races. Final contrast/control slice: eight passed. Typecheck, translation parity, production build, and artifact checks passed on the final source.
- [x] Final fee UI quality review passed, including configured/zero rates, actual plan, buyer privacy types, light/dark contrast, responsive cards, and EN/ZH visuals. Mobile registration contrast and password-state text were inspected at 390px.
- [x] Generated build and dependency roots are excluded from TypeScript input; application source and maintenance scripts remain checked.
- [ ] Separate operator release authorized (not part of this request). Backend and negotiated Enterprise rates must be ready before this Billing UI is exposed.
