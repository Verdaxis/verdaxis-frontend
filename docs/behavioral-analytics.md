# Frontend Behavioral Analytics

## Runtime

The optional Umami v3 tracker is owned by `src/services/analytics.ts`. It is
enabled only when both `VITE_ANALYTICS_HOST` and
`VITE_ANALYTICS_WEBSITE_ID` are valid. Disabled or invalid configuration does
not add a script element or make analytics requests.

`AnalyticsProvider` initializes the tracker and records manually normalized SPA
pageviews. Verdaxis does not assign authenticated user IDs or other distinct IDs
to analytics sessions. It does not send names, email addresses, organization
names, URL query strings, or transaction content. Components call the typed adapter; direct
`window.umami` access is prohibited outside the adapter.

Umami automatic page tracking is disabled so paths are sent without query
strings. Replay and heatmaps are not configured.

Staging uses `https://api-staging.verdaxis.exchange` for the public
`/script.js` and `/api/send` collector paths. Management endpoints remain
private. Production analytics variables are explicitly empty for this rollout.

## Event Rules

Events and permitted properties are defined in `AnalyticsEventMap` and enforced
again at runtime by per-event schemas. Unknown properties are dropped. Property
values are limited to bounded enums or short canonical tokens. Do not add free
text, search terms, prices, quantities, totals, order/trade IDs, counterparties,
vessel identifiers, uploaded-document metadata, or PII.

Tracking is fire-and-forget. Calls queue briefly while the script loads and are
dropped if the collector is unavailable; tracker errors never propagate into a
Verdaxis workflow.

The Admin KPI labels Umami `totaltime / visits` as average session duration. V1
does not emit heartbeat events and does not claim focus-aware active time.

The public calculator emits `energy_calculator_completed` once per mounted
calculator, after the first user edit produces a valid result. Initial render
does not count as completion, later edits do not produce repeated completions,
and the generic comparison does not invent fuel or port values. Landing and
Pilot registration CTAs use explicit, allowlisted placements rather than
document-wide click capture.

## Admin Product Usage

`GET /admin/analytics/product-usage?days=7|30|90` is mapped in
`src/services/api.ts` and rendered by `ProductUsageSection` inside the existing
Admin Analytics tab. The section owns its loading, ready, empty, and unavailable
states so behavioral analytics failure cannot hide commercial analytics.

The current backend contract provides daily visitor points but not daily
registration points. The chart therefore renders visitors only. Add an
authoritative daily-registration series to the backend response before adding a
registration line.

## Verification

Tests cover disabled configuration, path normalization, property allowlisting,
failure isolation, API mapping, period switching, and degraded Admin rendering.
Production remains disabled until the staging
collector and privacy behavior are reviewed.

## Reliability Telemetry (Product Analytics plan §2.5)

Three additional typed events power the admin Reliability tab, wired through
`src/services/analytics.ts` (`createReliabilityReporter`):

- `frontend_error` `{route_family: landing|signup|platform|admin, category: render|chunk|network|unknown}`
- `backend_unavailable` `{route_family: signup|platform|admin}`
- `navigation_performance` `{destination: <12-value registry>, view_mode: BUYER|SUPPLIER, latency_bucket: lt250|250_500|500_1000|1000_2500|gte2500}`

Rules: bounded enum values only — never stack traces, URLs with query
strings, request bodies, or identifiers. Identical error category +
route-family pairs deduplicate for 60 seconds per browser session.
Navigation latency is sampled at a stable 10% per browser session (decision
stored once in sessionStorage) and only the bucket leaves the browser.
