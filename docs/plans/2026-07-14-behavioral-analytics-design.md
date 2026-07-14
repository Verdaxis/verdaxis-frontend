# Behavioral Analytics and Admin Insights Design

## Objective

Measure how prospects and authenticated users move through Verdaxis without
collecting commercially sensitive data or allowing analytics failures to affect
the product. Present the useful aggregates in the existing Admin Dashboard.

This release is staging-first. Production analytics and session replay remain
disabled until the staging implementation has been reviewed.

## Architecture

- Umami v3 is the behavioral event store and reporting engine.
- One Umami website is used per environment. `surface` separates `landing`,
  `signup`, and `platform`; hostname and route remain available for breakdowns.
- The browser loads Umami only when `VITE_ANALYTICS_HOST` and
  `VITE_ANALYTICS_WEBSITE_ID` are configured.
- A typed frontend adapter owns event names, permitted properties, identity,
  and failure handling. Components must not call `window.umami` directly.
- The backend queries Umami with server-held credentials and returns aggregated,
  admin-only data. Umami credentials must never enter the frontend bundle.
- Registration, organization creation, order, and trade counts remain grounded
  in the Verdaxis database. Browser events measure intent and journey behavior;
  they are not the source of truth for economic activity.

## Privacy Contract

Allowed identity and segmentation fields:

- Internal Verdaxis user UUID as the Umami distinct ID.
- User role, view mode, organization type, language, environment, and surface.
- Canonical product, delivery point, availability window, side, and demo status.

Never send:

- Email, name, password, OTP, telephone number, organization name, IP-derived
  identifiers created by Verdaxis, uploaded documents, free text, or search text.
- Price, quantity, total value, counterparty, order ID, trade ID, vessel name, IMO,
  or any other commercially sensitive transaction detail.
- Full query strings. Page tracking must use normalized paths.

Session replay and heatmaps are disabled in this release.

## Event Taxonomy

Event names use `snake_case`. Properties are bounded enums or canonical IDs;
arbitrary strings are rejected by the adapter.

### Landing

- `landing_cta_clicked`: `cta`, `placement`, `language`
- `energy_calculator_started`: `language`
- `energy_calculator_completed`: `language`, plus canonical `fuel` and `port`
  only when the calculator actually exposes those selections. The current
  generic voyage comparison emits once after the first valid user-triggered
  result without inventing fuel or port values.
- `public_language_changed`: `from`, `to`

### Signup and authentication

- `signup_started`: `entry_point`, `language`
- `signup_role_selected`: `role`
- `signup_submitted`: `role`, `organization_path`
- `signup_organization_required`: `role`
- `signup_organization_submitted`: `role`, `organization_type`, `country`
- `login_submitted`: no properties
- `login_succeeded`: `role`
- `login_failed`: `reason_category`

Failure categories must be coarse (`invalid_credentials`, `account_state`,
`network`, `server`, `unknown`) and must not contain backend error text.

### Platform

- `platform_navigation`: `destination`, `view_mode`
- `market_slice_selected`: `product`, `delivery_point`, `window`
- `listing_opened`: `product`, `delivery_point`, `window`, `side`, `demo_status`
- `order_form_opened`: `product`, `delivery_point`, `window`, `side`
- `order_form_submitted`: `product`, `delivery_point`, `window`, `side`
- `trade_confirmation_opened`: `side`, `demo_status`
- `tutorial_started`, `tutorial_step_completed`, `tutorial_step_skipped`,
  `tutorial_completed`: bounded step identifier and role where applicable
- `estimator_opened`, `estimator_completed`: canonical port and fuel only

## Engagement Semantics

Umami provides visits, pageviews, bounce rate, and total time. The Admin
Dashboard reports average session duration as `totaltime / visits`, when visits
is non-zero. This is elapsed session duration, not proof of focus-aware active
time. It must display `--` rather than zero when analytics is unavailable. V1
does not add heartbeat events.

## Admin Dashboard

Add a `Product Usage` section inside the existing Analytics tab with a 7/30/90
day selector. It contains:

1. KPI cards: visitors, visits, average session duration, signup starts,
   completed registrations from Verdaxis, and registration conversion.
2. Acquisition-to-activation funnel: landing visitors, signup starts,
   completed registrations, users with a login in the period, and organizations
   that created at least one non-demo order in the period.
3. Daily trend: visitors and completed registrations.
4. Feature usage: top allowlisted platform events, never arbitrary event names.
5. Top entry pages and referrers for business-development attribution.

The section has explicit `loading`, `ready`, `empty`, and `unavailable` states.
Failure must not hide or invalidate the existing trading analytics.

## Reliability and Security

- Analytics calls are fire-and-forget and must never throw into product flows.
- Frontend requests use no secrets and respect the configured environment.
- The admin aggregate endpoint requires `ADMIN`, has a bounded period, request
  timeout, response-size limits, a short cache, and no raw session endpoint.
- Umami login credentials are stored only in backend/collector secret files.
- Collector health and database backups are monitored independently.
- The Admin endpoint returns `status=unavailable` with authoritative Verdaxis
  counts when Umami cannot be reached; it does not return a 500 solely because
  behavioral analytics is down.

## Acceptance Criteria

- Staging records normalized pageviews and allowlisted events for landing,
  signup, and platform routes.
- Authenticated sessions use only internal UUID plus allowed segmentation data.
- Tests prove PII and commercial fields are rejected or dropped.
- Signup and product actions still succeed when the tracker is absent or fails.
- Admin Product Usage renders real staging aggregates and authoritative database
  outcomes for 7, 30, and 90 days.
- A failed collector produces a contained unavailable state in Product Usage.
- Replay and heatmaps remain disabled.
- Browser dogfood covers landing -> signup, login -> marketplace, and Admin
  Product Usage at desktop and constrained-height viewports, with console and
  network inspection.

## Frontend Implementation Note

The backend aggregate contract implemented alongside this design separates
`behavioral` Umami data from `authoritative` Verdaxis counts and reports
`behavioral_status=available|unavailable`. The frontend maps that wire contract
to independent ready, empty, and unavailable display states. The backend does
not yet return daily registration points, so the frontend does not fabricate
that series; this remains a contract follow-up before the registration trend is
shown.
