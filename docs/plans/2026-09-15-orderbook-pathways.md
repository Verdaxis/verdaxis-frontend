# Focused Orderbook Implementation Plan

**Superseded — 15 September 2026.** The owner withdrew this concept after product review with Gavin. See `2026-09-15-remove-pathway-preview.md`. RCF/Advanced distinctions remain offer-level CI/origin/certification details; Gasoil is excluded. The five frontend-only preview records were removed, not converted into executable orders.

**Goal:** Implement selected concept A on the existing Orderbook tab, dogfood locally, then release to staging with five non-executable email-derived supply previews.

**Architecture:** Keep exact canonical product/port/window identities and existing execution APIs. Group selection by fuel family, then pathway, and show one book. A lazy, build-gated staging preview contains the supplied offers as a different type from executable orders; it never creates orders, sends enquiries, or contributes to prices, curves, or depth.

**Tech Stack:** Existing React, TypeScript, Tailwind, VerdaxisSelect, ConfirmModal, Vitest, agent-browser. No new dependency, backend release, schema change, or production deployment.

## 1. Selection and rendering

- Add `src/components/trading/OrderbookFilters.tsx`: shared family/pathway controls, with location and period controls using existing inputs. Preserve explicit selected/missing states and canonical product identities.
- Add `src/components/trading/FocusedOrderbook.tsx`: connect those controls to Marketplace state and reuse `OrderBook`. Keep recent trades reachable in a collapsed section. Do not aggregate pathways or invent counts.
- Modify `src/components/Marketplace.tsx`: render the focused workspace only in Orderbook; keep Listings, My Listings, watchlists and trade actions intact. Support `?view=orderbook&preview=supply` for staging review.
- Test selection, exact-slice handoff, keyboard operation, empty and missing-filter states.

## 2. Supplied offers preview

- Add `src/components/trading/StagingSupplyPreview.tsx`: RCF Gasoil 5,000 MT; RCF Fuel Oil 10,000 MT; RCF Ethanol 2,000 MT; Advanced Ethanol 2,000 MT, all Q1 2027 and ARA/Baltic; RCF Methanol 100,000 MT, Q1 2030 and ARA only.
- Preserve the email's proposed Argus references as text, not complete formulas. Display unconfirmed certification, exact port, quantity basis and formula terms. Do not infer 85% cargo GHG savings from the benchmark wording.
- Allow family/pathway, location and timing filtering. One offer remains one offer even when available in multiple regions. Enquire opens a labelled preview dialog, never a send/execute operation.
- Gate the module to development/staging builds. Verify the production artifact excludes all five offer records and the preview chunk.
- Test every offer, filters, missing numeric price, enquiry disclosure, and exit to the ordinary book.

## 3. Reliability and verification

- Prevent superseded OrderBook requests from showing prices under a newly selected market; clear old tooltips and hide stale rows during scope changes.
- Add EN/ZH copy. Run focused tests, the full suite, typecheck and translation checks.
- Build staging and production artifacts with explicit API targets. Check staging robots and production preview exclusion.
- Dogfood authenticated local UI at 1440, 1024 and 768px, EN/ZH, light/dark, fast pathway changes, all five offers, keyboard/dialog focus, and exact market handoff. Preserve the mobile gate.
- Fix findings before release. Record evidence in `/home/jons-openclaw/artifacts/reports/verdaxis-orderbook-pathways-20260915/`.

## 4. Staging release

- Recheck clean staging source, commit reviewed changes, fast-forward staging, and run CI.
- Back up the exact staging `dist` artifact, deploy only tested staging output, then run live smoke and browser verification.
- Verify production bundle remains unchanged. Report staging URL, preview boundaries, checks, and evidence.

## Authorized design refinements

Use existing fonts, colours, 8px radii and shell rather than regenerating assets. Correct Image Gen column alignment, retain one visible bid/ask action on this screen, remove repetitive helper text, keep rows compact and readable. This is a functional staging evaluation of the selected design, not approval to publish Deniss's offers as executable orders.
