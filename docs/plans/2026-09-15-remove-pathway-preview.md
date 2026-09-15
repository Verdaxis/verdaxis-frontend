# Remove pathway preview implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the rejected family/pathway experiment and supplied-offer preview from staging, while preserving independent bug fixes.

**Architecture:** Restore the prior Marketplace layout and canonical products. RCF/Advanced distinctions belong in offer-level CI, origin and certification evidence, not additional orderbooks. Gasoil is out of scope. Do not relabel RCF as certified biofuel or infer cargo CI from the email's 85% price-reference basis. No new product, order, backend or schema writes.

**Tech Stack:** Existing React, TypeScript, Vite, Vitest and Caddy staging deployment.

---

### Task 1: Remove the rejected UI

1. Restore prior `src/components/Marketplace.tsx` layout and its existing tests from `8f678077`, retaining independent URL, exact-scope and refresh fixes where applicable.
2. Delete `trading/FocusedOrderbook.tsx`, `trading/OrderbookFilters.tsx`, `trading/StagingSupplyPreview.tsx` and `src/tests/focused-orderbook.test.tsx`.
3. Remove unused preview/focused translations. Retain live spread and row-limit copy used by `OrderBook.tsx`.
4. Remove the preview-required artifact gate; keep existing build checks and both-environment CI checks.
5. Preserve decimal comparison/formatting, stale-response, refresh, demo-liquidity and order-modal test fixes.

### Task 2: Record and verify the product correction

1. Update `ARCHITECTURE.md`, `docs/design-system.md` and `tasks/lessons.md`; mark the previous concept plan and QA as superseded.
2. Confirm existing offer-entry CI/certification fields and document remaining catalog limits without inventing new mappings.
3. Add a regression that the old preview URL cannot expose supplied offers or Gasoil.
4. Run focused tests, typecheck, translation checks and staging build/artifact checks. Review the diff directly; no subagents.

### Task 3: Staging rollback release

1. Commit on this feedback branch; fast-forward staging only after checking its unchanged clean HEAD. Push staging and check CI.
2. Back up current staging generated assets. Deploy the verified staging build with scoped rsync.
3. Verify live entry hash, read-only smoke, normal-login Marketplace/orderbook, absence of the preview, preserved order inspection and CI details. Do not submit trades or orders.
4. Close task-owned browser and report staging outcome. Production remains unchanged.
