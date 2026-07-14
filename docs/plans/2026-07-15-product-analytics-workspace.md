# Verdaxis Product Analytics Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Use `frontend-design` for the UI pass, then `verification-before-completion` before handoff. If the `superpowers:` namespace is unavailable in that Claude environment, use the local `executing-plans` skill and follow the same task/checkpoint order; do not skip gates.

**Goal:** Replace the single long Product Usage section with a seven-tab, privacy-safe Product Analytics workspace that gives executives a clear health summary and lets product, growth, marketplace, and operations teams diagnose the underlying drivers.

**Architecture:** Keep `Platform Admin > Analytics` as the existing top-level route and add a URL-addressable analytics sub-navigation: Overview, Acquisition, Activation, Engagement, Marketplace, Retention, and Reliability. Behavioral aggregates continue to come from self-hosted Umami; authoritative users, organizations, orders, and trades continue to come from PostgreSQL. The backend owns metric definitions and returns presentation-ready aggregate contracts so the frontend never reconstructs business logic.

**Tech Stack:** FastAPI, SQLAlchemy async, PostgreSQL, Pydantic, React 19, TypeScript, React Router, TanStack-style request patterns already wrapped by `src/services/api.ts`, Recharts, Tailwind, Lucide, i18next, Vitest, Testing Library, pytest.

**Repositories:**
- Backend: `/home/verdaxis-prod/verdaxis/staging/be`
- Frontend: `/home/verdaxis-prod/verdaxis/staging/fe`
- Deploy staging only until the user explicitly approves production.

---

## 1. Product And Design Contract

### 1.1 Information architecture

Preserve the existing first-level tabs:

```text
Platform Admin
  Analytics
  Users
```

Inside `Analytics`, replace the entire current analytics body (Product Usage,
commercial KPI cards, charts, audit table, and commission summary) with:

```text
Overview | Acquisition | Activation | Engagement | Marketplace | Retention | Reliability
```

`Overview` is the compact UI label for the user-approved **Executive Product
Health** default. Do not rename it to a narrower growth or operations label.

Use `?analytics=<tab>&period=<period>` on `/app/admin`, not a second route tree. Existing links to `/app/admin` must continue to work and default to `analytics=overview`. Persist filters in the URL so an admin can bookmark or share a view. Unknown tab/filter values must canonicalize to safe defaults with `replace`, not produce an error page.

### 1.2 Visual direction

This is a quiet market-telemetry console, not a marketing dashboard:

- Keep the existing Verdaxis shell, typography, color tokens, border treatment, and maximum 8px radii.
- Use a compact underline tab rail, not pill buttons.
- Keep a single sticky filter rail below the tabs.
- Use small multiples, ranked tables, sparklines, lifecycle bars, and compact heatmaps.
- Do not put cards inside cards. KPI cards may form one top strip; analytical sections below are unframed bands or one-level panels.
- Use green for healthy movement, amber for friction, red only for genuine failures, and neutral blue for informational series.
- No decorative gradients, oversized headings, or invented illustration.
- Charts must always have stable heights and explicit empty states so sparse pilot data does not collapse the layout.

### 1.3 Global controls

The filter rail owns:

| Filter | Values | Tabs |
|---|---|---|
| Period | `7D`, `30D`, `90D`, custom date range | all |
| Compare | previous equivalent period on/off | all |
| Audience | All, Buyer, Supplier | Activation, Engagement, Retention |
| Activity | Live, Demo, Reference, All | Marketplace only |
| Product | canonical active products from catalog | Marketplace only |
| Port | canonical active delivery points from catalog | Marketplace only |
| Window | canonical availability windows from catalog | Marketplace only |

Hide irrelevant filters instead of leaving disabled controls. Keep the period and comparison controls stable in position across tabs.

### 1.4 Data integrity rules

1. Never join anonymous Umami visitors to authenticated Verdaxis users.
2. Treat the lifecycle visualization as aggregate stage signals, not a user-level funnel.
3. Suppress a conversion when its numerator and denominator do not share a valid collection window.
4. Exclude admins from user/product engagement metrics unless the UI explicitly selects an admin-only diagnostic.
5. Exclude seeded demo organizations from live metrics using `DEMO_MARKET_ORG_IDS`.
6. Show demo and live marketplace activity separately; never add them into a number labelled live.
7. Use UTC for all buckets and return dense date series.
8. Return `null`, not zero, for unavailable or mathematically invalid metrics.
9. Include `observed_at`, typed per-source coverage, and data-quality metadata in every tab response.
10. Never expose email, name, user UUID, organization name, order ID, trade ID, IP address, or free text in Product Analytics responses.
11. Canonicalize breakdown values through server-owned allowlists: roles from `UserRole`, products/delivery points from active catalog rows, windows from the availability-window service, routes from a fixed route-family enum, and events from the analytics event registry.
12. Apply small-cell suppression to every segmented cell: fewer than three underlying users/organizations, or fewer than three events when distinct entities are unavailable, returns `{count: null, suppressed: true}`. This includes cohorts, role/product/port/window/route/category breakdowns, login failures, tutorial steps, depth, spread, percentages, and deltas. Derived values render only when every input is unsuppressed. Unsegmented headline totals remain visible.
13. Restrict behavioral strings to normalized allowlisted route paths, normalized bounded referrer hostnames (scheme/path/query/fragment/port removed; invalid values become `Other`), and registered event-property enums. Never echo arbitrary free text.
14. Classify source provenance once in a shared backend helper: an order is `DEMO` when its organization is in `DEMO_MARKET_ORG_IDS`, `LIVE` when its organization is a recognized non-demo market-member organization, and `UNKNOWN` otherwise. A trade is `DEMO` if either party is demo, `LIVE` only when both parties are recognized non-demo market-member organizations, and `UNKNOWN` otherwise. Mixed live/demo trades are therefore demo-contaminated, never live.
15. `ALL` never sums unlike sources. Marketplace responses contain separate `live`, `demo`, `reference`, and `unknown` sections; headline KPIs continue to use `live` only.
16. Every period is a half-open UTC interval `[start, end)`. Previous comparison is `[start - (end-start), start)`. Daily buckets are UTC calendar dates intersecting that interval.

### 1.5 Metric definitions

Use these definitions verbatim in backend docstrings and user-facing tooltips:

| Metric | Definition |
|---|---|
| Qualified organizations | Distinct non-demo organizations with at least one Buyer/Supplier user whose latest recorded status transition at or before `end` is `APPROVED`; unavailable before status-history coverage |
| Registered members | Buyer/Supplier users created in the selected period |
| Active members | Buyer/Supplier users with a successful login in the selected period |
| Participating organizations | Distinct live organizations creating at least one non-demo order in the period |
| Trading organizations | Distinct live buyer or seller organizations in a confirmed/delivered/paid trade in the period |
| Live orders | Non-demo orders created in the selected period |
| Order execution rate | Distinct live orders created in the selected period that are linked as a bid or ask to at least one confirmed/delivered/paid trade, divided by all live orders created in the period; legacy trades with no order link are excluded from this rate |
| Confirmed volume | Quantity on confirmed/delivered/paid live trades |
| Realized GMV | `final_total_usd` on paid live trades only |
| Realized revenue | `Commission.amount_usd` where `Commission.status=PAID`, bucketed by `Commission.payment_date` |
| Retained organization | Organization with a live order or confirmed trade in both the current and immediately preceding equivalent period |
| Reactivated organization | Organization active in the current period, inactive in the preceding period, and active at least once before that |
| Average session duration | Umami `totaltime / visits`; label as session duration, never focus-aware active time |

Temporal and commercial semantics:

- User registration uses `User.created_at`; successful-login activity uses the new daily activity row date.
- Order creation and order age use `OrderBookOrder.created_at`.
- Economic trade activity uses `Trade.confirmed_at`; legacy confirmed rows with a null `confirmed_at` may use `Trade.created_at` only when the response marks `legacy_timestamp_fallback=true`.
- Confirmed volume uses `coalesce(Trade.final_quantity_mt, Trade.quantity_mt)` on confirmed/delivered/paid live trades bucketed by the economic trade timestamp.
- Realized GMV uses `Trade.final_total_usd` on `PAID` live trades bucketed by `Trade.paid_at`; rows missing `paid_at` are excluded from period GMV and reported in a data-quality count.
- Realized revenue uses `Commission.amount_usd`, `Commission.status=PAID`, and `Commission.payment_date`; it does not infer payment from trade status or `Trade.commission_amount_usd`.
- `Commission.payment_date` is date-only and is attributed to `00:00:00Z` on that UTC date. Apply the same half-open `[start,end)` predicate to that projected instant: a midday `start` excludes that date, while a midday `end` includes that date. The UI tooltip discloses daily accounting granularity for custom partial-day ranges.
- Exclude `PAID` commission rows with null `payment_date` from period revenue and report them in `missing_commission_payment_date_count`; never assign them to `Commission.created_at` as a fallback.
- Pending/invoiced commission totals use the `Commission` table and their own status labels; they are not realized revenue.
- Historical order execution is evaluated `as_of=end`: the order must be created in `[start,end)`, and a qualifying linked trade must have an economic confirmation timestamp `< end`. Later fills never retroactively improve a closed reporting period.
- Open/unfilled orders at `end` are right-censored. Return `cohort_complete=false` while the cohort can still receive a later fill and show that state in the UI.

### 1.6 Tab designs

#### Overview, default

Top strip, five KPIs with previous-period deltas:

1. Qualified organizations
2. Active members
3. Participating organizations
4. Live orders
5. Confirmed trades

Primary visual: a clickable lifecycle spine:

```text
Visitors -> Registered -> Active -> Participating -> Trading -> Retained
```

Each stage shows current count, prior-period delta, and a coverage indicator.
Do not show cross-stage conversion percentages here because the stages mix
anonymous visitors, people, and organizations. Clicking a stage switches to
the relevant detail tab. Ratios belong only inside detail tabs where numerator
and denominator use the same entity and compatible collection window.

Below the spine:

- Activity trend: visitors, active members, orders, and confirmed trades as toggleable series.
- Marketplace balance: unique buyer organizations vs supplier organizations plus bid/ask order counts.
- Needs attention: deterministic rules only, such as approved members never logged in, signup submission drop, one-sided live market activity, elevated login failures, or degraded analytics collection.

The old summary cards and charts do not remain below the workspace. Realized
GMV/revenue move to Marketplace; recent audit activity moves to Reliability.

#### Acquisition

- KPI strip: visitors, visits, pageviews, average session duration, CTA clicks.
- Visitors/visits trend with previous-period comparison.
- Ranked acquisition table: referrer, the count unit returned by the verified Umami metric endpoint, and share. Label the unit only after Task 1 characterizes it; do not assume it means unique visitors.
- Entry pages table: path, entrances (or the verified Umami count unit), share.
- CTA matrix: CTA by placement, clicks, share; do not call this conversion without impression data.
- Language split and calculator start/completion totals.
- Empty referrers must show `Direct / unknown` separately from true no-data.

#### Activation

- Aggregate journey: signup started, role selected, signup submitted, organization required, organization submitted, registered, approved, first login, first live order.
- Role split: Buyer vs Supplier at each available stage.
- Time-to-first-value distribution: registration to first login and organization creation to first live order. Use PostgreSQL timestamps only.
- Drop-off reasons: unverified, pending approval, rejected, organization incomplete, never logged in.
- User conversion ratios are allowed only between cohorts backed by `users` rows. Organization conversion ratios are allowed only between organization cohorts. Anonymous signup-event ratios remain separately labelled aggregate event ratios.
- Never divide historical DB registrations by analytics events collected only after `meta.coverage.behavioral.coverage_start`.

#### Engagement

- Active members trend from successful-login history.
- DAU/WAU/MAU and stickiness only after enough login-history coverage exists; otherwise show a coverage message.
- Feature adoption ranked by event family: marketplace navigation, market slice selection, listing views, order form opens/submits, tutorial, estimator.
- Workflow ratios: listing open -> order form open -> submit; tutorial start -> complete; estimator open -> complete. Label them aggregate event ratios.
- Navigation destination distribution split by Buyer/Supplier view mode.
- Tutorial step completion/skips as a compact step table.

#### Marketplace

- KPI strip: participating organizations, live bids, live asks, confirmed trades, confirmed volume, and order execution rate.
- Liquidity diagnostics: two-sided executable slices, one-sided slices, crossed live slices (expected zero), median quoted spread for exact product+port+window slices, median order age, and median time to first confirmed fill.
- A slice is executable only when product, delivery point, and availability window are all specific; never calculate spread or crossing across `Any` filters.
- An eligible live quote is an OPEN or PARTIALLY_FILLED non-demo order with `remaining_quantity_mt > 0`, non-null delivery point, and (`expires_at is null` or `expires_at >= as_of`).
- Best bid is maximum eligible bid price; best ask is minimum eligible ask price. Spread is `best_ask - best_bid` in USD/MT and `(best_ask-best_bid)/mid*10_000` in basis points when mid > 0. A crossed slice has spread < 0.
- Best depth is summed remaining quantity at the best price. One-percent depth anchors bids at `best_bid * 0.99` and asks at `best_ask * 1.01`, inclusive. Keep demo depth separate and suppress slice-level price/depth/spread when fewer than three distinct live organizations contribute.
- Buyer/supplier balance trend.
- Product x port matrix showing live order count and unique organization count.
- Availability-window distribution.
- Live/Demo/Reference segmented control; default `Live`. `Reference` means benchmark or price-discovery coverage and never contributes order, participant, depth, spread, execution, GMV, or revenue counts.
- Reference rows compose the canonical `BenchmarkQuote` and `MarketDataProvenance` data into the typed `ReferenceCoverageRow` below. Return stable server-owned catalog keys and labels, never catalog UUIDs. Product/port/window filters apply exactly as they do to live slices. Reference has no participant count, order count, depth, spread, execution rate, volume, GMV, or revenue. Do not relabel trade-derived `/price-discovery/reference` VWAP as an external benchmark.

```python
class ReferenceCoverageRow(BaseModel):
    product_key: str
    product_label: str
    delivery_point_key: str
    delivery_point_label: str
    availability_window: str
    availability_window_label: str
    benchmark_price_usd_per_mt: Decimal | None
    source_label: ReferenceSourceLabel
    generated_at: datetime
    observed_at: datetime | None
    source_kind: ReferenceSourceKind
    scope: ReferenceScope
    coverage_status: Literal["current", "stale", "unavailable"]
```

The three Reference enums are bounded server registries derived from existing provenance configuration; unknown database values map to `OTHER`, not arbitrary response strings. Emit one row per canonical requested product/port/window coverage cell. `current` requires a non-null price and observation timestamp; `stale` may retain a price but may have a null observation timestamp for seeded legacy data; `unavailable` requires both price and observation timestamp to be null. Test all seed-matrix and missing-observation mappings.
- Order status distribution and trade status distribution.
- Median time from order creation to first confirmed trade when linkable through bid/ask order IDs.
- Realized GMV, realized revenue, and commission status summary migrated from the existing Admin Analytics body.
- Top rows are canonical product, delivery point, and availability window only; never counterparties. Organization concentration may be returned only as an aggregate HHI/share band after small-cell suppression, with no names or IDs.

#### Retention

- Weekly member-login cohorts after login-history collection begins.
- Organization activity cohorts based on order/trade dates, which can include historical data.
- Returning members, retained organizations, reactivated organizations, and dormant approved members.
- Repeat participation: organizations active on 1, 2, 3+ distinct days in the period.
- Cohort cells show count and percentage; counts below the chosen privacy threshold remain aggregate but are not clickable.

#### Reliability

- Analytics collector state and last observation.
- Login failure categories and trend.
- Frontend error count and affected route family.
- Backend-unavailable events.
- Navigation latency buckets by destination.
- Data freshness for behavioral and authoritative sources.
- Recent security/business audit activity migrated from the existing Admin Analytics body, without exposing raw IP addresses in Product Analytics.
- This is product reliability telemetry, not the infrastructure monitor UI. Link to the system health page if one exists; do not duplicate server administration inside Product Analytics.

### 1.7 States and accessibility

- Every tab has independent loading, ready, sparse, unavailable, and error states.
- Behavioral failure must not hide authoritative marketplace/database analytics.
- Tabs use `role=tablist`, `role=tab`, `aria-selected`, and keyboard Left/Right/Home/End behavior.
- Charts require adjacent textual summaries or tables; color is never the only differentiator.
- Tooltips are keyboard reachable and rendered in a portal if they may be clipped.
- At the app's supported minimum desktop viewport, the tab rail may horizontally scroll but must keep the active tab visible.
- Respect `prefers-reduced-motion`; do not animate chart geometry on every tab switch.

---

## 2. API Contract

### 2.1 Shared query

Create a single validated query model used by all tab endpoints:

```python
class AnalyticsAudience(str, Enum):
    ALL = "ALL"
    BUYER = "BUYER"
    SUPPLIER = "SUPPLIER"

class AnalyticsActivity(str, Enum):
    LIVE = "LIVE"
    DEMO = "DEMO"
    REFERENCE = "REFERENCE"
    ALL = "ALL"

class ProductAnalyticsQuery(BaseModel):
    start: datetime
    end: datetime
    compare: bool = True
    audience: AnalyticsAudience = AnalyticsAudience.ALL
    activity: AnalyticsActivity = AnalyticsActivity.LIVE
    product_id: UUID | None = None
    delivery_point_id: UUID | None = None
    availability_window: str | None = None
```

Validation:

- Normalize timestamps to UTC.
- `end > start`.
- Maximum range 365 days.
- `REFERENCE` is accepted only by Marketplace and selects benchmark/price-discovery coverage, not orders or trades.
- Custom periods before behavioral coverage are allowed for authoritative data, but behavioral fields return null with the behavioral source's coverage metadata.
- Product, delivery point, and window filters are ignored outside Marketplace at the frontend; the backend Marketplace endpoint validates them against canonical active catalog records.

### 2.2 Endpoints

Add lazy-loaded endpoints rather than one giant response:

```text
GET /api/admin/analytics/product-analytics/overview
GET /api/admin/analytics/product-analytics/acquisition
GET /api/admin/analytics/product-analytics/activation
GET /api/admin/analytics/product-analytics/engagement
GET /api/admin/analytics/product-analytics/marketplace
GET /api/admin/analytics/product-analytics/retention
GET /api/admin/analytics/product-analytics/reliability
```

All endpoints:

- Require `ADMIN`.
- Use the existing per-token rate-limit key.
- Return a shared `AnalyticsMeta` object.
- Cache successful behavioral results for at most five minutes.
- Do not cache authorization failures.
- Bound arrays: daily series <= 366 points; ranked lists <= 20; matrices <= canonical catalog cardinality.

```python
class AnalyticsDiagnostic(str, Enum):
    DISABLED = "disabled"
    CONFIGURATION = "configuration"
    AUTHENTICATION = "authentication"
    TIMEOUT = "timeout"
    UPSTREAM = "upstream"
    MALFORMED_RESPONSE = "malformed_response"
    INSUFFICIENT_COVERAGE = "insufficient_coverage"

class AnalyticsDataQuality(BaseModel):
    legacy_timestamp_fallback_count: int = 0
    missing_paid_at_count: int = 0
    missing_commission_payment_date_count: int = 0
    suppressed_cell_count: int = 0
    cohort_complete: bool = True

class AnalyticsSourceStatus(str, Enum):
    AVAILABLE = "available"
    PARTIAL = "partial"
    UNAVAILABLE = "unavailable"
    NOT_APPLICABLE = "not_applicable"

class AnalyticsSourceCoverage(BaseModel):
    coverage_start: datetime | None
    coverage_end: datetime | None
    observed_at: datetime | None
    status: AnalyticsSourceStatus
    diagnostic: AnalyticsDiagnostic | None

class AnalyticsCoverage(BaseModel):
    authoritative: AnalyticsSourceCoverage
    behavioral: AnalyticsSourceCoverage
    login_history: AnalyticsSourceCoverage
    status_history: AnalyticsSourceCoverage
    reference: AnalyticsSourceCoverage

class AnalyticsMeta(BaseModel):
    start: datetime
    end: datetime
    previous_start: datetime | None
    previous_end: datetime | None
    observed_at: datetime
    coverage: AnalyticsCoverage
    data_quality: AnalyticsDataQuality

class AggregateCell(BaseModel):
    key: str
    count: int | None
    suppressed: bool = False
```

`AggregateCell` (or an equally explicit typed derivative) is mandatory for
cohorts and multidimensional breakdowns. Suppression is not encoded as zero or
as a magic string.

Coverage gates are source-specific: Umami-derived visitors/events use
`behavioral`; active-member trends and member cohorts use `login_history`;
approved stages and as-of qualified organizations use `status_history`;
users/orders/trades/commissions use `authoritative`; benchmark coverage uses
`reference`. Set irrelevant sources to `not_applicable`. A metric is `null` when
its required source cannot cover the requested interval; do not let a healthy
source mask another source's gap. Endpoint tests must include mixed states such
as available authoritative data with unavailable behavioral data, and available
login history with insufficient status history.

### 2.3 Behavioral property aggregates

Do not couple Verdaxis to Umami's PostgreSQL schema. Extend `UmamiAnalyticsService` through authenticated HTTP APIs only.

Before implementation, characterize the installed Umami 3.2.0 routes for:

```text
/api/websites/{websiteId}/event-data/events
/api/websites/{websiteId}/event-data/properties
/api/websites/{websiteId}/event-data/values
/api/websites/{websiteId}/event-data-pivot/*
```

Capture the accepted parameters and bounded response shapes in tests using an
`httpx.MockTransport`, then run a read-only staging contract smoke against the
installed Umami 3.2.0 container using its view-only credentials. The smoke must
exercise every route the implementation will call and record only schemas/counts,
not event payload values. MockTransport tests alone are insufficient. If property
aggregation cannot be obtained through the supported API, ship event totals only
for that panel and record the limitation; do not query the analytics database directly.

### 2.4 Login history

Current `User.last_login` cannot produce retention cohorts. Do not repurpose the
security audit log as a product-analytics fact table. Add a bounded daily table:

```python
class UserLoginDay(Base):
    __tablename__ = "user_login_days"
    id: UUID
    activity_date: date                 # UTC
    user_id: UUID                       # FK users.id, cascade delete
    organization_id: UUID | None        # snapshot at login
    role: UserRole                      # snapshot at login
    login_count: int
    first_login_at: datetime
    last_login_at: datetime

    __table_args__ = (
        UniqueConstraint("activity_date", "user_id"),
        Index("ix_user_login_days_date_role", "activity_date", "role"),
        Index("ix_user_login_days_org_date", "organization_id", "activity_date"),
    )
```

After successful credential/account validation, upsert one row per user per UTC
day in the same transaction as `User.last_login`. Increment `login_count` and
advance `last_login_at`; never store IP, user agent, token, or credential data.
Because this write shares the existing authentication transaction, a database
failure has the same behavior as the current `last_login` update rather than a
new best-effort side channel.

Retain 800 UTC calendar dates so a maximum 365-day range and equivalent previous
period remain available with buffer. Add an idempotent daily prune command and
timer that deletes rows with `activity_date < (current UTC date - 799 days)`;
this retains today plus the previous 799 dates. Document and monitor the timer.
Historical member retention sets `meta.coverage.login_history.coverage_start` equal to the first
`UserLoginDay`; do not fabricate earlier cohorts from `User.last_login`.

Approval is also currently mutable state, so add an append-only transition fact:

```python
class UserStatusTransition(Base):
    __tablename__ = "user_status_transitions"
    id: UUID
    user_id: UUID                       # FK users.id, cascade delete
    organization_id: UUID | None        # snapshot at transition
    role: UserRole                      # snapshot at transition
    from_status: UserStatus | None
    to_status: UserStatus
    effective_at: datetime              # UTC
    provenance: Literal["workflow", "migration_snapshot"]

    __table_args__ = (
        Index("ix_user_status_transitions_user_time", "user_id", "effective_at"),
        Index("ix_user_status_transitions_status_time", "to_status", "effective_at"),
    )
```

Write a transition atomically whenever an admin approval/rejection or other
status workflow changes `User.status`; a no-op write creates no transition.
Every post-migration user-creation path writes an initial `None -> initial_status`
transition in the same transaction as the `User` row. Ordinary registration
must therefore record `None -> PENDING`; privileged/system creation records its
actual explicitly assigned initial status and provenance. Never reconstruct the
initial interval from mutable `User.status`.
During migration, insert one `migration_snapshot` row at deployment time for
each existing Buyer/Supplier user. Never backdate those rows. `approved` in the
Activation journey means a transition to `APPROVED` in `[start,end)`.
`Qualified organizations` is an as-of-end state reconstructed from each user's
latest transition at or before `end`. For `end` before the first transition row,
return `null` with `insufficient_coverage`; do not infer historical approval from
the mutable current `User.status`. Previous-period deltas are likewise `null`
when either period boundary predates transition coverage.

### 2.5 Reliability instrumentation

Add bounded events to the existing typed adapter:

```typescript
frontend_error: {
  route_family: 'landing' | 'signup' | 'platform' | 'admin';
  category: 'render' | 'chunk' | 'network' | 'unknown';
}
backend_unavailable: { route_family: 'signup' | 'platform' | 'admin' };
navigation_performance: {
  destination: 'home' | 'map' | 'marketplace' | 'curve' | 'watchlist' |
    'analytics' | 'trades' | 'quotes' | 'compliance' | 'training' |
    'settings' | 'admin';
  view_mode: 'BUYER' | 'SUPPLIER';
  latency_bucket: 'lt250' | '250_500' | '500_1000' | '1000_2500' | 'gte2500';
}
```

Expose it through an explicit FastAPI dependency that declares each scalar with
`Query(...)` and constructs `ProductAnalyticsQuery`; do not expect FastAPI to
deserialize a Pydantic request body on a GET endpoint.

Attempt best-effort reporting for every observed error and backend-unavailable
event; analytics can be disabled, offline, blocked, or unloaded and therefore
cannot guarantee collection. Deduplicate identical error category + route-family
pairs for 60 seconds per browser session. Sample successful navigation
performance at a stable 10% per browser session. Never send stack traces, URLs
with query strings, request bodies, user IDs, order IDs, or free text.

Add all three event names to the backend `FRONTEND_EVENT_NAMES` and admin-report
allowlists in the same task. Events not accepted by both frontend and backend
registries must not appear in the UI contract.

### 2.6 Performance and storage budgets

- Each tab endpoint: p95 <= 500ms warm and <= 1500ms cold on staging for a 90-day unfiltered query.
- Seven-tab initial page load requests Overview only; no hidden-tab waterfall.
- At most eight SQL round trips per endpoint. No per-user, per-organization, per-product, or per-day query loops.
- Behavioral cache is a 32-entry bounded LRU with per-key single-flight locks. Keys include normalized `[start,end)`, comparison range, audience, activity source, product, delivery point, window, requested event/property filters, breakdown set, source/website ID, and schema-version constant. Success TTL <= 300s; failure TTL <= 30s.
- Authoritative responses may cache for <= 60s by normalized filter key, but user/approval mutations and order/trade writes must not be hidden longer than that.
- Add Alembic indexes for `user_login_days` above and, after `EXPLAIN (ANALYZE, BUFFERS)` confirms use, composite period/filter indexes for orders and trades. Candidate indexes are `(created_at, organization_id, side, status)` on orders and `(confirmed_at, status, buyer_id, seller_id)` plus `(paid_at, status)` on trades.
- The implementation must include a read-only staging EXPLAIN report for Overview and Marketplace 90-day queries. Sequential scans on tiny tables are acceptable; the report, not an assumption, decides whether optional indexes remain.
- Response body budget: <= 250KB uncompressed per tab at maximum range.

---

## 3. Execution Plan

### Task 1: Characterize Current Contracts And Freeze Metric Fixtures

**Files:**
- Create: `be/tests/unit/test_product_analytics_contract.py`
- Create: `be/tests/unit/fixtures/__init__.py`
- Create: `be/tests/unit/fixtures/product_analytics.py`
- Create: `be/scripts/smoke_umami_product_analytics.py`
- Modify: `be/docs/behavioral-analytics-contract.md`

**Steps:**

1. Write fixtures for one live buyer org, one live supplier org, one demo org, users in each lifecycle state, bids/asks, and trades in every status.
2. Encode expected inputs/outputs for every metric definition in section 1.5 as reusable fixture data; service assertions are added in Task 3, not committed red here.
3. Add passing MockTransport characterization tests for the existing Umami event totals contract.
4. Add a read-only staging smoke that authenticates with view-only credentials, probes every proposed event-property endpoint, validates bounded response shapes, redacts values from output, and exits nonzero for unsupported routes.
5. Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
venv/bin/pytest tests/unit/test_product_analytics_contract.py -q
venv/bin/python scripts/smoke_umami_product_analytics.py
```

Expected: both commands pass. If the live smoke proves a property route unsupported,
remove that breakdown from the API/UI plan before implementation rather than
committing a knowingly impossible contract.

6. Update the behavioral analytics contract with the verified Umami endpoints and explicitly document unsupported property queries.
7. Commit only green tests and the revised supported contract:

```bash
git add tests/unit/test_product_analytics_contract.py tests/unit/fixtures scripts/smoke_umami_product_analytics.py docs/behavioral-analytics-contract.md
git commit -m "test: define product analytics metric contract"
```

### Task 2: Add Backend Schemas And Query Parsing

**Files:**
- Create: `be/app/schemas/product_analytics.py`
- Test: `be/tests/unit/test_product_analytics_query.py`

**Steps:**

1. Write tests for UTC normalization, invalid ranges, 365-day maximum, previous-period bounds, enums, and optional marketplace filters.
2. Implement the enums, `ProductAnalyticsQuery`, `AnalyticsMeta`, common points/ranked-row schemas, and seven tab response models.
3. Keep response fields explicit; do not use `dict[str, Any]` for chart data.
4. Run the focused tests and `python -m compileall app`.
5. Commit:

```bash
git add app/schemas/product_analytics.py tests/unit/test_product_analytics_query.py
git commit -m "feat: define product analytics API schemas"
```

### Task 3: Build Authoritative Product Analytics Service

**Files:**
- Create: `be/app/services/product_analytics.py`
- Create: `be/scripts/explain_product_analytics.py`
- Create: `be/scripts/run_product_analytics_postgres_tests.sh`
- Test: `be/tests/unit/test_product_analytics_service.py`
- Create: `be/tests/postgres/conftest.py`
- Create: `be/tests/postgres/test_product_analytics_queries.py`
- Modify: `be/.github/workflows/backend-ci.yml`

**Steps:**

1. Reuse the existing async SQLite pattern in `tests/unit/test_product_usage_analytics.py`, creating the required `Organization`, `User`, `Product`, `DeliveryPoint`, `OrderBookOrder`, `Trade`, and `Commission` tables explicitly. Write failing tests from the Task 1 fixtures for current and previous periods.
2. Add a Product Analytics-specific recognized-market predicate requiring an approved Buyer/Supplier member and non-demo provenance. Do not reuse or change the legacy role-only helper in `admin_analytics.py`; legacy endpoint semantics remain untouched. Test approved, pending, rejected, admin-only, demo, and unknown organizations independently.
3. Implement aggregate query methods for Overview, Marketplace, and the DB-backed portions of Activation. Previous-period successful-login and member-retention fields remain `null` until Task 5 adds `UserLoginDay`; do not infer them from the mutable `User.last_login` snapshot.
4. Use grouped SQL queries, not per-row loops or N+1 relationship access.
5. Return dense UTC date series.
6. Verify query counts with a SQLAlchemy event listener; fail a tab aggregate test above eight statements.
7. Test small-cell suppression, canonical-value allowlisting, exact economic timestamp semantics, final-vs-contract quantity, commission payment semantics, live/demo/reference separation, and order execution rate bounds. Include fixtures proving that a paid trade with no paid `Commission` row contributes zero realized revenue; a paid `Commission` contributes only in the period containing its `payment_date`; and a paid commission with null `payment_date` is excluded while incrementing `missing_commission_payment_date_count`. Cover midnight and midday `start`/`end` boundaries for the date-to-midnight UTC projection.
8. Reuse the existing price-discovery/benchmark service for Reference coverage; do not reimplement benchmark classification inside analytics. Test the complete canonical seed matrix, missing observation timestamps, stale rows, unavailable rows, and the invariant that unavailable rows expose neither price nor observation timestamp.
9. Add a read-only EXPLAIN script for Overview and Marketplace 90-day SQL. It must start a read-only transaction, emit JSON plans with bound values redacted, and never mutate data.
10. Add a PostgreSQL 15/PostGIS 3.3 CI service matching the deployed `postgis/postgis:15-3.3` image and a `PRODUCT_ANALYTICS_TEST_DATABASE_URL` fixture. Refuse to run unless the database name ends `_analytics_test`; apply Alembic migrations to the disposable database, seed the same contract fixtures, run every aggregate, and drop the database after the suite. SQLite remains the fast unit harness, not the PostgreSQL correctness authority. Add `run_product_analytics_postgres_tests.sh`: it starts a uniquely named temporary `postgis/postgis:15-3.3` container on a Docker-assigned localhost port, creates `verdaxis_analytics_test`, waits for `pg_isready`, exports the async URL as `PRODUCT_ANALYTICS_TEST_DATABASE_URL`, runs the requested pytest paths, and removes the container through an `EXIT/INT/TERM` trap. The script refuses an externally supplied URL unless its parsed database name ends `_analytics_test`.
11. Add PostgreSQL assertions for UTC boundaries, `ON CONFLICT`, UUID/enums, final quantity, economic timestamps, commission dates, suppression, and every migration constraint/index.
12. Run:

```bash
venv/bin/pytest tests/unit/test_product_analytics_service.py tests/unit/test_product_usage_analytics.py -q
scripts/run_product_analytics_postgres_tests.sh \
  tests/postgres/test_product_analytics_queries.py
```

13. Commit:

```bash
git add app/services/product_analytics.py app/routers/admin_analytics.py scripts/explain_product_analytics.py scripts/run_product_analytics_postgres_tests.sh tests/unit/test_product_analytics_service.py tests/postgres .github/workflows/backend-ci.yml
git commit -m "feat: aggregate authoritative product analytics"
```

### Task 4: Extend Behavioral Analytics Safely

**Files:**
- Modify: `be/app/services/behavioral_analytics.py`
- Modify: `be/app/schemas/behavioral_analytics.py`
- Test: `be/tests/unit/test_behavioral_analytics_service.py`

**Steps:**

1. Add failing tests for date-bounded aggregates, previous-period comparison, event-property rankings, response-size limits, malformed payloads, timeout fallback, LRU eviction, cache isolation by query key, and single-flight behavior under concurrent identical requests.
2. Replace the fixed `{7,30,90}` cache dictionary with a bounded LRU keyed by normalized start/end and requested breakdowns; cap at 32 entries and preserve five-minute maximum TTL.
3. Add only the supported Umami HTTP property calls proven in Task 1.
4. Make partial property failure return totals plus `meta.coverage.behavioral.status=partial` and a typed diagnostic rather than failing the whole tab.
5. Keep authentication and response-size protections intact.
6. Run focused tests.
7. Commit:

```bash
git add app/services/behavioral_analytics.py app/schemas/behavioral_analytics.py tests/unit/test_behavioral_analytics_service.py
git commit -m "feat: support bounded product analytics breakdowns"
```

### Task 5: Record Login History And Add Reliability Events

**Files:**
- Create: `be/app/models/product_analytics.py`
- Create: `be/app/services/user_status_transition.py`
- Create: `be/alembic/versions/<revision>_add_product_analytics_facts.py`
- Create: `be/scripts/prune_product_analytics.py`
- Create: `be/deploy/systemd/verdaxis-product-analytics-prune.service`
- Create: `be/deploy/systemd/verdaxis-product-analytics-prune.timer`
- Modify: `be/app/routers/auth_simple.py`
- Modify: `be/app/routers/admin_analytics.py`
- Modify: `be/app/routers/kyc.py`
- Modify: `be/app/services/product_analytics.py`
- Modify: `be/app/services/behavioral_analytics.py`
- Modify: `fe/src/services/analytics.ts`
- Modify: `fe/src/services/api.ts`
- Modify: `fe/src/services/backendAvailability.ts`
- Modify: `fe/src/components/ErrorBoundary.tsx`
- Modify: `fe/src/App.tsx`
- Modify: `fe/src/context/AuthContext.tsx`
- Modify: `fe/src/utils/navigationPerformance.ts`
- Test: `be/tests/unit/test_auth.py`
- Test: `be/tests/unit/test_product_analytics_service.py`
- Test: `be/tests/postgres/test_product_analytics_login_concurrency.py`
- Test: `be/tests/postgres/test_user_status_transitions.py`
- Test: `fe/src/tests/analytics-adapter.test.ts`
- Test: `fe/src/tests/backend-availability.test.ts`
- Test: `fe/src/tests/navigation-performance.test.ts`

**Steps:**

1. Add failing backend tests that successful login upserts one `UserLoginDay`, a second same-day login increments it, the next UTC day creates a new row, admin rows are stored but excluded from member metrics, and failed login creates no row.
2. Add both models, migration, indexes, and the non-backdated status snapshot migration defined in section 2.4. Implement one atomic PostgreSQL `INSERT ... ON CONFLICT (activity_date,user_id) DO UPDATE` that increments `login_count`, keeps the earliest `first_login_at`, and advances `last_login_at`. Retry serialization/deadlock failures once using the repository's transaction boundary; do not retry invalid credentials or unique conflicts manually.
3. Add a PostgreSQL concurrent-login integration test that submits simultaneous successful logins for one user and asserts one daily row with the exact combined count and no authentication failure.
4. Route every user-creation and account-status mutation found by repository search through `user_status_transition.py`; ordinary signup writes `None -> PENDING`, while privileged/system creation writes its actual initial state. Update auth, admin rejection, and both KYC approval paths. Assert atomic initial and changed-state transitions, no row for no-ops, and rollback of both status and transition together on failure. Cover a pending interval before approval, rejection then reapproval, and invariant historical reruns after later transitions.
5. Add prune-script tests for the 800-date boundary and the exact systemd service/timer artifacts, then document/install and enable the staging timer during deployment. Status transitions are durable business history and are not pruned by this timer.
6. Extend `ProductAnalyticsService` and its SQLite fixture with `UserLoginDay` and `UserStatusTransition`, then implement active-member trends, DAU/WAU/MAU, member cohorts, approval journey stages, as-of qualified organizations, and member retention. Coverage starts at each fact table's first row and earlier cells/deltas are `null`.
7. Add typed reliability events and property validators to the frontend adapter and the same names to backend event/report allowlists.
8. Wire backend-unavailable attempts through `fetchApi`, `backendAvailability`, auth checks, and both root/public and authenticated error boundaries. Preserve the existing UI maintenance behavior.
9. Test analytics disabled, script not loaded, collector offline, external abort, timeout, duplicate errors inside the dedupe window, and normal event delivery.
10. Bucket navigation duration and apply stable 10% session sampling whose decision is stored once per browser session.
11. Run focused backend and frontend tests; the backend gate must include:

```bash
scripts/run_product_analytics_postgres_tests.sh \
  tests/postgres/test_product_analytics_login_concurrency.py \
  tests/postgres/test_user_status_transitions.py
```

Commit separately in each repository with matching intent.

### Task 6: Add Seven Admin Endpoints

**Files:**
- Modify: `be/app/routers/admin_analytics.py`
- Create: `be/scripts/benchmark_product_analytics.py`
- Test: `be/tests/unit/test_product_analytics_endpoints.py`

**Steps:**

1. Write admin-only, validation, rate-limit, degraded-behavioral, small-cell suppression, canonical allowlist, response-size, and response-contract tests for all seven endpoints.
2. Keep route functions thin: parse query, call authoritative service and behavioral service concurrently where independent, compose typed response.
3. Ensure authoritative data still returns when Umami is unavailable.
4. Assert the generated contract through `app.main.app.openapi()` as the existing suite does. There is no backend `openapi.json` or generation command; do not invent one. Update the frontend's checked-in `openapi.json` only if a repository search proves it is consumed or governed by an existing documented workflow.
5. Add a benchmark script that logs in with staging integration credentials, performs 30 sequential warm requests per tab plus one cold request after explicit cache reset in a controlled staging run, checks p95/response-size budgets, and prints no token or response data.
6. Run the endpoint tests plus existing admin analytics tests.
7. Commit:

```bash
git add app/routers/admin_analytics.py scripts/benchmark_product_analytics.py tests/unit/test_product_analytics_endpoints.py
git commit -m "feat: expose tabbed product analytics API"
```

### Task 7: Add Frontend Contracts And URL State

**Files:**
- Create: `fe/src/types/productAnalytics.ts`
- Create: `fe/src/hooks/useProductAnalyticsFilters.ts`
- Modify: `fe/src/services/api.ts`
- Test: `fe/src/tests/product-analytics-api.test.ts`
- Test: `fe/src/tests/product-analytics-filters.test.tsx`

**Steps:**

1. Define explicit TypeScript types matching every backend response.
2. Add one API method per tab with `AbortSignal` support. Refactor `fetchWithTimeout` to distinguish an external caller abort from its internal timeout: external abort rethrows a recognizable `AbortError`, timeout throws the existing user-facing timeout error, and event listeners/timers are always removed.
3. Test that an aborted stale tab request neither renders an error state nor overwrites the current tab's data; test a real timeout separately.
4. Implement URL parsing/serialization with canonical defaults.
5. Preserve unrelated query parameters.
6. Replace invalid values with defaults using navigation `replace`.
7. Run focused tests and typecheck.
8. Commit:

```bash
git add src/types/productAnalytics.ts src/hooks/useProductAnalyticsFilters.ts src/services/api.ts src/tests/product-analytics-*.ts*
git commit -m "feat: add product analytics client contracts"
```

### Task 8: Build The Workspace Shell

**Files:**
- Create: `fe/src/components/admin/product-analytics/ProductAnalyticsWorkspace.tsx`
- Create: `fe/src/components/admin/product-analytics/AnalyticsTabRail.tsx`
- Create: `fe/src/components/admin/product-analytics/AnalyticsFilterRail.tsx`
- Create: `fe/src/components/admin/product-analytics/AnalyticsStates.tsx`
- Modify: `fe/src/components/admin/AdminDashboard.tsx`
- Test: `fe/src/tests/product-analytics-workspace.test.tsx`

**Steps:**

1. Write tests for default tab, URL restoration, keyboard tab navigation, hidden irrelevant filters, stale-request cancellation, and independent loading/error states.
2. Build the accessible tab rail and sticky filter rail using existing Verdaxis tokens.
3. Lazy-load tab panels and fetch only the active tab.
4. Keep the current analytics body available behind an internal temporary fallback until all tabs are wired; remove the fallback in Task 13.
5. Run focused tests, typecheck, and a staging build.
6. Commit:

```bash
git add src/components/admin/product-analytics src/components/admin/AdminDashboard.tsx src/tests/product-analytics-workspace.test.tsx
git commit -m "feat: add product analytics workspace shell"
```

### Task 9: Build Overview And Acquisition

**Files:**
- Create: `fe/src/components/admin/product-analytics/OverviewTab.tsx`
- Create: `fe/src/components/admin/product-analytics/AcquisitionTab.tsx`
- Create: `fe/src/components/admin/product-analytics/LifecycleSpine.tsx`
- Create: `fe/src/components/admin/product-analytics/MetricStrip.tsx`
- Create: `fe/src/components/admin/product-analytics/TrendChart.tsx`
- Test: `fe/src/tests/product-analytics-overview.test.tsx`
- Test: `fe/src/tests/product-analytics-acquisition.test.tsx`

**Steps:**

1. Write tests for valid/null deltas, coverage labels, lifecycle click-through, sparse series, direct/unknown referrer handling, and CTA labels.
2. Implement the lifecycle spine without implying user-level identity matching.
3. Make series toggles real controls with stable chart dimensions.
4. Add text/table equivalents for charts.
5. Run tests, typecheck, and build.
6. Commit.

### Task 10: Build Activation And Engagement

**Files:**
- Create: `fe/src/components/admin/product-analytics/ActivationTab.tsx`
- Create: `fe/src/components/admin/product-analytics/EngagementTab.tsx`
- Create: `fe/src/components/admin/product-analytics/AggregateJourney.tsx`
- Create: `fe/src/components/admin/product-analytics/FeatureAdoptionTable.tsx`
- Test: `fe/src/tests/product-analytics-activation.test.tsx`
- Test: `fe/src/tests/product-analytics-engagement.test.tsx`

**Steps:**

1. Test role filters, coverage suppression, drop-off classifications, aggregate-ratio labels, and tutorial step rendering.
2. Build role comparison as grouped bars/tables, not pie charts.
3. Show explicit coverage messaging before login-history cohorts are trustworthy.
4. Commit after focused verification.

### Task 11: Build Marketplace

**Files:**
- Create: `fe/src/components/admin/product-analytics/MarketplaceTab.tsx`
- Create: `fe/src/components/admin/product-analytics/MarketActivityMatrix.tsx`
- Create: `fe/src/components/admin/product-analytics/MarketBalanceChart.tsx`
- Test: `fe/src/tests/product-analytics-marketplace.test.tsx`

**Steps:**

1. Test default Live mode, demo exclusion, canonical catalog filters, bid/ask symmetry, sparse matrices, and invalid slice filters.
2. Reuse catalog names and availability labels from existing canonical sources; do not hardcode product/port/window lists.
3. Use a compact matrix familiar to market operators: rows are products, columns are ports, cell content is order count with unique-organization count in secondary text.
4. Add a table fallback and keyboard focus for every matrix cell.
5. Commit after verification.

### Task 12: Build Retention And Reliability

**Files:**
- Create: `fe/src/components/admin/product-analytics/RetentionTab.tsx`
- Create: `fe/src/components/admin/product-analytics/ReliabilityTab.tsx`
- Create: `fe/src/components/admin/product-analytics/CohortGrid.tsx`
- Create: `fe/src/components/admin/product-analytics/ReliabilityStatusList.tsx`
- Test: `fe/src/tests/product-analytics-retention.test.tsx`
- Test: `fe/src/tests/product-analytics-reliability.test.tsx`

**Steps:**

1. Test cohort coverage start, current/previous-period logic, zero-denominator cells, no-drilldown aggregate cells, partial behavioral failures, and freshness labels.
2. Use a conventional triangular cohort grid with explicit week labels and a count/percentage toggle.
3. Reliability uses restrained status rows and latency distributions, not decorative gauges.
4. Commit after focused verification.

### Task 13: Internationalize, Remove The Legacy Section, And Update Docs

**Files:**
- Modify: `fe/src/locales/en/admin.json`
- Modify: `fe/src/locales/zh/admin.json`
- Delete: `fe/src/components/admin/ProductUsageSection.tsx`
- Modify: `fe/src/components/admin/AdminDashboard.tsx` to remove the legacy summary cards, charts, audit table, commission panel, helpers, and eager data loading now owned by tab panels
- Modify/Delete: legacy Product Usage tests as appropriate
- Modify: `fe/docs/behavioral-analytics.md`
- Modify: `fe/ARCHITECTURE.md`
- Modify: `be/docs/behavioral-analytics-contract.md`
- Modify: `be/README.md`
- Modify: `be/ARCHITECTURE.md`

**Steps:**

1. Add every user-visible label in English and Chinese; no raw event keys may render.
2. Run `npm run i18n:check`.
3. Remove the entire legacy Analytics body only after all seven tabs pass focused tests. The Users tab and its moderation behavior remain unchanged.
4. Update architecture, backend README endpoint inventory, and analytics docs with endpoint ownership, privacy boundaries, coverage semantics, and the login-history limitation.
5. Run `refresh-codesight` in each repository if the new module structure makes generated maps stale.
6. Commit documentation, locale, and cleanup together.

### Task 14: Full Verification And Staging Deployment

**Files:**
- Create: `fe/scripts/dogfood-product-analytics.mjs`
- Create: `fe/docs/product-analytics-runbook.md`

**Prerequisites and secret injection:**

- Umami smoke runs locally on the VPS against `http://127.0.0.1:8700` and loads `ANALYTICS_ENABLED`, `UMAMI_BASE_URL`, `UMAMI_WEBSITE_ID`, `UMAMI_API_USERNAME`, and `UMAMI_API_PASSWORD` from `/home/verdaxis-prod/verdaxis/staging/be/.env.analytics`. The script refuses non-loopback Umami URLs unless `--allow-remote-readonly` is explicitly passed.
- API benchmark uses `itest-admin@staging.verdaxis.exchange` and reads `ITEST_PASSWORD` from `/home/verdaxis-prod/verdaxis/.staging-itest-password`; it never prints credentials/tokens.
- PostgreSQL correctness tests run through `scripts/run_product_analytics_postgres_tests.sh`, which creates an isolated local `postgis/postgis:15-3.3` container and exports the disposable URL. CI uses the same image and fixture path. The fixture refuses database names not ending `_analytics_test`.
- Browser dogfood uses the same staging integration admin, stores screenshots under `/tmp/verdaxis-product-analytics-dogfood/`, and must not modify marketplace data.

**Backend commands:**

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
venv/bin/pytest tests/unit/test_product_analytics_contract.py \
  tests/unit/test_product_analytics_query.py \
  tests/unit/test_product_analytics_service.py \
  tests/unit/test_product_analytics_endpoints.py \
  tests/unit/test_behavioral_analytics_service.py \
  tests/unit/test_product_usage_analytics.py -q
scripts/run_product_analytics_postgres_tests.sh \
  tests/postgres/test_product_analytics_queries.py \
  tests/postgres/test_product_analytics_login_concurrency.py \
  tests/postgres/test_user_status_transitions.py
venv/bin/python -m compileall app
sudo -u verdaxis-prod -H bash -lc 'cd /home/verdaxis-prod/verdaxis/staging/be && set -a && source .env.analytics && set +a && venv/bin/python scripts/smoke_umami_product_analytics.py'
venv/bin/python scripts/explain_product_analytics.py --days 90 --output /tmp/product-analytics-explain.json
ITEST_PASSWORD="$(sudo cat /home/verdaxis-prod/verdaxis/.staging-itest-password)" \
  venv/bin/python scripts/benchmark_product_analytics.py --base-url https://api-staging.verdaxis.exchange --email itest-admin@staging.verdaxis.exchange
```

Then run the repository's complete backend suite. If existing integration-harness failures remain, prove them against the pre-feature baseline and document them; do not misreport the suite as green.

**Frontend commands:**

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm test -- --run
npm run typecheck
npm run i18n:check
npm run build:staging
npm run build:check
ITEST_PASSWORD="$(sudo cat /home/verdaxis-prod/verdaxis/.staging-itest-password)" \
  node scripts/dogfood-product-analytics.mjs --base-url https://staging.verdaxis.exchange --email itest-admin@staging.verdaxis.exchange
```

The service is a `Type=oneshot` unit with `User=verdaxis-prod`,
`Group=verdaxis-prod`, `WorkingDirectory=/home/verdaxis-prod/verdaxis/staging/be`,
`EnvironmentFile=/home/verdaxis-prod/verdaxis/staging/be/.env`, and
`ExecStart=/home/verdaxis-prod/verdaxis/staging/be/venv/bin/python scripts/prune_product_analytics.py`.
Use `Nice=10`, `IOSchedulingClass=idle`, `NoNewPrivileges=true`,
`PrivateTmp=true`, and `TimeoutStartSec=300`; do not use an automatic restart for
the oneshot. The timer runs daily at `03:20` Singapore time with
`Persistent=true` and `RandomizedDelaySec=15m`. A nonzero service result remains
failed for the existing monitor to alert on; the runbook includes
`systemctl status`, `journalctl -u`, manual rerun, and row-age verification.

Install the retention timer on staging only:

```bash
sudo install -m 0644 /home/verdaxis-prod/verdaxis/staging/be/deploy/systemd/verdaxis-product-analytics-prune.service /etc/systemd/system/
sudo install -m 0644 /home/verdaxis-prod/verdaxis/staging/be/deploy/systemd/verdaxis-product-analytics-prune.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now verdaxis-product-analytics-prune.timer
sudo systemctl start verdaxis-product-analytics-prune.service
sudo systemctl --no-pager --full status verdaxis-product-analytics-prune.service
```

**Browser dogfood matrix:**

| Viewport | Required checks |
|---|---|
| 1440x900 | all tabs, filters, compare, tooltips, tables, no overlap |
| 1280x720 | sticky rail, tab overflow, chart heights, no horizontal document overflow |
| supported minimum desktop | active tab remains visible, filters wrap without covering content |

For each tab verify:

1. Direct URL restore.
2. Keyboard tab navigation.
3. 7D/30D/90D/custom range.
4. Previous-period comparison.
5. Ready, sparse, behavioral-unavailable, and total-error states.
6. English and Chinese.
7. No raw IDs, event keys, or PII in visible text or network responses.
8. Live/demo separation on Marketplace.
9. Browser console has no new errors or chart dimension warnings.

Deploy staging only, then verify:

```bash
curl -fsS https://api-staging.verdaxis.exchange/health
curl -fsSI https://staging.verdaxis.exchange/app/admin
sudo systemctl start verdaxis-monitor.service
```

Do not promote to production without explicit approval after visual review.

---

## 4. Acceptance Criteria

The feature is complete only when:

- `/app/admin` defaults to Overview and all seven tabs are URL-addressable.
- The Overview answers product health in under ten seconds without scrolling through legacy commercial charts.
- Every headline metric has a documented backend definition and previous-period behavior.
- Acquisition, Activation, Engagement, Marketplace, Retention, and Reliability each contain substantive, non-duplicative analysis.
- Marketplace defaults to live data and never silently mixes demo activity.
- Marketplace `ALL` returns distinct live, demo, reference, and unknown sections; no aggregate, chart, or matrix adds those sources together.
- Re-running a closed historical period after a later fill produces the same execution rate, and visibly marks an incomplete/right-censored cohort when applicable.
- Every authoritative aggregate passes against migrated PostgreSQL 15/PostGIS 3.3 fixtures matching deployment, including the concurrent same-day login upsert; SQLite alone is not accepted as proof.
- Behavioral analytics failure degrades locally while authoritative metrics remain visible.
- Retention does not fabricate history before successful-login auditing begins.
- Anonymous visitors are never joined to authenticated users.
- English and Chinese are complete.
- The live staging build passes the browser matrix with no clipping, overlap, or horizontal page overflow.
- Warm/cold endpoint latency, SQL round trips, response size, and read-only EXPLAIN output satisfy the budgets in section 2.6 or the rollout stops with the measured exception documented.
- Production remains unchanged until approved.

## 5. Review Decisions For The Implementer

- Keep the label `Overview`: the user explicitly approved it as the compact name for the Executive Product Health default. It is the entry point, not a reduction of the other six tabs' importance.
- Treat `Reference` as benchmark and price-discovery **coverage**, never as user activity. It belongs in Marketplace because admins need to compare market coverage, but it must not inflate orders, participants, execution, liquidity, GMV, or revenue.
- Prefer server-defined metric contracts over frontend arithmetic. The browser renders typed aggregates and states; it does not recreate commercial definitions.
- Preserve the current `Users` admin tab and moderation workflows. This plan replaces only the existing Analytics body.

## 6. Explicit Non-Goals

- No session replay, heatmaps, fingerprinting, or user-level Umami identity.
- No arbitrary SQL/report builder.
- No custom drag-and-drop dashboard in this phase.
- No organization or counterparty leaderboard.
- No automated product decisions based on small pilot samples.
- No direct dependency on Umami's database schema.
- No production analytics enablement in this plan.
