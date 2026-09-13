# Frontend Behavioral Analytics

## Runtime

The optional Umami v3 tracker is owned by `src/services/analytics.ts`. It is
available only when both `VITE_ANALYTICS_HOST` and
`VITE_ANALYTICS_WEBSITE_ID` are valid, and it starts only after the user opts
in to optional analytics. Disabled or invalid configuration, missing consent,
rejected consent, or unavailable preference storage does not add the tracker
script or dispatch analytics operations.

`AnalyticsProvider` initializes the tracker and records manually normalized SPA
pageviews after opt-in. The same gate is enforced in the typed adapter, so
component and reliability callers cannot bypass consent. Operations attempted
before consent are dropped, not queued for later replay. Withdrawal stops new
operations and clears operations queued while the consented tracker was
loading. Verdaxis does not assign authenticated user IDs or other distinct IDs
to analytics sessions. It does not send names, email addresses, organization
names, URL query strings, invitation codes, or transaction content. Components
call the typed adapter; direct `window.umami` access is prohibited outside the
adapter.

Every pageview and named event uses Umami's payload-function form. The adapter
keeps non-content defaults such as website, hostname, language, and screen;
replaces the URL with a normalized path; strips the default title; reduces
external referrers to their origin; and removes queries and invitation codes
from same-origin referrers. Event names and allowlisted properties are sent as
the payload's `name` and `data` fields.

Umami automatic page tracking is disabled so paths are sent without query
strings. Replay and heatmaps are not configured.

Repository configuration currently provides non-empty analytics host and
website-id values for both staging and production modes. That makes the
collector available; it does not override the user's preference gate.
Deployment configuration presence and a tracker being installed on a currently
deployed page are separate checks from consent behavior.

## Cookie Preferences

The preference banner distinguishes essential browser storage used for sign-in,
theme, and language from optional cookieless Umami analytics. Umami can still
process short-lived session technical data, so the interface does not describe
it as necessary storage or as collecting no data.

The per-device preference uses one small localStorage record at
`verdaxis:cookie-preferences`: `{ "version": 1, "optionalAnalytics": boolean }`.
Malformed or unknown versions are treated as no choice. Same-tab preference
events and cross-tab `storage` events update the provider; clearing storage
reopens the banner and disables optional analytics. If storage cannot be read or
written, analytics stays off and the banner reports that the choice was not
saved. Essential auth, theme, and language behavior is not gated by this
optional preference.

Accept and reject controls have equal visual weight. A reusable Cookie settings
control reopens the banner after either choice.

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
Tests also cover consent gating, no replay before consent, withdrawal queue
clearing, storage failure, same-tab and cross-tab updates, and reopening the
preference controls.

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
stored once in sessionStorage after analytics consent) and only the bucket
leaves the browser. Reliability sampling, deduplication, and sessionStorage
writes do not run before consent.
