# Verdaxis Regression Repair Plan

Date: 2026-04-28

## Objective

Clear the regressions found during the platform documentation/code review pass and verify the deployed frontend/backend codepaths do not regress:

- frontend production build resolves all imports
- public-page tests render translated content reliably
- activity/RFQ real-time clients connect to an implemented backend SSE contract
- price discovery includes both buyer-initiated and seller-initiated trades
- auto-match notifications include real trade IDs

## Non-Negotiables

- Preserve existing dirty worktree changes unless they are directly in the failing surface.
- Keep the RFQ UI archived behind `VITE_ENABLE_RFQ`; do not re-enable it in primary navigation.
- Do not add client-side AI secrets or Authentik runtime dependencies.
- Backend unit tests must pass under Python 3.12.
- Frontend build must pass.
- Frontend tests should pass or leave only explicitly quarantined historical expectations with a clear reason.

## Backend Plan

1. Add regression coverage for price discovery with a seller-initiated BID-hit trade whose `ask_order_id` is null.
2. Replace price discovery's ask-only join with a single order join that selects the order carrying product and delivery point metadata.
3. Flush after creating auto-matched trades before notification payloads are assembled.
4. Implement `/api/stream/activity` SSE, using the existing event bus and an optional token query parameter for backward compatibility with current frontend clients.
5. Re-run `python3.12 -m pytest tests/unit/ -q`.

## Frontend Plan

1. Restore the missing trade analytics utility expected by `TradeHistoryPage`.
2. Make namespace loading cancel-safe and test-friendly so components do not update after unmount.
3. Add test setup to pre-load lazy i18n namespaces before public-page tests render.
4. Align SSE clients with backend activity stream behavior without leaking tokens into request logs where a header-capable stream is available; keep compatibility for native `EventSource`.
5. Re-run `npm run test -- --run` and `npm run build`.

## Review Gates

- Self-review for API contract drift, auth leakage, and dead compatibility code.
- Fresh-context review after patches for backend correctness and frontend regression risk.
- Dogfood via local backend/frontend smoke checks and public API curls.
