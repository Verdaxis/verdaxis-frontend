# Reference Price Contract Repair Plan — 2026-06-17

## Scope

Repair the small but user-visible drift around `GET /api/prices/reference` before moving to larger market-intelligence features.

This is a staging-first slice on top of `feat/staging-forward-drilldown-20260616`. It must not deploy production changes, and it must not introduce any new live-data claims.

## Current Evidence

- Frontend client contract currently exposes and serializes `date_from` and `date_to` in `src/services/api.ts` when callers provide date filters.
- Current visible UI callers are `MarketTerminal.tsx` and `TradeHistoryPage.tsx`; they do not currently pass date filters, but they consume `/api/prices/reference`.
- Staging OpenAPI advertises `from` and `to` for `GET /api/prices/reference`.
- Live staging behavior:
  - `date_from/date_to` returns HTTP 200, but the backend ignores those params.
  - `from/to` reaches the backend date filters but returns HTTP 500.
- Backend root cause:
  - `app/routers/price_discovery.py` parses `from/to` into Python `date` values.
  - `compute_reference_prices()` converts those dates to ISO strings before comparing with `func.date(Trade.created_at)`.
  - Postgres then compares `date >= varchar`, producing `operator does not exist: date >= character varying`.

## Non-Negotiables

- Make `date_from` and `date_to` the preferred contract because the active frontend API client already exposes those names.
- Preserve compatibility for generated/OpenAPI clients that may have followed the previously advertised `from` and `to` aliases.
- Fix both JSON reference endpoint and CSV export if they share the same date comparison path.
- Keep response semantics unchanged: empty data returns `prices: []`, not an error.
- Do not add fake reference prices, demo prices, or fallback market activity in this slice.
- Keep reference-price language as VWAP/reference/confirmed-trade-derived context, not live executable market data or full-market provenance. `ReferencePriceItem` still does not expose `source_kind`, `demo_status`, or `provenance_kind`.
- Deploy staging only.

## Branch And Deployment Guardrails

Backend staging source:

- Path: `/home/verdaxis-prod/verdaxis/staging/be`
- Current branch: `feat/staging-market-activity-contract-20260617`
- Current SHA at planning time: `f8fc653fdb11d4531e3b035e83614c67b8d9ca38`
- Deployment must use:
  - `sudo -u verdaxis-prod env TARGET_BRANCH=feat/staging-market-activity-contract-20260617 ./scripts/deploy.sh --dry-run`
  - `sudo -u verdaxis-prod env TARGET_BRANCH=feat/staging-market-activity-contract-20260617 ./scripts/deploy.sh`

Frontend staging source:

- Path: `/home/jons-openclaw/verdaxis-staging-fe`
- Current branch: `feat/staging-forward-drilldown-20260616`
- Do not use `scripts/deploy.sh`; that script checks out `main` and is unsafe for this branch.
- If frontend deploy is needed, use the manual staging flow: push branch, fast-forward `/home/verdaxis-prod/verdaxis/staging/fe` on the same branch, then `sudo -u verdaxis-prod npm run build`.

## Implementation Plan

### Backend

Files:

- `/home/verdaxis-prod/verdaxis/staging/be/app/routers/price_discovery.py`
- `/home/verdaxis-prod/verdaxis/staging/be/tests/unit/test_price_discovery_router.py`
- `/home/verdaxis-prod/verdaxis/staging/be/tests/unit/test_reference_price_export.py`

Changes:

1. Compare `trade_date_expr` directly to Python `date` objects instead of `date_from.isoformat()` / `date_to.isoformat()`.
2. Add a small shared date-alias resolver for `(preferred, deprecated)` pairs:
   - accepts preferred-only, deprecated-only, or both equal.
   - returns HTTP 422 for conflicting aliases.
3. Allow compatibility aliases for `/prices/reference`:
   - preferred: `date_from`, `date_to`
   - deprecated compatibility: `from`, `to`
4. Validate `date_from <= date_to` through a shared helper used by JSON and CSV export paths.
5. Keep `/prices/reference/export` date names as `from_date` / `to_date` in this slice, but update its description so it no longer claims identical filter names to `/reference`.
6. Add tests that execute the reference-price computation with trades on both sides of the boundary and assert out-of-range rows are absent.
7. Add a Postgres-dialect statement/bind test that fails on the current bug by asserting compiled date filter bind values are Python `date` objects, not ISO strings.
8. Add route-level tests that prove `date_from/date_to` and `from/to` are both forwarded as `date` objects, and conflicting aliases return 422.
9. Add OpenAPI tests that assert:
   - `date_from` and `date_to` are present on `/api/prices/reference`.
   - `from` and `to` are present and marked `deprecated: true`.
   - `/api/prices/reference/export` describes its export-specific `from_date` / `to_date` names.

### Frontend

Files:

- `/home/jons-openclaw/verdaxis-staging-fe/src/services/api.ts`
- `/home/jons-openclaw/verdaxis-staging-fe/src/tests/api-prices.test.ts`

Changes:

1. Keep the public TypeScript parameter names `date_from` and `date_to`.
2. Keep serializing them as `date_from` and `date_to`.
3. Strengthen tests so date params are emitted when supplied.
4. Refresh the committed frontend OpenAPI snapshot from staging after backend deploy so it lists preferred `date_from` / `date_to` and deprecated `from` / `to`.
5. Add a lightweight frontend OpenAPI snapshot assertion for the reference endpoint parameters if no existing snapshot test covers this.

## Verification

Backend local checks:

- Run as the deployment owner because `.env` is `0600` and tests import `app.main`:
  - `sudo -u verdaxis-prod bash -lc 'cd /home/verdaxis-prod/verdaxis/staging/be && source ./venv/bin/activate && DATABASE_URL="sqlite+aiosqlite:///:memory:" pytest tests/unit/test_price_discovery_router.py tests/unit/test_reference_price_export.py -q'`

Frontend local checks:

- `npm run test -- src/tests/api-prices.test.ts`
- `npm run i18n:check`
- `npm run build`

Live staging smoke after backend deploy:

- Use assertions, not just HTTP status. Broken staging currently returns 200 for ignored `date_from/date_to` filters.
- First request a broader reference window with known data, e.g. `date_from=2026-06-01&date_to=<today>`, and capture at least two distinct returned `prices[].date` values. If staging has fewer than two reference dates, seed or choose a broader known-data range before claiming this smoke passed.
- Pick one returned date as `TARGET_DATE`.
- Request `?date_from=${TARGET_DATE}&date_to=${TARGET_DATE}` and assert:
  - response is HTTP 200.
  - `prices` is non-empty.
  - every `prices[].date` equals `TARGET_DATE`.
  - at least one date from the broader response outside `TARGET_DATE` is absent from the filtered response.
- Repeat the same assertions with deprecated aliases `?from=${TARGET_DATE}&to=${TARGET_DATE}`.
- `curl -sS -w '\nHTTP:%{http_code}\n' 'https://api-staging.verdaxis.exchange/api/prices/reference?date_from=2026-06-01&from=2026-06-02'`
- Expected for conflicting aliases: HTTP 422.
- `curl -sS 'https://api-staging.verdaxis.exchange/openapi.json'` and assert `/api/prices/reference` contains `date_from`, `date_to`, deprecated `from`, and deprecated `to`.
- If CSV export has data in the selected range, assert `from_date/to_date` filters exported rows by date. At minimum, invalid `from_date > to_date` must return 422.

Live staging frontend dogfood:

- Open `https://staging.verdaxis.exchange` as an authenticated buyer.
- Navigate Market Terminal and Trade History, which are the current visible callers of `api.prices.getReference()`.
- Confirm reference/VWAP strips and benchmark/performance comparisons remain labelled as reference or benchmark context, not live executable market data.
- Confirm browser network requests to `/api/prices/reference` return HTTP 200 and no console errors appear.

## Risks

- FastAPI cannot bind two aliases to one parameter directly without explicit compatibility parameters. Mitigation: add separate deprecated alias query params and merge them before calling `compute_reference_prices()`.
- SQLite and Postgres date coercion differ. Mitigation: keep one live staging curl smoke as the authoritative Postgres check.
- Old deployed frontend bundles may still call `date_from/date_to`. Mitigation: compatibility params remain for the backend route.
- `func.date(trades.created_at)` may not use a plain `created_at` index efficiently and may have timezone edge cases. This is acceptable for the staging repair but should be revisited before treating reference prices as a production data product.

## Out Of Scope

- Multi-window forward curve board.
- Fair-value bands, indications, stems, or multi-signal charting.
- Persistent user ticker preferences.
- Production deployment.
