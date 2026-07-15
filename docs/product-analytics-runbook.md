# Product Analytics Workspace — Runbook

Operational reference for the seven-tab admin Product Analytics workspace
(`/app/admin?analytics=<tab>`). The full specification lives in
`docs/plans/2026-07-15-product-analytics-workspace.md`; this runbook covers
what operators need after deployment.

## Architecture (one paragraph)

The React workspace fetches one ADMIN-only endpoint per tab under
`/api/admin/analytics/product-analytics/{overview,acquisition,activation,engagement,marketplace,retention,reliability}`.
Each endpoint composes two sources: authoritative PostgreSQL aggregates
(`be/app/services/product_analytics.py`) and windowed behavioral aggregates
from the local Umami 3.2.0 HTTP API (`be/app/services/behavioral_analytics.py`,
bounded 32-entry LRU, 5-minute success TTL). Metric definitions, provenance
rules (live/demo/reference/unknown), small-cell suppression, and coverage
semantics are frozen in the plan §1.4–§1.6 and enforced by
`be/tests/unit/fixtures/product_analytics.py`.

## Fact tables and retention

- `user_login_days` — one row per user per UTC day, upserted inside the login
  transaction. Pruned to **800 UTC dates** by
  `verdaxis-product-analytics-prune.timer` (daily 03:20 Asia/Singapore,
  `Persistent=true`). The service unit is oneshot and stays failed on error —
  the existing systemd monitor alerts on it.
- `user_status_transitions` — append-only approval history. **Never pruned.**
  Deployment migration `pa_20260715_analytics_facts` snapshots pre-existing
  Buyer/Supplier users at migration time (not backdated), so as-of
  qualification before the deployment date returns null with
  `insufficient_coverage`.

Operator commands:

```bash
sudo systemctl status verdaxis-product-analytics-prune.timer
sudo journalctl -u verdaxis-product-analytics-prune.service -n 20
```

## Coverage semantics (what "null" means)

Every response carries `meta.coverage` per source
(authoritative/behavioral/login_history/status_history/reference). A metric is
`null` when its source cannot cover the requested interval — never zero, never
inferred from `User.last_login`/`User.status` snapshots. Suppressed cells
(`{count: null, suppressed: true}`) mean 1–2 underlying users/organizations;
zeros are genuine. UI renders suppression as “< 3”.

## Performance budgets

- p95 ≤ 500 ms warm / ≤ 1500 ms cold per tab (90-day query), body ≤ 250 KB.
  Verify with `be/scripts/benchmark_product_analytics.py` (see its docstring).
- Measured 2026-07-15 (staging): warm p95 119–168 ms and max body 23 KB on all
  seven tabs — within budget. **Documented exception:** cold first-hit on the
  four behavioral tabs (overview/acquisition/engagement/reliability) measured
  2.8–5.3 s because the local Umami collector answers its first aggregate
  fan-out slowly; the 5-minute behavioral cache absorbs everything after, and
  the UI shows the tab-scoped loading state meanwhile. Authoritative-only
  tabs are within the cold budget (≤ 513 ms).
- SQL: ≤ 8 round trips per single-source tab. Documented exception:
  Marketplace `activity=ALL` composes reference coverage for **10** bounded
  lookups (no loops). Enforced by statement-count tests.
- EXPLAIN report: `be/scripts/explain_product_analytics.py --days 90 --output …`
  (read-only, redacted). As of 2026-07-15 all plans are small-table sequential
  scans, so the optional composite indexes from plan §2.6 are deliberately
  **not** installed; re-run the report if row counts grow and add indexes only
  on plan evidence.

## Behavioral collector contract

Only the verified Umami routes are called (see
`be/docs/behavioral-analytics-contract.md`): `event-data/properties`,
`event-data/events?event=<name>`, `event-data/values?event=&propertyName=`.
The unfiltered events form 500s on this build; `event-data-pivot` is excluded
(drift-probed only). Cross-tabs the API cannot provide (CTA×placement,
destination×view-mode, destination×latency) are shown per dimension and
labelled unavailable. Re-verify after any Umami upgrade:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
set -a; source .env.analytics; set +a
venv/bin/python scripts/smoke_umami_product_analytics.py
```

## Reliability telemetry (frontend)

`frontend_error`, `backend_unavailable`, `navigation_performance` — bounded
enums only, 60-second per-session dedupe, stable 10% session sampling for
navigation latency. No stack traces, URLs with query strings, or identifiers
ever leave the browser (`fe/src/services/analytics.ts`).

## Deployment checklist

1. Backend: `alembic upgrade head` (creates fact tables + snapshot), restart
   `verdaxis-staging-be`.
2. Install/enable systemd units from `be/deploy/systemd/`:
   `sudo cp … /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now verdaxis-product-analytics-prune.timer`
3. Frontend: standard staging deploy (`npm run verify` first).
4. Run the Umami smoke (above) and the endpoint benchmark; record results.
5. Dogfood: every tab in both states (sparse pilot data and demo/ALL
   marketplace), URL round-trips (`?analytics=marketplace&activity=ALL`),
   language toggle, and confirm suppression markers instead of zeros.

## PostgreSQL correctness suite

`be/scripts/run_product_analytics_postgres_tests.sh` runs
`be/tests/postgres/` against a disposable `postgis/postgis:15-3.3` container
(also in CI as the `postgres-analytics` job). The database name must end in
`_analytics_test`; the harness refuses anything else.
