# Site Checklist Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Check all 20 requested launch basics and implement confirmed gaps without changing trading policy or inventing business facts.

**Architecture:** Extend the existing React SPA, public layout, locale system, and optional Umami adapter. Keep authenticated routes private and preserve existing release controls. Work on `fix/site-checklist-20260913`, based on the reviewed audit frontend, without changing live branches.

**Tech Stack:** React 19, TypeScript, Vite 6, React Router, Tailwind, i18next, Vitest.

---

## Baseline and constraints

- Custom 404 exists but is not connected to all unknown routes.
- Most pages inherit one HTML title and have no description. No robots or sitemap assets exist.
- Favicon exists; logo PNGs total about 720 KB. Alt text and image sizes need a complete source scan.
- Privacy and Terms pages exist. Do not invent legal text, a registered company name, certifications, or a street address.
- Umami is installed behind public environment settings, but no visitor consent controls exist. Essential login storage must remain functional.
- Public pages and authentication have responsive styles. The authenticated workspace intentionally requires desktop widths; this task does not authorize mobile trading.
- Registration has a real success state. A thank-you route must follow actual successful registration, not pretend a mailto click submitted an application.
- No database, dependency upgrade, live data changes, or deployment in this checklist pass. Keep previous staging/prod release handoff separate.
- Owner confirmed the public postal address: `71 Ayer Rajah Crescent #02-15, S139951`. Display as `71 Ayer Rajah Crescent, #02-15, Singapore 139951`; no further address decision is pending.
- Owner wants visible design choices discussed before finalization. Mobile CTA must match the desktop label and destination: Apply for Pilot → localized `/pilot`. The social image uses the logo plus the exact descriptor `Low Carbon Fuels Exchange`. Owner approved a compact cookie notice with side-by-side `Essential only` / `Allow analytics` controls.

## Task 1 — Metadata, crawlers, and 404 (Luna SEO agent)

**Files:** `src/App.tsx`, `src/components/public/PublicLanguageWrapper.tsx`, new route metadata module/component, `index.html`, `public/robots.txt`, `public/sitemap.xml`, static metadata build helper if necessary, metadata/route tests.

1. Read all routes and dynamic content catalogs. Record indexable EN/ZH URLs, private routes, existing redirect policy, and exact 404 gaps.
2. Add focused failing checks for route-specific titles/descriptions, unknown routes, private noindex, and valid public-only sitemap URLs.
3. Implement one shared metadata source for public, auth, and dashboard pages, with translated descriptions, canonical URLs, and OG defaults. Do not put private identifiers or tokens into metadata.
4. Ensure public social metadata exists in emitted HTML for crawlers that do not run JavaScript; reuse build tooling and avoid a framework migration.
5. Route unmatched URLs to the existing custom 404 without breaking auth guards, locale routes, or legacy redirects.
6. Coordinate thank-you route and existing optimized OG asset with other agents. Own `App.tsx` integration.
7. Run focused Vitest with one worker and report exact commands/results. Do not commit shared files before orchestrator review.

## Task 2 — Cookie choices and analytics (Luna consent agent)

**Files:** `src/services/analytics.ts`, `src/components/AnalyticsProvider.tsx`, new consent module/banner, owned tests, `docs/behavioral-analytics.md`, and EN/ZH `common.json` only.

1. Read all analytics entry points, initialization, queue handling, and existing tests.
2. Add failing tests for no optional tracking before consent, equal accept/reject controls, persistent choice, withdrawal, storage failure, and no queued pre-consent events.
3. Add small first-party preference storage with fail-closed optional analytics. Keep essential authentication, language, and theme storage working.
4. Reuse the existing typed Umami adapter and event allowlist. Do not add a tracker, analytics credentials, or consent library.
5. Provide an accessible banner plus a reusable settings button. Mount through AnalyticsProvider so all routes can change the choice; coordinate footer placement with the conversion agent.
6. Run focused tests with one worker. Document that legal policy already exists and any copy change needed for actual new behavior.

## Task 3 — Conversion and completion (Luna conversion agent)

**Files:** `src/components/public/PublicLayout.tsx`, `PublicFooter.tsx`, new mobile CTA, relevant hero styles only if needed, `src/pages/RegisterPage.tsx`, new `src/pages/public/ThankYouPage.tsx`, EN/ZH `public.json`/`auth.json`, owned tests.

1. Inspect actual hero CTA placement, nav, public breakpoints, register/create-organization success, and form error behavior.
2. Add focused checks for mobile CTA target and hiding on unsuitable routes, successful registration completion, and no false success on failure.
3. Add a restrained sticky public mobile CTA with safe-area padding and enough content clearance. It must not cover cookie controls, forms, legal pages, or the authenticated workspace.
4. Add a localized thank-you page linked from a real successful submission. Preserve required verification and organization steps. Do not add a new lead API or convert mailto into fake submission.
5. Put the existing `info@verdaxis.exchange` and owner-confirmed postal address in the footer. Preserve existing Terms/Privacy text, update only analytics-choice wording to match Task 2.
6. Fix any clear touched loading/error accessibility gaps; avoid broad form refactors.
7. Run focused tests with one worker and send route/metadata integration contract to Task 1.

## Task 4 — Image inventory and optimization (Luna assets agent)

**Files:** `public/` image variants, a small reproducible optimization/check script if needed, image-only callers outside Tasks 1–3 ownership, owned asset tests.

1. Inventory every rendered `<img>`/SVG image, dynamic logo fallback, and CSS image source across the frontend. Decorative images need empty alt; meaningful images need useful alt.
2. Reuse the exact current brand assets. Create appropriately sized compressed variants with available tooling; no visual rebrand, new image dependency, or external tracking host.
3. Provide a crawler-compatible local OG raster asset with known dimensions and accessible description for Task 1 to reference. Preserve original source assets.
4. Set intrinsic sizes, lazy loading only below the fold, and safe fallback behavior where appropriate. Coordinate image-only changes to another agent's files instead of racing their edits.
5. Add a runnable asset/alt regression check. Report before/after transfer sizes, not unsupported performance scores.

## Review and verification

1. Main reviews the plan for scope, privacy, route behavior, ownership conflicts, and maintainability before agents implement. Result: approved; postal address and visible design choices are now confirmed.
2. Review each domain against the checklist, then review code quality with fresh Luna review agents. Fix material findings before acceptance.
3. Run all tests once with `npm test -- --maxWorkers=1 --minWorkers=1`, plus `npm run typecheck`, `npm run i18n:check`, target-strict production/staging build checks, and relevant artifact/release tests.
4. Run a local static preview bound to loopback, no credential fixtures. Dogfood EN/ZH public pages, 404, metadata, cookie choices, thank-you wording, and mobile CTA at 390×844, 768×1024, and 1440×1000.
5. Produce a 20-item evidence report distinguishing implemented source, tested behavior, remaining external facts, and deployed status. No claim of live deployment.

## Outcome

All 20 items are covered in source. Four independent Luna reviews passed after fixes, including tablet navigation, consent timing/storage, metadata ownership, and asset loading priorities. Final verification: 553 tests in 98 files, typecheck, translation parity, both target-strict builds, 10 artifact checks, and 10 release-smoke checks passed. Local browser checks cover EN/ZH and 320/390/768/900/1440px widths.

The production canary smoke now verifies raw EN/ZH public metadata before promotion. This gate is not applied to older rollback artifacts. Vite preview's slashless directory behavior is not treated as proof of live Vercel routing; no live canary, deployment, migration, commit, or push occurred here.

Evidence: `/home/jons-openclaw/artifacts/reports/verdaxis-site-checklist-20260913/REPORT.md`. Continue any deployment through the separate coordinated backend-first audit release plan.
