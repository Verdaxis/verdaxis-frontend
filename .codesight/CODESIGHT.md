# verdaxis-exchange — AI Context Map

> **Stack:** raw-http | none | react | typescript

> 158 routes | 206 models | 129 components | 33 lib files | 7 env vars | 3 middleware | 4% test coverage
> **Token savings:** this file is ~24,900 tokens. Without it, AI exploration would cost ~223,800 tokens. **Saves ~198,900 tokens per conversation.**
> **Last scanned:** 2026-07-22 17:44 — re-run after significant changes

---

# Routes

## CRUD Resources

- **`/api/inventory`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Inventory
- **`/api/orderbook`** GET | POST | GET/:id | PUT/:id | DELETE/:id → Orderbook
- **`/api/alerts`** GET | POST | GET/:id | DELETE/:id → Alert
- **`/api/admin/subscriptions`** GET | GET/:id | PUT/:id → Subscription
- **`/api/watchlists`** GET | POST | GET/:id | DELETE/:id → Watchlist
- **`/api/rfq`** GET | POST | GET/:id → Rfq
- **`/api/negotiations`** GET | POST | GET/:id → Negotiation

## Other Routes

- `POST` `/api/auth/login` [authentication, auth]
- `POST` `/api/auth/refresh` [authentication, auth]
- `POST` `/api/auth/logout` [authentication, auth]
- `GET` `/api/auth/stream-token` [authentication, auth]
- `POST` `/api/auth/register` → in: UserCreate, out: RegistrationResponse [authentication, auth]
- `POST` `/api/auth/register-with-org` → in: RegisterWithOrgRequest, out: UserResponse [authentication, auth]
- `GET` `/api/auth/verify-email` [authentication, auth]
- `POST` `/api/auth/resend-verification-email` → in: ResendVerificationRequest [authentication, auth]
- `GET` `/api/auth/me` → out: UserResponse [authentication, auth]
- `PUT` `/api/auth/me` → in: UserUpdate, out: UserResponse [authentication, auth]
- `PUT` `/api/auth/me/password` → in: PasswordChangeRequest [authentication, auth]
- `POST` `/api/auth/forgot-password` → in: ForgotPasswordRequest [authentication, auth]
- `POST` `/api/auth/reset-password` → in: ResetPasswordRequest [authentication, auth]
- `PUT` `/api/auth/approve/:user_id` params(user_id) → out: UserResponse [authentication, auth]
- `PUT` `/api/auth/organization/:organization_id/approve` params(organization_id) [authentication, auth]
- `PUT` `/api/auth/organization/:organization_id/reject` params(organization_id) → in: AdminDecisionBody [authentication, auth]
- `PUT` `/api/auth/reject/:user_id` params(user_id) → in: AdminDecisionBody [authentication, auth]
- `GET` `/api/auth/admin/review-queue` [authentication, auth]
- `GET` `/api/auth/admin/review-queue/:user_id` params(user_id) [authentication, auth]
- `GET` `/api/auth/organization-joins` [authentication, auth]
- `PUT` `/api/auth/organization-joins/:join_request_id/approve` params(join_request_id) → in: JoinReviewBody [authentication, auth]
- `PUT` `/api/auth/organization-joins/:join_request_id/reject` params(join_request_id) → in: JoinReviewBody [authentication, auth]
- `POST` `/api/auth/survey` → in: SurveySubmission [authentication, auth]
- `GET` `/api/ports` → out: PortResponse[]
- `GET` `/api/ports/:port_id` params(port_id) → out: PortResponse
- `GET` `/api/vessels` → out: VesselResponse[]
- `GET` `/api/vessels/:vessel_id` params(vessel_id) → out: VesselResponse
- `POST` `/api/inventory/:item_id/publish` params(item_id)
- `GET` `/api/listings`
- `GET` `/api/listings/my`
- `POST` `/api/ai/chat` → in: AIChatRequest
- `GET` `/api/orders/admin/commissions` → out: CommissionResponse[] [orders]
- `GET` `/api/orders/admin/commissions/summary` → out: CommissionSummary [orders]
- `PUT` `/api/orders/admin/commissions/:commission_id` params(commission_id) → in: CommissionUpdate, out: CommissionResponse [orders]
- `GET` `/api/notifications` → out: NotificationResponse[] [notifications]
- `GET` `/api/notifications/unread-count` [notifications]
- `PATCH` `/api/notifications/:notification_id/read` params(notification_id) [notifications]
- `PATCH` `/api/notifications/read-all` [notifications]
- `GET` `/api/users/me/preferences` [preferences]
- `PUT` `/api/users/me/preferences/:namespace` params(namespace) [preferences]
- `GET` `/api/orderbook/bids` → out: PaginatedResponse_OrderResponse_ [orderbook]
- `GET` `/api/orderbook/asks` → out: PaginatedResponse_OrderResponse_ [orderbook]
- `GET` `/api/orderbook/with-ci` → out: OrderResponseWithCI[] [orderbook]
- `GET` `/api/orderbook/my` → out: OrderMyResponse[] [orderbook]
- `GET` `/api/orderbook/my/latest-ask-template` [orderbook]
- `GET` `/api/orderbook/aggregated` → out: AggregatedOrderbookResponse[] [orderbook]
- `GET` `/api/orderbook/products` → out: array [orderbook]
- `GET` `/api/orderbook/regions` → out: array [orderbook]
- `GET` `/api/orderbook/fuel-types` → out: array [orderbook]
- `GET` `/api/admin/market-support/capabilities` → out: MarketSupportCapability[] [admin-market-support]
- `POST` `/api/admin/market-support/capability-assignments` → in: CapabilityAssignmentCreate, out: CapabilityAssignmentResponse [admin-market-support]
- `POST` `/api/admin/market-support/capability-assignments/:assignment_id/revoke` params(assignment_id) → in: CapabilityAssignmentRevoke, out: CapabilityAssignmentResponse [admin-market-support]
- `GET` `/api/admin/market-support/organizations` → out: PaginatedResponse_MarketSupportOrganization_ [admin-market-support]
- `GET` `/api/admin/market-support/organizations/:organization_id/authorizations` params(organization_id) → out: PaginatedResponse_AuthorizationResponse_ [admin-market-support, auth]
- `POST` `/api/admin/market-support/organizations/:organization_id/authorizations` params(organization_id) → in: AuthorizationCreate, out: AuthorizationResponse [admin-market-support, auth]
- `GET` `/api/admin/market-support/organizations/:organization_id/listings` params(organization_id) → out: PaginatedResponse_AssistedListingResponse_ [admin-market-support]
- `POST` `/api/admin/market-support/organizations/:organization_id/listings` params(organization_id) → in: AssistedListingCreate, out: AssistedListingResponse [admin-market-support]
- `POST` `/api/admin/market-support/organizations/:organization_id/listings/:order_id/cancel` params(organization_id, order_id) → in: AssistedListingCancel, out: AssistedListingResponse [admin-market-support]
- `POST` `/api/admin/market-support/organizations/:organization_id/authorizations/:authorization_id/revoke` params(organization_id, authorization_id) → in: AuthorizationRevoke, out: AuthorizationResponse [admin-market-support, auth]
- `GET` `/api/admin/market-support/organizations/:organization_id/context` params(organization_id) → out: MarketSupportContext [admin-market-support]
- `POST` `/api/trades/` → in: TradeCreate, out: TradeResponse [trades]
- `GET` `/api/trades/my` → out: PaginatedResponse_TradeResponse_ [trades]
- `PUT` `/api/trades/:trade_id/confirm` params(trade_id) → out: TradeResponse [trades]
- `PUT` `/api/trades/:trade_id/decline` params(trade_id) → out: TradeResponse [trades]
- `PUT` `/api/trades/:trade_id/deliver` params(trade_id) → in: TradeDeliverPayload, out: TradeResponse [trades]
- `POST` `/api/trades/:trade_id/pay` params(trade_id) → out: TradeResponse [trades]
- `GET` `/api/prices` → out: PriceDiscoveryResponse [price-discovery]
- `GET` `/api/prices/reference` → out: ReferencePriceResponse [price-discovery]
- `GET` `/api/prices/reference/export` [price-discovery]
- `GET` `/api/matchmaking/suggestions` [matchmaking]
- `PATCH` `/api/matchmaking/suggestions/:order_id/dismiss` params(order_id) [matchmaking]
- `GET` `/api/producers` → out: ProducerProjectResponse[] [producers]
- `GET` `/api/availability` → out: PortFuelAvailability[] [availability]
- `GET` `/api/demand` → out: DemandSignal[] [demand]
- `GET` `/api/admin/audit-logs` → out: AuditLogResponse[]
- `GET` `/api/stream/prices` [real-time]
- `GET` `/api/stream/orderbook` [real-time]
- `GET` `/api/stream/trades` [real-time]
- `GET` `/api/compliance/vessels/:vessel_id/score` params(vessel_id) → out: ComplianceScoreResponse [compliance]
- `GET` `/api/compliance/fleet` → out: FleetComplianceSummary [compliance]
- `POST` `/api/compliance/scenario` → in: ScenarioInput, out: ComplianceScoreResponse [compliance]
- `POST` `/api/compliance/pricing-overlay` → in: PricingOverlayRequest, out: PricingOverlayResponse [compliance]
- `GET` `/api/compliance/fuels` → out: object [compliance]
- `GET` `/api/admin/analytics/product-usage` → out: ProductUsageResponse [admin-analytics]
- `GET` `/api/admin/analytics/overview` → out: app__routers__admin_analytics__OverviewResponse [admin-analytics]
- `GET` `/api/admin/analytics/daily` → out: DailyStat[] [admin-analytics]
- `GET` `/api/admin/analytics/users` → out: AdminUsersResponse [admin-analytics]
- `PUT` `/api/admin/analytics/users/:user_id/reject` params(user_id) → out: AdminUserEntry [admin-analytics]
- `GET` `/api/admin/analytics/product-analytics/overview` → out: app__schemas__product_analytics__OverviewResponse [admin-analytics]
- `GET` `/api/admin/analytics/product-analytics/acquisition` → out: AcquisitionResponse [admin-analytics]
- `GET` `/api/admin/analytics/product-analytics/activation` → out: ActivationResponse [admin-analytics]
- `GET` `/api/admin/analytics/product-analytics/engagement` → out: EngagementResponse [admin-analytics]
- `GET` `/api/admin/analytics/product-analytics/marketplace` → out: MarketplaceResponse [admin-analytics]
- `GET` `/api/admin/analytics/product-analytics/retention` → out: RetentionResponse [admin-analytics]
- `GET` `/api/admin/analytics/product-analytics/reliability` → out: ReliabilityResponse [admin-analytics]
- `POST` `/api/kyc/submit` [kyc]
- `GET` `/api/kyc/status` [kyc]
- `PUT` `/api/kyc/admin/:user_id/approve` params(user_id) → in: AdminApproveBody [kyc]
- `PUT` `/api/kyc/admin/:user_id/reject` params(user_id) → in: AdminRejectBody [kyc]
- `GET` `/api/catalog/products` → out: ProductResponse[] [catalog]
- `GET` `/api/catalog/delivery-points` → out: DeliveryPointResponse[] [catalog]
- `GET` `/api/curves/forward/table` → out: ForwardCurveTableResponse [forward-curve]
- `GET` `/api/curves/forward/slice` → out: ForwardCurveSliceResponse [forward-curve]
- `GET` `/api/curves/forward/board` → out: ForwardCurveBoardResponse [forward-curve]
- `GET` `/api/curves/forward` → out: ForwardCurveResponse [forward-curve]
- `GET` `/api/curves/forward/export` [forward-curve]
- `GET` `/api/stream/activity` [real-time]
- `GET` `/api/subscriptions/me` → out: SubscriptionResponse [subscriptions]
- `GET` `/api/referrals/my-code` → out: ReferralCodeResponse [referrals]
- `GET` `/api/referrals/my-referrals` → out: ReferralStatsResponse [referrals]
- `GET` `/api/referrals/leaderboard` → out: LeaderboardEntry[] [referrals]
- `POST` `/api/referrals/invite` → in: ReferralInviteRequest [referrals]
- `GET` `/api/referrals/resolve/:code` params(code) → out: ResolveCodeResponse [referrals]
- `GET` `/api/trade-tape` → out: TradeTapeResponse [trade-tape]
- `GET` `/api/watchlists/me` → out: WatchlistSummaryResponse [watchlists]
- `POST` `/api/watchlists/:watchlist_id/targets` params(watchlist_id) → out: WatchlistTargetResponse [watchlists]
- `DELETE` `/api/watchlists/:watchlist_id/targets/:target_id` params(watchlist_id, target_id) [watchlists]
- `GET` `/api/watchlists/:watchlist_id/events` params(watchlist_id) → out: WatchlistEventsPageResponse [watchlists]
- `PATCH` `/api/watchlists/:watchlist_id/events/:event_id` params(watchlist_id, event_id) → out: WatchlistEventResponse [watchlists]
- `POST` `/api/watchlists/:watchlist_id/entries` params(watchlist_id) → in: WatchlistEntryAddRequest, out: WatchlistEntryResponse [watchlists]
- `DELETE` `/api/watchlists/:watchlist_id/entries/:entry_id` params(watchlist_id, entry_id) [watchlists]
- `POST` `/api/rfq/:rfq_id/quote` params(rfq_id) → in: RFQQuoteRequest, out: RFQQuoteResponse [rfq]
- `POST` `/api/rfq/:rfq_id/accept/:quote_id` params(rfq_id, quote_id) → out: RFQQuoteResponse [rfq]
- `POST` `/api/rfq/:rfq_id/cancel` params(rfq_id) [rfq]
- `POST` `/api/negotiations/:negotiation_id/counter` params(negotiation_id) → in: NegotiationCounterRequest, out: NegotiationResponse [negotiations]
- `POST` `/api/negotiations/:negotiation_id/accept` params(negotiation_id) → out: NegotiationResponse [negotiations]
- `POST` `/api/negotiations/:negotiation_id/decline` params(negotiation_id) → out: NegotiationResponse [negotiations]
- `GET` `/api/news` [news]
- `GET` `/api/fleet-intelligence` → out: FleetDemandResponse [fleet-intelligence]
- `GET` `/api/benchmarks` → out: BenchmarkQuoteResponse [benchmarks]
- `GET` `/` ✓
- `GET` `/health`
- `GET` `/health/live`
- `GET` `/health/ready`

---

# Schema

### AIChatRequest
- message: string (required)
- history: object[]

### AcquisitionKpis
- visitors: MetricValue (required)
- visits: MetricValue (required)
- pageviews: MetricValue (required)
- average_session_duration_seconds: DecimalMetricValue (required)
- cta_clicks: MetricValue (required)

### AcquisitionResponse
- meta: AnalyticsMeta (required)
- kpis: AcquisitionKpis (required)
- visitors_trend: SeriesPoint[]
- previous_visitors_trend: SeriesPoint[]
- visits_trend: SeriesPoint[]
- referrers: RankedRow[]
- entry_pages: RankedRow[]
- cta_matrix: CtaMatrixRow[]
- languages: RankedRow[]
- calculator: CalculatorFunnel (required)

### ActivationResponse
- meta: AnalyticsMeta (required)
- journey: JourneyStage[]
- time_to_first_login: DurationDistribution (required)
- time_to_first_live_order: DurationDistribution (required)
- drop_off: AggregateCell[]
- ratios: LabeledRatio[]

### ActivityTrend
- visitors: SeriesPoint[]
- active_members: SeriesPoint[]
- orders: SeriesPoint[]
- confirmed_trades: SeriesPoint[]

### AdminApproveBody
- external_evidence_reference: string (required)
- review_note: string (required)

### AdminDecisionBody
- reason: unknown

### AdminRejectBody
- reason: string (required)

### AdminUserEntry
- id: string(uuid) (required, uuid)
- email: string (required)
- first_name: unknown (required)
- last_name: unknown (required)
- role: string (required)
- status: string (required)
- created_at: string(date-time) (required)
- org_name: unknown (required)
- org_type: unknown (required)

### AdminUsersResponse
- items: AdminUserEntry[] (required)
- total: integer (required)

### AggregateCell
- key: string (required)
- count: unknown
- suppressed: boolean

### AggregatedOrderbookResponse
- product_id: string(uuid) (required, uuid)
- product_name: string
- market_product: string (required)
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window: string
- region: string
- side: OrderSide (required)
- min_price: string (required)
- max_price: string (required)
- total_quantity: string (required)
- order_count: integer (required)
- product_total_order_count: integer (required)
- evidence_class: string (required)
- source_kind: MarketSourceKind (required)
- scope: MarketScope
- demo_status: MarketDemoStatus (required)
- observed_at: string(date-time) (required)

### AlertCreate
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown
- direction: string (required)
- threshold_usd: unknown (required)

### AlertResponse
- id: string(uuid) (required, uuid)
- org_id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
- product_name: unknown
- market_product: unknown
- delivery_point_id: unknown (required)
- direction: string (required)
- threshold_usd: string (required)
- is_active: boolean (required)
- triggered_at: unknown (required)
- created_at: string(date-time) (required)

### AnalyticsCoverage
- authoritative: AnalyticsSourceCoverage (required)
- behavioral: AnalyticsSourceCoverage (required)
- login_history: AnalyticsSourceCoverage (required)
- status_history: AnalyticsSourceCoverage (required)
- reference: AnalyticsSourceCoverage (required)

### AnalyticsDataQuality
- legacy_timestamp_fallback_count: integer
- missing_paid_at_count: integer
- missing_commission_payment_date_count: integer
- suppressed_cell_count: integer
- cohort_complete: boolean

### AnalyticsMeta
- start: string(date-time) (required)
- end: string(date-time) (required)
- previous_start: unknown (required)
- previous_end: unknown (required)
- observed_at: string(date-time) (required)
- coverage: AnalyticsCoverage (required)
- data_quality: AnalyticsDataQuality (required)

### AnalyticsSourceCoverage
- coverage_start: unknown
- coverage_end: unknown
- observed_at: unknown
- status: AnalyticsSourceStatus (required)
- diagnostic: unknown

### AssistedListingCancel
- reason: string (required)

### AssistedListingCreate
- authorization_id: string(uuid) (required, uuid)
- acknowledge_executable_standing_order: boolean (required)

### AssistedListingResponse
- order: OrderResponse (required)
- accountable_user_id: string(uuid) (required, uuid)
- created_by_actor_user_id: string(uuid) (required, uuid)
- creation_method: OrderCreationMethod (required)
- support_authorization_id: string(uuid) (required, uuid)
- version: integer (required)
- etag: string (required)

### AuditActivityRow
- occurred_at: string(date-time) (required)
- action: string (required)
- resource_type: unknown
- actor_role: unknown

### AuditLogResponse
- id: string(uuid) (required, uuid)
- user_id: unknown (required)
- action: string (required)
- resource_type: string (required)
- resource_id: unknown (required)
- changes: unknown (required)
- ip_address: unknown (required)
- request_id: unknown (required)
- timestamp: string(date-time) (required)

### AuthoritativeUsage
- registrations: integer (required)
- users_logging_in: integer (required)
- order_placing_organizations: integer (required)

### AuthorizationCreate
- accountable_user_id: string(uuid) (required, uuid)
- order: OrderCreate-Input (required)
- authorization_expires_at: string(date-time) (required)
- evidence_reference: string (required)
- evidence_sha256: string (required)
- commercial_consent_version: string (required)
- commercial_consent_reference: string (required)
- support_case_reference: unknown

### AuthorizationResponse
- id: string(uuid) (required, uuid)
- organization_id: string(uuid) (required, uuid)
- accountable_user_id: string(uuid) (required, uuid)
- status: MarketSupportAuthorizationStatus (required)
- order: OrderCreate-Output (required)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- availability_window: string (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- authorization_expires_at: string(date-time) (required)
- order_expires_at: string(date-time) (required)
- terms_digest: string (required)
- evidence_reference: string (required)
- evidence_sha256: string (required)
- commercial_consent_version: string (required)
- commercial_consent_reference: string (required)
- support_case_reference: unknown (required)
- created_by_actor_user_id: string(uuid) (required, uuid)
- created_at: string(date-time) (required)
- consumed_at: unknown (required)
- revoked_at: unknown (required)
- revoked_by_actor_user_id: unknown (required)
- revocation_reason: unknown (required)

### AuthorizationRevoke
- reason: string (required)

### BackendUnavailablePanel
- total: MetricValue (required)
- by_route_family: AggregateCell[]

### BehavioralUsage
- visitors: integer (required)
- visits: integer (required)
- pageviews: integer (required)
- total_time_seconds: integer (required)
- average_session_duration_seconds: number (required)
- event_totals: object (required)
- event_series: DailyEventPoint[] (required)
- daily_visitors: DailyVisitorPoint[] (required)
- top_entries: MetricEntry[] (required)
- top_referrers: MetricEntry[] (required)

### BenchmarkQuote
- market_product: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- availability_window: string (required)
- benchmark_price_per_mt_usd: string (required)
- source: string (required)
- generated_at: string(date-time) (required)
- observed_at: unknown

### BenchmarkQuoteResponse
- items: BenchmarkQuote[] (required)
- generated_at: string(date-time) (required)

### Body_login_api_auth_login_post
- grant_type: unknown
- username: string (required)
- password: string(password) (required)
- scope: string
- client_id: unknown
- client_secret: undefined(password)

### Body_submit_kyc_api_kyc_submit_post
- passport: string (required)
- company_doc: string (required)
- declared_company_name: unknown
- registration_number: unknown

### CIAdjustedPrice
- base_price_per_mt: string (required)
- carbon_intensity_gco2_mj: string (required)
- fueleu_ghg_intensity: string (required)
- compliance_cost_per_mt: string (required)
- effective_price_per_mt: string (required)
- ghg_reduction_pct: string (required)

### CIIResponse
- rating: string (required)
- score: integer (required)

### CalculatorFunnel
- starts: MetricValue (required)
- completions: MetricValue (required)

### CapabilityAssignmentCreate
- user_id: string(uuid) (required, uuid)
- capability: MarketSupportCapability (required)
- reason: string (required)
- expires_at: unknown

### CapabilityAssignmentResponse
- id: string(uuid) (required, uuid)
- user_id: string(uuid) (required, uuid)
- capability: MarketSupportCapability (required)
- reason: string (required)
- granted_by_user_id: string(uuid) (required, uuid)
- granted_at: string(date-time) (required)
- expires_at: unknown (required)
- revoked_at: unknown (required)
- revoked_by_user_id: unknown (required)
- revocation_reason: unknown (required)

### CapabilityAssignmentRevoke
- reason: string (required)

### CohortCell
- offset: integer (required)
- cell: AggregateCell (required)
- pct: unknown

### CohortRow
- cohort_start: string(date) (required)
- size: AggregateCell (required)
- cells: CohortCell[]

### CollectorState
- status: AnalyticsSourceStatus (required)
- diagnostic: unknown
- last_observation_at: unknown

### CommercialSummary
- realized_gmv_usd: DecimalMetricValue (required)
- realized_revenue_usd: DecimalMetricValue (required)
- commission_pending_usd: unknown
- commission_invoiced_usd: unknown

### CommissionResponse
- id: string(uuid) (required, uuid)
- match_id: string(uuid) (required, uuid)
- amount_usd: string (required)
- status: CommissionStatus (required)
- invoice_number: unknown
- invoice_date: unknown
- payment_date: unknown
- created_at: string(date-time) (required)

### CommissionSummary
- total_pending_usd: string (required)
- total_invoiced_usd: string (required)
- total_paid_usd: string (required)
- pending_count: integer (required)
- invoiced_count: integer (required)
- paid_count: integer (required)

### CommissionUpdate
- status: unknown
- invoice_number: unknown
- invoice_date: unknown
- payment_date: unknown
- notes: unknown

### ComplianceScoreResponse
- vessel_id: string (required)
- vessel_name: string (required)
- overall_score: integer (required)
- status: string (required)
- traffic_light: string (required)
- fueleu: FuelEUResponse (required)
- eu_ets: EUETSResponse (required)
- cii: CIIResponse (required)
- recommendations: string[] (required)

### CtaMatrixRow
- cta: string (required)
- placement: string (required)
- clicks: unknown
- share_pct: unknown
- suppressed: boolean

### DailyEventPoint
- date: string (required)
- event: string (required)
- value: integer (required)

### DailyStat
- date: string(date) (required)
- orders_placed: integer (required)
- trades_executed: integer (required)
- volume_mt: number (required)
- gmv_usd: number (required)
- commission_usd: number (required)

### DailyVisitorPoint
- date: string (required)
- value: integer (required)

### DecimalMetricValue
- value: unknown
- previous: unknown
- suppressed: boolean

### DeliveryPointResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- region: string (required)
- timezone: unknown
- is_active: boolean (required)

### DemandSignal
- fuel_type: string (required)
- region: string (required)
- market_product_code: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window_code: unknown
- volume_mt: unknown (required)
- max_price_per_mt: unknown (required)
- urgency: UrgencyLevel (required)
- bid_count: integer (required)
- earliest_delivery: string (required)
- created_at: string(date-time) (required)
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer

### DurationBucket
- bucket: string (required)
- cell: AggregateCell (required)

### DurationDistribution
- buckets: DurationBucket[]
- median_hours: unknown
- sample_size: unknown
- suppressed: boolean

### EUETSResponse
- total_co2_tonnes: string (required)
- ets_price_per_tonne_eur: string (required)
- phase_in_pct: string (required)
- estimated_cost_eur: string (required)
- score: integer (required)

### EngagementKpis
- dau: MetricValue (required)
- wau: MetricValue (required)
- mau: MetricValue (required)
- stickiness_pct: unknown

### EngagementResponse
- meta: AnalyticsMeta (required)
- kpis: EngagementKpis (required)
- active_members_trend: SeriesPoint[]
- feature_adoption: FeatureAdoptionRow[]
- workflow_ratios: LabeledRatio[]
- navigation_destinations: NavigationDestinationRow[]
- tutorial_steps: TutorialStepRow[]

### ErrorDetail
- detail: string (required)

### FeatureAdoptionRow
- family: string (required)
- events: unknown
- suppressed: boolean

### FleetComplianceSummary
- total_vessels: integer (required)
- green_count: integer (required)
- amber_count: integer (required)
- red_count: integer (required)
- average_score: number (required)
- vessels: ComplianceScoreResponse[] (required)

### FleetDemandEntry
- fuel: string (required)
- ordered_vessels: integer (required)
- delivered_vessels: integer (required)
- avg_consumption_mt: integer (required)
- color: string (required)

### FleetDemandResponse
- entries: FleetDemandEntry[] (required)
- last_updated: string (required)
- sources: string[] (required)

### ForgotPasswordRequest
- email: string (required)

### ForwardCurveBoardCell
- product_id: string(uuid) (required, uuid)
- market_product: string (required)
- product_name: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- region: string (required)
- availability_window: string (required)
- benchmark_mid: unknown
- benchmark_source: unknown
- is_demo_benchmark: boolean
- order_source_kind: MarketSourceKind
- benchmark_source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- real_order_count: integer
- demo_order_count: integer
- unknown_order_count: integer
- real_best_bid: unknown
- real_best_ask: unknown
- demo_best_bid: unknown
- demo_best_ask: unknown
- best_bid_source_kind: MarketSourceKind
- best_ask_source_kind: MarketSourceKind
- order_observed_at: unknown
- benchmark_observed_at: unknown
- indication_summary: ForwardCurveBoardIndicationSummary
- fair_price_band: unknown
- fair_price_band_provenance: ForwardCurveSignalProvenance
- physical_stem_summary: ForwardCurveBoardPhysicalStemSummary
- best_bid: unknown
- best_ask: unknown
- spread: unknown
- volume_mt: string
- order_count: integer

### ForwardCurveBoardDepthLevel
- price_per_mt_usd: string (required)
- quantity_mt: string (required)
- order_count: integer (required)
- source_kind: MarketSourceKind
- demo_status: MarketDemoStatus
- real_order_count: integer
- demo_order_count: integer
- unknown_order_count: integer

### ForwardCurveBoardFairPriceBand
- low_price_per_mt_usd: unknown
- mid_price_per_mt_usd: unknown
- high_price_per_mt_usd: unknown
- provenance: ForwardCurveSignalProvenance (required)

### ForwardCurveBoardFocus
- product_id: string(uuid) (required, uuid)
- market_product: string (required)
- product_name: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- region: string (required)
- availability_window: string (required)
- curve: ForwardCurveBoardCell[] (required)
- depth_bids: ForwardCurveBoardDepthLevel[] (required)
- depth_asks: ForwardCurveBoardDepthLevel[] (required)
- indications: ForwardCurveBoardIndication[]
- fair_price_band: unknown
- fair_price_band_provenance: ForwardCurveSignalProvenance
- physical_stems: ForwardCurveBoardPhysicalStem[]

### ForwardCurveBoardIndication
- side: ForwardCurveIndicationSide (required)
- price_per_mt_usd: string (required)
- quantity_mt: unknown
- provenance: ForwardCurveSignalProvenance (required)

### ForwardCurveBoardIndicationSummary
- provenance: ForwardCurveSignalProvenance
- latest_bid_price_per_mt_usd: unknown
- latest_ask_price_per_mt_usd: unknown
- latest_mid_price_per_mt_usd: unknown
- total_quantity_mt: unknown
- indication_count: integer

### ForwardCurveBoardPhysicalStem
- quantity_mt: string (required)
- status: ForwardCurvePhysicalStemStatus (required)
- stem_start: unknown
- stem_end: unknown
- provenance: ForwardCurveSignalProvenance (required)

### ForwardCurveBoardPhysicalStemSummary
- provenance: ForwardCurveSignalProvenance
- available_quantity_mt: unknown
- tentative_quantity_mt: unknown
- stem_count: integer
- earliest_stem_start: unknown
- latest_stem_end: unknown

### ForwardCurveBoardPort
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- region: string (required)
- cells: ForwardCurveBoardCell[] (required)

### ForwardCurveBoardProduct
- product_id: string(uuid) (required, uuid)
- market_product: string (required)
- product_name: string (required)

### ForwardCurveBoardResponse
- availability_window: string (required)
- products: ForwardCurveBoardProduct[] (required)
- ports: ForwardCurveBoardPort[] (required)
- focus: ForwardCurveBoardFocus (required)
- generated_at: string(date-time) (required)

### ForwardCurveLabelPolicy
- public_label: string (required)
- tooltip: unknown
- allowed_terms: string[]
- forbidden_terms: string[]
- disclaimer: unknown

### ForwardCurveLatestSignal
- market_product: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- availability_window: string (required)
- primary_value: unknown
- primary_signal_type: MarketSignalType
- primary_source_kind: MarketSourceKind
- public_source_label: string
- demo_status: MarketDemoStatus
- observed_at: unknown
- staleness_status: ForwardCurveStalenessStatus

### ForwardCurveMarketCell
- market_product: string (required)
- product_name: string (required)
- representative_product_id: string(uuid) (required, uuid)
- product_count: integer
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- region: string (required)
- availability_window: string (required)
- primary_value: unknown
- primary_signal_type: MarketSignalType
- primary_source_kind: MarketSourceKind
- public_source_label: string
- label_policy: ForwardCurveLabelPolicy
- staleness_status: ForwardCurveStalenessStatus
- is_executable: boolean
- is_reference: boolean
- demo_status: MarketDemoStatus
- scope: MarketScope
- observed_at: unknown
- generated_at: string(date-time) (required)
- best_bid: unknown
- best_ask: unknown
- spread: unknown
- volume_mt: string
- order_count: integer
- real_order_count: integer
- demo_order_count: integer
- unknown_order_count: integer
- real_best_bid: unknown
- real_best_ask: unknown
- demo_best_bid: unknown
- demo_best_ask: unknown
- benchmark_mid: unknown
- benchmark_source_kind: MarketSourceKind
- benchmark_observed_at: unknown
- indication_summary: ForwardCurveBoardIndicationSummary
- fair_price_band: unknown
- fair_price_band_provenance: ForwardCurveSignalProvenance
- physical_stem_summary: ForwardCurveBoardPhysicalStemSummary

### ForwardCurvePoint
- availability_window: string (required)
- best_bid: unknown
- best_ask: unknown
- mid_price: unknown
- spread: unknown
- volume_mt: string (required)
- order_count: integer (required)

### ForwardCurveResponse
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown
- curve: ForwardCurvePoint[] (required)
- generated_at: string(date-time) (required)

### ForwardCurveSignalProvenance
- signal_type: MarketSignalType (required)
- signal_source_kind: ForwardCurveSignalSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- observed_at: unknown
- generated_at: string(date-time) (required)
- real_count: integer
- demo_count: integer
- unknown_count: integer

### ForwardCurveSliceEvidencePoint
- layer: ForwardCurveEvidenceLayer (required)
- side: unknown
- price_per_mt_usd: unknown
- low_price_per_mt_usd: unknown
- high_price_per_mt_usd: unknown
- quantity_mt: unknown
- observed_at: unknown
- public_source_label: string (required)
- source_kind: MarketSourceKind
- demo_status: MarketDemoStatus

### ForwardCurveSliceResponse
- cell: ForwardCurveMarketCell (required)
- previous_window: unknown
- next_window: unknown
- depth_bids: ForwardCurveBoardDepthLevel[]
- depth_asks: ForwardCurveBoardDepthLevel[]
- trades: ForwardCurveSliceTrade[]
- indications: ForwardCurveBoardIndication[]
- fair_price_band: unknown
- physical_stems: ForwardCurveBoardPhysicalStem[]
- evidence_points: ForwardCurveSliceEvidencePoint[]
- generated_at: string(date-time) (required)
- disclaimer: string

### ForwardCurveSliceTrade
- price_per_mt_usd: string (required)
- quantity_mt: string (required)
- confirmed_at: string(date-time) (required)
- source_kind: MarketSourceKind (required)
- demo_status: MarketDemoStatus (required)

### ForwardCurveTableCell
- primary_value: unknown
- primary_signal_type: MarketSignalType
- primary_source_kind: MarketSourceKind
- public_source_label: string
- staleness_status: ForwardCurveStalenessStatus
- is_executable: boolean
- is_reference: boolean
- demo_status: MarketDemoStatus
- observed_at: unknown
- best_bid: unknown
- best_ask: unknown
- spread: unknown
- volume_mt: string
- order_count: integer
- real_order_count: integer
- demo_order_count: integer
- unknown_order_count: integer

### ForwardCurveTableColumn
- availability_window: string (required)
- display_label: string (required)
- group: string (required)

### ForwardCurveTableResponse
- columns: ForwardCurveTableColumn[] (required)
- rows: ForwardCurveTableRow[] (required)
- latest_signals: ForwardCurveLatestSignal[]
- generated_at: string(date-time) (required)
- disclaimer: string

### ForwardCurveTableRow
- row_key: string (required)
- market_product: string (required)
- product_name: string (required)
- representative_product_id: string(uuid) (required, uuid)
- product_count: integer
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- region: string (required)
- cells: object (required)

### FrontendErrorPanel
- total: MetricValue (required)
- by_route_family: AggregateCell[]
- by_category: AggregateCell[]

### FuelEUResponse
- ghg_intensity_gco2_mj: string (required)
- target_intensity_gco2_mj: string (required)
- reduction_pct: string (required)
- compliance_balance_gco2: string (required)
- estimated_penalty_eur: string (required)
- score: integer (required)

### FunnelStage
- name: string (required)
- value: integer (required)
- conversion_from_previous_pct: unknown

### HTTPValidationError
- detail: ValidationError[]

### InventoryCreate
- port_id: string (required)
- fuel_type: FuelType (required)
- product_name: unknown
- current_stock_mt: unknown (required)
- incoming_stock_mt: unknown
- price_per_mt_usd: unknown
- energy_density_mj_kg: unknown
- is_certified: boolean
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown

### InventoryItemUpdate
- product_name: unknown
- current_stock_mt: unknown
- incoming_stock_mt: unknown
- price_per_mt_usd: unknown
- certification_declared: unknown
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: unknown
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: unknown
- off_spec_notes: unknown

### InventoryResponse
- port_id: string (required)
- fuel_type: FuelType (required)
- product_name: unknown
- current_stock_mt: string (required)
- incoming_stock_mt: string
- price_per_mt_usd: unknown
- energy_density_mj_kg: unknown
- is_certified: boolean
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- id: string(uuid) (required, uuid)
- supplier_id: string(uuid) (required, uuid)
- reserved_stock_mt: string (required)
- updated_at: string(date-time) (required)

### JoinReviewBody
- review_note: string (required)

### JourneyStage
- key: string (required)
- source: JourneySource (required)
- total: AggregateCell (required)
- buyer: unknown
- supplier: unknown

### LabeledRatio
- key: string (required)
- kind: ConversionRatioKind (required)
- ratio: RatioValue (required)

### LeaderboardEntry
- rank: integer (required)
- user_name: string (required)
- organization_name: unknown
- referral_count: integer (required)

### LifecycleStage
- key: LifecycleStageKey (required)
- count: unknown
- previous: unknown
- coverage: AnalyticsSourceStatus (required)
- detail_tab: string (required)

### LiquiditySummary
- two_sided_slices: unknown
- one_sided_slices: unknown
- crossed_slices: unknown
- median_spread_usd_per_mt: unknown
- median_spread_bps: unknown
- median_open_order_age_hours: unknown
- median_hours_to_first_fill: unknown
- slices: SliceLiquidityRow[]

### ListingOverlay
- penalty_avoided_eur_per_mt: string (required)
- penalty_avoided_usd_per_mt: string (required)
- tco2e_avoided_per_mt: string (required)
- ci_gco2_mj: string (required)
- ci_basis: string (required)
- lcv_mj_kg: string (required)
- lcv_basis: string (required)

### LoginFailurePanel
- total: MetricValue (required)
- categories: AggregateCell[]
- trend: SeriesPoint[]

### MarketActivitySection
- kpis: MarketplaceKpis (required)
- liquidity: LiquiditySummary (required)
- balance_trend: MarketBalanceTrend (required)
- product_port_matrix: ProductPortCell[]
- window_distribution: RankedRow[]
- order_status_distribution: AggregateCell[]
- trade_status_distribution: AggregateCell[]
- concentration: OrganizationConcentration (required)

### MarketBalanceTrend
- buyer_organizations: SeriesPoint[]
- supplier_organizations: SeriesPoint[]
- bids: SeriesPoint[]
- asks: SeriesPoint[]

### MarketSupportContext
- organization: MarketSupportOrganization (required)
- eligible_principals: MarketSupportPrincipal[] (required)
- authorizations: AuthorizationResponse[] (required)
- listings: AssistedListingResponse[] (required)

### MarketSupportOrganization
- id: string(uuid) (required, uuid)
- name: string (required)
- domain: unknown (required)
- type: string (required)

### MarketSupportPrincipal
- id: string(uuid) (required, uuid)
- email: string (required)
- name: string (required)

### MarketplaceBalance
- buyer_organizations: MetricValue (required)
- supplier_organizations: MetricValue (required)
- bid_orders: MetricValue (required)
- ask_orders: MetricValue (required)

### MarketplaceKpis
- participating_organizations: MetricValue (required)
- open_bids: MetricValue (required)
- open_asks: MetricValue (required)
- confirmed_trades: MetricValue (required)
- confirmed_volume_mt: DecimalMetricValue (required)
- execution_rate: RatioValue (required)

### MarketplaceResponse
- meta: AnalyticsMeta (required)
- live: unknown
- demo: unknown
- unknown: unknown
- reference: unknown
- commercial: unknown

### MetricEntry
- name: string (required)
- value: integer (required)

### MetricValue
- value: unknown
- previous: unknown
- suppressed: boolean

### NavigationDestinationRow
- destination: NavigationDestination (required)
- total: AggregateCell (required)
- buyer: unknown
- supplier: unknown

### NavigationLatencyRow
- destination: unknown (required)
- buckets: AggregateCell[]

### NeedsAttentionItem
- rule: NeedsAttentionRule (required)
- count: unknown

### NegotiationCounterRequest
- proposed_price: unknown (required)
- notes: unknown

### NegotiationCreateRequest
- bid_order_id: unknown
- ask_order_id: unknown
- counterparty_org_id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- availability_window: string
- quantity_mt: unknown (required)
- proposed_price: unknown (required)
- notes: unknown
- expires_in_hours: integer

### NegotiationListResponse
- items: NegotiationResponse[] (required)
- total: integer (required)

### NegotiationResponse
- id: string(uuid) (required, uuid)
- bid_order_id: unknown
- ask_order_id: unknown
- initiator_org_id: string(uuid) (required, uuid)
- initiator_org_name: unknown
- counterparty_org_id: string(uuid) (required, uuid)
- counterparty_org_name: unknown
- initiator_user_id: unknown
- counterparty_user_id: unknown
- accepted_by_user_id: unknown
- initiator_side: string (required)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown
- availability_window: string
- product_name: unknown
- quantity_mt: string (required)
- current_price: string (required)
- status: string (required)
- last_actor_org_id: string(uuid) (required, uuid)
- trade_id: unknown
- expires_at: string(date-time) (required)
- created_at: string(date-time) (required)
- updated_at: string(date-time) (required)
- rounds: NegotiationRoundResponse[]

### NegotiationRoundResponse
- id: string(uuid) (required, uuid)
- round_number: integer (required)
- proposer_org_id: string(uuid) (required, uuid)
- proposer_org_name: unknown
- proposer_user_id: unknown
- proposed_price: string (required)
- notes: unknown
- created_at: string(date-time) (required)

### NotificationResponse
- id: string(uuid4) (required)
- type: string (required)
- title: string (required)
- message: string (required)
- data: unknown (required)
- is_read: boolean (required)
- created_at: string(date-time) (required)

### OrderCreate-Input
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- port_id: unknown
- vessel_id: unknown
- quantity_mt: unknown (required)
- price_per_mt_usd: unknown (required)
- availability_window: string
- certifications: string[]
- expires_at: unknown
- is_anonymous: boolean

### OrderCreate-Output
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- port_id: unknown
- vessel_id: unknown
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: string
- certifications: string[]
- expires_at: unknown
- is_anonymous: boolean

### OrderMyResponse
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
- market_product: unknown
- fuel_type: string
- fuel_grade: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- port_id: unknown
- quantity_mt: string (required)
- remaining_quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: string (required)
- certifications: string[]
- is_verdaxis_verified: boolean (required)
- tier_label: TierLabel
- status: OrderBookStatus (required)
- expires_at: unknown
- created_at: string(date-time) (required)
- benchmark_price_per_mt_usd: unknown
- premium_discount_per_mt_usd: unknown
- benchmark_source: unknown
- is_crossed: boolean
- is_demo_listing: boolean
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer
- organization_id: string(uuid) (required, uuid)
- vessel_id: unknown
- updated_at: string(date-time) (required)
- trade_count: integer
- creation_method: string
- version: integer
- etag: unknown

### OrderResponse
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
- market_product: unknown
- fuel_type: string
- fuel_grade: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- port_id: unknown
- quantity_mt: string (required)
- remaining_quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: string (required)
- certifications: string[]
- is_verdaxis_verified: boolean (required)
- tier_label: TierLabel
- status: OrderBookStatus (required)
- expires_at: unknown
- created_at: string(date-time) (required)
- benchmark_price_per_mt_usd: unknown
- premium_discount_per_mt_usd: unknown
- benchmark_source: unknown
- is_crossed: boolean
- is_demo_listing: boolean
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer

### OrderResponseWithCI
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
- market_product: unknown
- fuel_type: string
- fuel_grade: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- port_id: unknown
- quantity_mt: string (required)
- remaining_quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: string (required)
- certifications: string[]
- is_verdaxis_verified: boolean (required)
- tier_label: TierLabel
- status: OrderBookStatus (required)
- expires_at: unknown
- created_at: string(date-time) (required)
- benchmark_price_per_mt_usd: unknown
- premium_discount_per_mt_usd: unknown
- benchmark_source: unknown
- is_crossed: boolean
- is_demo_listing: boolean
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer
- ci_adjusted_price: unknown

### OrderUpdate
- quantity_mt: unknown
- price_per_mt_usd: unknown
- availability_window: unknown
- certifications: unknown
- certification_declared: unknown
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: unknown
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: unknown
- off_spec_notes: unknown
- expires_at: unknown

### OrganizationConcentration
- hhi_band: unknown
- suppressed: boolean

### OrganizationCreate
- name: string (required)
- type: OrgType (required)
- tax_id: unknown
- country_code: unknown

### OverlayAssumptions
- eur_usd_rate: string (required)
- vlsfo_baseline_gco2_mj: string (required)
- ghgie_actual_gco2_mj: string (required)
- fleet_intensity_basis: string (required)
- fleet_vessel_count: integer (required)
- penalty_eur_per_tonne: string (required)
- year: integer (required)
- year_target: string (required)
- excluded_factors: string[] (required)

### OverviewKpis
- qualified_organizations: MetricValue (required)
- active_members: MetricValue (required)
- participating_organizations: MetricValue (required)
- live_orders: MetricValue (required)
- confirmed_trades: MetricValue (required)

### PaginatedResponse_AssistedListingResponse_
- items: AssistedListingResponse[] (required)
- total: integer (required)
- skip: integer (required)
- limit: integer (required)

### PaginatedResponse_AuthorizationResponse_
- items: AuthorizationResponse[] (required)
- total: integer (required)
- skip: integer (required)
- limit: integer (required)

### PaginatedResponse_MarketSupportOrganization_
- items: MarketSupportOrganization[] (required)
- total: integer (required)
- skip: integer (required)
- limit: integer (required)

### PaginatedResponse_OrderResponse_
- items: OrderResponse[] (required)
- total: integer (required)
- skip: integer (required)
- limit: integer (required)

### PaginatedResponse_TradeResponse_
- items: TradeResponse[] (required)
- total: integer (required)
- skip: integer (required)
- limit: integer (required)

### PasswordChangeRequest
- current_password: string (required)
- new_password: string (required)

### PinTargetCreate
- target_type: string (required)
- order_id: string(uuid) (required, uuid)

### PortFuelAvailability
- port_id: string (required)
- port_name: string (required)
- lat: number (required)
- lng: number (required)
- fuel_type: string (required)
- market_product_code: string (required)
- total_stock_mt: unknown (required)
- supplier_count: integer (required)
- availability_level: AvailabilityLevel (required)
- avg_price_per_mt: unknown
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer

### PortIntelligenceBase
- congestion_level: unknown
- methanol_price_avg: unknown
- biofuel_price_avg: unknown
- captured_at: string(date-time) (required)

### PortResponse
- id: string (required)
- name: string (required)
- country: string (required)
- location: unknown
- timezone: unknown
- is_active: boolean
- lat: unknown
- lng: unknown
- intelligence: unknown

### PriceDiscoveryResponse
- summaries: PriceSummary[] (required)
- generated_at: string(date-time) (required)

### PriceSummary
- product_id: unknown
- product_name: string
- market_product: unknown
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window: string
- region: string
- last_price: unknown
- avg_price_24h: unknown
- high_24h: unknown
- low_24h: unknown
- volume_24h: string
- trade_count_24h: integer
- price_change_pct: unknown
- last_trade_at: unknown
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- is_reference: boolean
- observed_at: unknown
- real_trade_count_24h: integer
- demo_trade_count_24h: integer
- unknown_trade_count_24h: integer

### PricingOverlayRequest
- order_ids: string[] (required)
- year: integer

### PricingOverlayResponse
- overlays: object (required)
- assumptions: OverlayAssumptions (required)

### ProducerProjectResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- fuel_type: string (required)
- capacity_kt_per_year: unknown
- country: string (required)
- region: unknown
- lat: unknown
- lng: unknown
- cod_date: unknown
- cod_year: unknown
- status: string (required)
- data_source: unknown
- gena_project_id: unknown
- organization_id: unknown
- feedstock: unknown
- technology: unknown
- carbon_intensity_gco2_mj: unknown
- notes: unknown
- created_at: string(date-time) (required)

### ProductPortCell
- product_key: string (required)
- product_label: string (required)
- delivery_point_key: string (required)
- delivery_point_label: string (required)
- orders: AggregateCell (required)
- organizations: AggregateCell (required)

### ProductResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- market_product: unknown
- fuel_type: string (required)
- fuel_grade: string (required)
- unit: string (required)
- min_lot_size: string (required)
- is_active: boolean (required)

### ProductUsageResponse
- days: integer (required)
- period_start: string(date-time) (required)
- period_end: string(date-time) (required)
- behavioral_status: string (required)
- diagnostic: unknown (required)
- observed_at: string(date-time) (required)
- behavioral: BehavioralUsage (required)
- authoritative: AuthoritativeUsage (required)
- funnel: FunnelStage[] (required)

### RFQCreateRequest
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- quantity_mt: unknown (required)
- target_price_per_mt: unknown
- availability_window: string
- notes: unknown
- is_anonymous: boolean
- expires_in_hours: integer

### RFQListResponse
- items: RFQResponse[] (required)
- total: integer (required)

### RFQQuoteRequest
- price_per_mt_usd: unknown (required)
- notes: unknown

### RFQQuoteResponse
- id: string(uuid) (required, uuid)
- seller_org_id: string(uuid) (required, uuid)
- seller_org_name: unknown
- price_per_mt_usd: string (required)
- notes: unknown
- status: string (required)
- created_at: string(date-time) (required)

### RFQResponse
- id: string(uuid) (required, uuid)
- buyer_org_id: unknown
- buyer_org_name: unknown
- product_id: string(uuid) (required, uuid)
- product_name: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- quantity_mt: string (required)
- target_price_per_mt: unknown
- availability_window: string (required)
- notes: unknown
- is_anonymous: boolean (required)
- status: string (required)
- expires_at: string(date-time) (required)
- created_at: string(date-time) (required)
- quote_count: integer
- quotes: RFQQuoteResponse[]

### RankedRow
- key: string (required)
- label: string (required)
- count: unknown
- share_pct: unknown
- suppressed: boolean

### RatioValue
- numerator: unknown
- denominator: unknown
- rate_pct: unknown
- suppressed: boolean
- cohort_complete: boolean

### ReferenceCoverageRow
- product_key: string (required)
- product_label: string (required)
- delivery_point_key: string (required)
- delivery_point_label: string (required)
- availability_window: string (required)
- availability_window_label: string (required)
- benchmark_price_usd_per_mt: unknown
- source_label: ReferenceSourceLabel (required)
- generated_at: string(date-time) (required)
- observed_at: unknown
- source_kind: ReferenceSourceKind (required)
- scope: ReferenceScope (required)
- coverage_status: string (required)

### ReferenceCoverageSection
- rows: ReferenceCoverageRow[]

### ReferencePriceItem
- product_id: unknown
- product_name: string
- market_product: unknown
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window: string
- region: string
- vwap_usd: string (required)
- total_volume_mt: string (required)
- trade_count: integer (required)
- date: string(date) (required)
- visibility: string
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- is_reference: boolean

### ReferencePriceResponse
- prices: ReferencePriceItem[] (required)
- generated_at: string(date-time) (required)

### ReferralCodeResponse
- referral_code: string (required)
- referral_link: string (required)

### ReferralInviteRequest
- email: string(email) (required)

### ReferralListItem
- organization_name: unknown
- role: unknown
- status: string (required)
- signed_up_at: string(date-time) (required)

### ReferralStatsResponse
- total: integer (required)
- verified: integer (required)
- active: integer (required)
- referrals: ReferralListItem[] (required)

### RefreshRequest
- refresh_token: unknown

### RegisterWithOrgRequest
- registration_token: string (required)
- organization: OrganizationCreate (required)

### RegistrationResponse
- status: string (required)
- user: unknown
- registration_token: unknown

### ReliabilityResponse
- meta: AnalyticsMeta (required)
- collector: CollectorState (required)
- login_failures: LoginFailurePanel (required)
- frontend_errors: FrontendErrorPanel (required)
- backend_unavailable: BackendUnavailablePanel (required)
- navigation_latency: NavigationLatencyRow[]
- audit_activity: AuditActivityRow[]

### ResendVerificationRequest
- email: string (required)

### ResetPasswordRequest
- token: string (required)
- new_password: string (required)

### ResolveCodeResponse
- valid: boolean (required)
- organization_name: unknown
- organization_type: unknown
- referrer_name: unknown

### RetentionKpis
- returning_members: MetricValue (required)
- retained_organizations: MetricValue (required)
- reactivated_organizations: MetricValue (required)
- dormant_approved_members: MetricValue (required)

### RetentionResponse
- meta: AnalyticsMeta (required)
- kpis: RetentionKpis (required)
- member_cohorts: CohortRow[]
- organization_cohorts: CohortRow[]
- repeat_participation: AggregateCell[]

### ScenarioInput
- vessel_id: string (required)
- fuel_mix: object (required)
- year: integer

### SeriesPoint
- date: string(date) (required)
- value: unknown

### SliceLiquidityRow
- product_key: string (required)
- product_label: string (required)
- delivery_point_key: string (required)
- delivery_point_label: string (required)
- availability_window: string (required)
- availability_window_label: string (required)
- contributing_organizations: unknown
- best_bid_usd_per_mt: unknown
- best_ask_usd_per_mt: unknown
- spread_usd_per_mt: unknown
- spread_bps: unknown
- best_bid_depth_mt: unknown
- best_ask_depth_mt: unknown
- one_percent_bid_depth_mt: unknown
- one_percent_ask_depth_mt: unknown
- crossed: unknown
- suppressed: boolean

### SliceTargetCreate
- target_type: string (required)
- market_product_code: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- availability_window_code: string (required)

### SubscriptionResponse
- id: string(uuid) (required, uuid)
- org_id: string(uuid) (required, uuid)
- tier: SubscriptionTier (required)
- started_at: unknown
- expires_at: unknown
- is_active: boolean (required)

### SubscriptionUpdate
- tier: SubscriptionTier (required)

### SupplierListingTemplateResponse
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: string (required)
- certifications: string[]

### SurveySubmission
- use_case: string (required)
- referral_source: unknown

### TradeCreate
- order_id: string(uuid) (required, uuid)
- quantity_mt: unknown (required)

### TradeDeliverPayload
- final_quantity_mt: unknown (required)
- final_price_per_mt: unknown (required)

### TradeResponse
- id: string(uuid) (required, uuid)
- bid_order_id: unknown
- ask_order_id: unknown
- buyer_id: string(uuid) (required, uuid)
- seller_id: string(uuid) (required, uuid)
- buyer_name: string
- seller_name: string
- initiated_by: Initiator (required)
- is_anonymous: boolean
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- status: TradeStatus (required)
- final_quantity_mt: unknown
- final_price_per_mt: unknown
- final_total_usd: unknown
- commission_rate_pct: string
- commission_amount_usd: unknown
- confirmed_at: unknown
- delivered_at: unknown
- paid_at: unknown
- created_at: string(date-time) (required)
- product_id: unknown
- product_name: string
- market_product: unknown
- fuel_type: string
- fuel_grade: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window: unknown
- region: string
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer

### TradeTapeEntry
- id: string (required)
- product_id: unknown
- market_product: unknown
- fuel_type: string (required)
- fuel_grade: string (required)
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- total_usd: string (required)
- confirmed_at: string(date-time) (required)
- availability_window: string (required)
- is_demo_trade: boolean
- scope: string
- provenance_kind: string
- source_kind: MarketSourceKind
- demo_status: MarketDemoStatus

### TradeTapeResponse
- items: TradeTapeEntry[] (required)
- total: integer (required)
- market_hours: boolean (required)

### TutorialStepRow
- step: string (required)
- completed: AggregateCell (required)
- skipped: AggregateCell (required)

### UserCreate
- email: string(email) (required)
- first_name: unknown
- last_name: unknown
- role: UserRole (required)
- password: string (required)
- organization_id: unknown
- referral_code: unknown

### UserResponse
- email: string(email) (required)
- first_name: unknown
- last_name: unknown
- role: UserRole (required)
- id: string(uuid) (required, uuid)
- status: UserStatus (required)
- organization_id: unknown
- referral_code: unknown
- must_change_password: boolean

### UserUpdate
- first_name: unknown
- last_name: unknown
- role: unknown

### ValidationError
- loc: any[] (required)
- msg: string (required)
- type: string (required)
- input: unknown
- ctx: object

### VesselResponse
- name: string (required)
- imo_number: string (required)
- vessel_type: unknown
- flag_state: unknown
- dwt: unknown
- cii_rating: unknown
- eu_ets_status: unknown
- fueleu_status: unknown
- current_location: unknown
- previous_location: unknown
- lat: unknown
- lng: unknown
- prev_lat: unknown
- prev_lng: unknown
- id: string (required)
- organization_id: unknown
- updated_at: string(date-time) (required)

### WatchlistCreateRequest
- name: string (required)

### WatchlistDetailResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- kind: string (required)
- unread_event_count: integer
- latest_event_at: unknown
- total_slice_count: integer
- has_more_slices: boolean
- slices: WatchlistSliceResponse[]
- created_at: string(date-time) (required)

### WatchlistEntryAddRequest
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown

### WatchlistEntryResponse
- id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
- product_name: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- best_bid: unknown
- best_ask: unknown
- created_at: string(date-time) (required)

### WatchlistEventResponse
- id: string(uuid) (required, uuid)
- watchlist_id: string(uuid) (required, uuid)
- watchlist_target_id: string(uuid) (required, uuid)
- target_type: string (required)
- event_type: string (required)
- event_payload: object
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- observed_at: unknown
- market_product_code: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window_code: unknown
- order_id: unknown
- is_read: boolean (required)
- created_at: string(date-time) (required)

### WatchlistEventsPageResponse
- items: WatchlistEventResponse[]
- next_cursor: unknown

### WatchlistResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- entry_count: integer
- entries: WatchlistEntryResponse[]
- created_at: string(date-time) (required)

### WatchlistSliceResponse
- id: string(uuid) (required, uuid)
- target_type: string
- market_product_code: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: unknown
- availability_window_code: string (required)
- active_order_count: integer
- unread_event_count: integer
- latest_event_at: unknown
- pins: WatchlistTargetResponse[]
- created_at: string(date-time) (required)

### WatchlistSummaryResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- kind: string (required)
- unread_event_count: integer
- latest_event_at: unknown
- total_slice_count: integer
- has_more_slices: boolean
- slices: WatchlistSliceResponse[]
- created_at: string(date-time) (required)

### WatchlistTargetResponse
- id: string(uuid) (required, uuid)
- target_type: string (required)
- market_product_code: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window_code: unknown
- order_id: unknown
- snapshot_price_per_mt_usd: unknown
- snapshot_quantity_mt: unknown
- snapshot_remaining_quantity_mt: unknown
- snapshot_status: unknown
- snapshot_side: unknown
- snapshot_market_product: unknown
- snapshot_delivery_point_name: unknown
- snapshot_availability_window: unknown
- snapshot_counterparty_label: unknown
- active_order_count: integer
- unread_event_count: integer
- latest_event_at: unknown
- created_at: string(date-time) (required)

### app__routers__admin_analytics__OverviewResponse
- total_users: integer (required)
- active_users_7d: integer (required)
- total_organizations: integer (required)
- total_orders: integer (required)
- open_orders: integer (required)
- total_trades: integer (required)
- confirmed_trades: integer (required)
- total_volume_mt: number (required)
- total_revenue_usd: number (required)
- total_gmv_usd: number (required)

### app__schemas__product_analytics__OverviewResponse
- meta: AnalyticsMeta (required)
- kpis: OverviewKpis (required)
- lifecycle: LifecycleStage[]
- activity_trend: ActivityTrend (required)
- marketplace_balance: MarketplaceBalance (required)
- needs_attention: NeedsAttentionItem[]

---

# Components

- **AppRoutes** — `src/App.tsx`
- **AnalyticsProvider** — `src/components/AnalyticsProvider.tsx`
- **BuyerMap** — props: onPortSelect, onNavigate, onOrderClick — `src/components/BuyerMap.tsx`
- **CommandCenter** — props: viewMode, onNavigate, onOpenSlice, openOrderId — `src/components/CommandCenter.tsx`
- **BuyerDashboard** — `src/components/CommandCenter.tsx`
- **SupplierDashboard** — `src/components/CommandCenter.tsx`
- **Compliance** — `src/components/Compliance.tsx`
- **DataAnalytics** — `src/components/DataAnalytics.tsx`
- **ErrorFallback** — props: fallback — `src/components/ErrorBoundary.tsx`
- **ForwardCurveWorkspace** — props: onNavigate, onOpenSlice — `src/components/ForwardCurveWorkspace.tsx`
- **GuidedTutorial** — props: viewMode — `src/components/GuidedTutorial.tsx`
- **LanguageSelector** — props: onLanguageChange, variant — `src/components/LanguageSelector.tsx`
- **Layout** — props: viewMode, onSwitchView, currentPage, onNavigate, onPrefetchPage, onPrimaryAction — `src/components/Layout.tsx`
- **Marketplace** — props: initialPort, viewMode, initialSlice — `src/components/Marketplace.tsx`
- **MatchSuggestions** — props: onViewTrade, onCountChange, onNavigate — `src/components/MatchSuggestions.tsx`
- **MobileDesktopGate** — `src/components/MobileDesktopGate.tsx`
- **MyTrades** — `src/components/MyTrades.tsx`
- **NeedsAttentionFeed** — props: trades, viewMode, onNavigate, onConfirmTrade, onPostOrder — `src/components/NeedsAttentionFeed.tsx`
- **NewsFeed** — props: embedded — `src/components/NewsFeed.tsx`
- **OrderBook** — props: fuelType, marketProduct, region, deliveryPointId, availability, actionableSide, onLevelClick, onInstantTrade — `src/components/OrderBook.tsx`
- **OrderPlaceModal** — props: isOpen, onClose, side, prefillFuelType, prefillRegion, prefillMarketProduct, prefillDeliveryPointId, prefillAvailabilityWindow, prefillPrice — `src/components/OrderPlaceModal.tsx`
- **ReferralsTab** — `src/components/ReferralsTab.tsx`
- **Settings** — props: viewMode — `src/components/Settings.tsx`
- **SupplierAnalytics** — `src/components/SupplierAnalytics.tsx`
- **SupplierDemandFeed** — props: onNavigate, onOpenSlice — `src/components/SupplierDemandFeed.tsx`
- **SupplierQuotes** — `src/components/SupplierQuotes.tsx`
- **TradeHistoryPage** — `src/components/TradeHistoryPage.tsx`
- **TradeNotifier** — `src/components/TradeNotifier.tsx`
- **TradeTape** — props: fuelType, marketProduct, availability, region, deliveryPointId — `src/components/TradeTape.tsx`
- **Training** — `src/components/Training.tsx`
- **WatchlistPage** — `src/components/WatchlistPage.tsx`
- **AdminDashboard** — `src/components/admin/AdminDashboard.tsx`
- **MarketSupportWorkspace** — `src/components/admin/market-support/MarketSupportWorkspace.tsx`
- **AcquisitionTab** — props: data, compare — `src/components/admin/product-analytics/AcquisitionTab.tsx`
- **ActivationTab** — props: data — `src/components/admin/product-analytics/ActivationTab.tsx`
- **AggregateJourney** — props: stages — `src/components/admin/product-analytics/AggregateJourney.tsx`
- **AnalyticsFilterRail** — props: filters, onChange — `src/components/admin/product-analytics/AnalyticsFilterRail.tsx`
- **TabLoading** — `src/components/admin/product-analytics/AnalyticsStates.tsx`
- **TabError** — props: message, onRetry — `src/components/admin/product-analytics/AnalyticsStates.tsx`
- **EmptyNote** — props: label — `src/components/admin/product-analytics/AnalyticsStates.tsx`
- **SectionHeading** — props: title, hint — `src/components/admin/product-analytics/AnalyticsStates.tsx`
- **DeltaBadge** — props: metric — `src/components/admin/product-analytics/AnalyticsStates.tsx`
- **KpiCell** — props: label, metric, compare — `src/components/admin/product-analytics/AnalyticsStates.tsx`
- **CoverageNote** — props: meta, source — `src/components/admin/product-analytics/AnalyticsStates.tsx`
- **AnalyticsTabRail** — props: active, onSelect — `src/components/admin/product-analytics/AnalyticsTabRail.tsx`
- **CohortGrid** — props: rows, emptyLabel — `src/components/admin/product-analytics/CohortGrid.tsx`
- **EngagementTab** — props: data, compare — `src/components/admin/product-analytics/EngagementTab.tsx`
- **FeatureAdoptionTable** — props: rows — `src/components/admin/product-analytics/FeatureAdoptionTable.tsx`
- **LifecycleSpine** — props: stages, onSelectTab — `src/components/admin/product-analytics/LifecycleSpine.tsx`
- **MarketActivityMatrix** — props: cells — `src/components/admin/product-analytics/MarketActivityMatrix.tsx`
- **MarketplaceTab** — props: data, compare — `src/components/admin/product-analytics/MarketplaceTab.tsx`
- **MetricStrip** — props: items, compare — `src/components/admin/product-analytics/MetricStrip.tsx`
- **OverviewTab** — props: data, compare, onSelectTab — `src/components/admin/product-analytics/OverviewTab.tsx`
- **ProductAnalyticsWorkspace** — `src/components/admin/product-analytics/ProductAnalyticsWorkspace.tsx`
- **ReliabilityStatusList** — props: collector, meta — `src/components/admin/product-analytics/ReliabilityStatusList.tsx`
- **ReliabilityTab** — props: data — `src/components/admin/product-analytics/ReliabilityTab.tsx`
- **RetentionTab** — props: data, compare — `src/components/admin/product-analytics/RetentionTab.tsx`
- **TrendChart** — props: series, emptyLabel, height — `src/components/admin/product-analytics/TrendChart.tsx`
- **ComplianceDashboard** — props: onOpenLedger — `src/components/compliance/ComplianceDashboard.tsx`
- **ComplianceDataInput** — `src/components/compliance/ComplianceDataInput.tsx`
- **ComplianceLedgerModal** — props: onClose — `src/components/compliance/ComplianceLedgerModal.tsx`
- **ComplianceTracing** — `src/components/compliance/ComplianceTracing.tsx`
- **VesselDetailModal** — props: vessel, onClose — `src/components/fleet/VesselDetailModal.tsx`
- **Header** — props: viewMode, onSwitchView, onOpenMobileSidebar — `src/components/layout/Header.tsx`
- **ComplianceEstimatorCard** — props: selectedPort, portOptions, onSelectPort, onOpenMarketplace — `src/components/map/ComplianceEstimatorCard.tsx`
- **IntelligencePanel** — props: isOpen, onClose, selectedPort, portOptions, onMapPortSelect, onPortSelect — `src/components/map/IntelligencePanel.tsx`
- **MapLegend** — `src/components/map/MapLegend.tsx`
- **MarketWatchTicker** — props: isPanelOpen, onOpenPanel, ports — `src/components/map/MarketWatchTicker.tsx`
- **NotificationBell** — `src/components/notifications/NotificationBell.tsx`
- **NotificationList** — props: onClose — `src/components/notifications/NotificationList.tsx`
- **DataOcean** — props: style — `src/components/public/DataOcean.tsx`
- **HeroSection** — `src/components/public/HeroSection.tsx`
- **LanguageRedirect** — `src/components/public/LanguageRedirect.tsx`
- **LegacyRedirect** — `src/components/public/LegacyRedirect.tsx`
- **PriceTicker** — `src/components/public/PriceTicker.tsx`
- **PublicFooter** — `src/components/public/PublicFooter.tsx`
- **PublicLanguageWrapper** — `src/components/public/PublicLanguageWrapper.tsx`
- **PublicLayout** — `src/components/public/PublicLayout.tsx`
- **PublicNav** — `src/components/public/PublicNav.tsx`
- **Reveal** — props: delay, y, className, style — `src/components/public/motionUtils.tsx`
- **HoverCard** — props: style, className — `src/components/public/motionUtils.tsx`
- **HoverButton** — props: style — `src/components/public/motionUtils.tsx`
- **StaggerGrid** — props: style, className — `src/components/public/motionUtils.tsx`
- **StaggerItem** — props: style, className — `src/components/public/motionUtils.tsx`
- **LeafDecor** — props: style, color — `src/components/public/motionUtils.tsx`
- **DotGrid** — props: style, color — `src/components/public/motionUtils.tsx`
- **CircuitLines** — props: style, color — `src/components/public/motionUtils.tsx`
- **GradientOrb** — props: style, color, size — `src/components/public/motionUtils.tsx`
- **BenchmarkPriceBlock** — props: priceUsd, benchmarkUsd, deltaUsd, align — `src/components/trading/BenchmarkPriceBlock.tsx`
- **CompliancePriceHint** — props: overlay, assumptions — `src/components/trading/CompliancePriceHint.tsx`
- **MarketActivityBadge** — props: activity, className, showLive, showUnknown — `src/components/trading/MarketActivityBadge.tsx`
- **MarketRadarPanel** — props: radar, events, loading, error, onOpenRadar — `src/components/watchlist/MarketRadarPanel.tsx`
- **AuthProvider** — `src/context/AuthContext.tsx`
- **NotificationProvider** — `src/context/NotificationContext.tsx`
- **ThemeProvider** — `src/context/ThemeContext.tsx`
- **TutorialProvider** — `src/context/TutorialContext.tsx`
- **CREATE_ORGANIZATION_ORG_TYPES** — props: value, onChange, placeholder, searchPlaceholder, noResults — `src/pages/CreateOrganizationPage.tsx`
- **ForcePasswordChangePage** — `src/pages/ForcePasswordChangePage.tsx`
- **ForgotPasswordPage** — `src/pages/ForgotPasswordPage.tsx`
- **InvitePage** — `src/pages/InvitePage.tsx`
- **KycPage** — `src/pages/KycPage.tsx`
- **LoginPage** — `src/pages/LoginPage.tsx`
- **MaintenancePage** — props: onRetry, isRetrying — `src/pages/MaintenancePage.tsx`
- **OnboardingPage** — `src/pages/OnboardingPage.tsx`
- **RESEND_COOLDOWN** — `src/pages/RegisterPage.tsx`
- **ResetPasswordPage** — `src/pages/ResetPasswordPage.tsx`
- **ROLE_CARDS** — `src/pages/VerifyEmailPage.tsx`
- **BuyerUseCasePage** — `src/pages/public/BuyerUseCasePage.tsx`
- **ComplianceInfoPage** — `src/pages/public/ComplianceInfoPage.tsx`
- **EducationArticlePage** — `src/pages/public/EducationArticlePage.tsx`
- **EducationPage** — `src/pages/public/EducationPage.tsx`
- **EnergyCalculatorPage** — `src/pages/public/EnergyCalculatorPage.tsx`
- **FinancierUseCasePage** — `src/pages/public/FinancierUseCasePage.tsx`
- **FuelCoveragePage** — `src/pages/public/FuelCoveragePage.tsx`
- **GovernancePage** — `src/pages/public/GovernancePage.tsx`
- **HowItWorksPage** — `src/pages/public/HowItWorksPage.tsx`
- **LandingPage** — `src/pages/public/LandingPage.tsx`
- **NotFoundPage** — `src/pages/public/NotFoundPage.tsx`
- **PartnerLandingPage** — `src/pages/public/PartnerLandingPage.tsx`
- **PartnerShowcasePage** — `src/pages/public/PartnerShowcasePage.tsx`
- **PartnersPage** — `src/pages/public/PartnersPage.tsx`
- **PilotPage** — `src/pages/public/PilotPage.tsx`
- **PrivacyPage** — `src/pages/public/PrivacyPage.tsx`
- **ProducerMapPage** — `src/pages/public/ProducerMapPage.tsx`
- **ProducerUseCasePage** — `src/pages/public/ProducerUseCasePage.tsx`
- **RoadmapPage** — `src/pages/public/RoadmapPage.tsx`
- **TermsPage** — `src/pages/public/TermsPage.tsx`
- **TraderUseCasePage** — `src/pages/public/TraderUseCasePage.tsx`
- **AllProviders** — `src/tests/test-utils.tsx`

---

# Libraries

- `scripts/geocode_projects.py`
  - function parse_cod_year: (cod_estimated, cod_announced) -> int | None
  - function load_cache: () -> dict
  - function save_cache: (cache)
  - function geocode: (city, country) -> tuple[float, float] | None
  - function main: ()
- `scripts/smoke_navigation.py`
  - function static_server: (port)
  - function get_auth_config: () -> dict[str, str]
  - function percentile: (values, quantile) -> float
  - function classify_cause: (resources, Any]], long_task_ms) -> str
  - function navigation_init_script: () -> str
  - function page_url: (base_url, token) -> str
  - _...11 more_
- `src/data/calculatorDefaults.ts`
  - function calculateVoyage: (energyDensity, fuelPrice, dailyConsumption, inputs) => VoyageResult
  - interface CalculatorInputs
  - interface VoyageResult
  - const defaultInputs: CalculatorInputs
- `src/data/educationArticles.ts`
  - function getEducationArticles: () => EducationArticle[]
  - interface EducationArticle
  - const educationArticles: EducationArticle[]
- `src/data/fuelPrices.ts` — function fetchFuelPrices, interface FuelPrice
- `src/hooks/useLocalePath.ts` — function useLocalePath: () => void
- `src/hooks/useNamespace.ts` — function useNamespace: (ns) => void
- `src/hooks/useProductAnalyticsFilters.ts`
  - function parseProductAnalyticsFilters
  - function serializeProductAnalyticsFilters
  - function useProductAnalyticsFilters
  - interface ProductAnalyticsFilters
  - type AnalyticsPeriod
  - const ANALYTICS_TABS: readonly AnalyticsTab[]
  - _...1 more_
- `src/hooks/useSSE.ts` — function useSSE: (channel, onEvent, enabled) => void
- `src/hooks/useWatchlist.ts` — function useWatchlist: () => UseWatchlistResult
- `src/i18n.ts`
  - function isSupportedLang: (lang) => lang is SupportedLang
  - function loadNamespace: (ns) => Promise<void>
  - type SupportedLang
  - const SUPPORTED_LANGS
- `src/map/addEcaLayers.ts` — function addEcaLayers, function setEcaLayersVisible
- `src/services/ai-engine/cache.ts`
  - function getCachedData
  - function setCachedData
  - function clearCache
- `src/services/ai-engine/generators.ts` — function analyzeRisk
- `src/services/analytics.ts`
  - function normalizeAnalyticsPath
  - function createAnalytics
  - function routeFamilyFromPath
  - function navigationLatencyBucket
  - function createReliabilityReporter
  - interface AnalyticsEventMap
  - _...9 more_
- `src/services/api.ts`
  - function mapPortResponse
  - function isAbortError
  - interface PaginatedResult
  - interface ProductUsageResponse
  - type ProductUsagePeriod
  - type ProductUsageStatus
  - _...1 more_
- `src/services/authToken.ts`
  - function getAccessToken: () => string | null
  - function setAccessToken: (token) => void
  - function clearAccessToken: () => void
  - function refreshSession: () => Promise<RefreshOutcome>
  - function refreshAccessToken: () => Promise<string | null>
  - type RefreshOutcome
- `src/services/backendAvailability.ts`
  - function isBackendUnavailableStatus
  - function notifyBackendUnavailable
  - const BACKEND_UNAVAILABLE_EVENT
- `src/utils/availabilityWindow.ts`
  - function normalizeAvailabilityWindow: (value) => string
  - function compareAvailabilityWindows: (left, right) => number
  - function formatAvailabilityWindow: (value) => string
  - function formatAvailabilityWindowPeriod: (value) => string
  - function getAvailabilityWindowOptions: (options?) => AvailabilityWindowOption[]
  - function getAvailabilityWindowSummary: (value, options?) => void
  - _...5 more_
- `src/utils/buyerMapMarket.ts`
  - function computePortMarketData
  - interface PortMarketRow
  - interface PortMarketData
- `src/utils/complianceEstimator.ts`
  - function estimateCompliancePlanning: (input) => ComplianceEstimatorResult
  - interface FuelAssumption
  - interface ComplianceEstimatorInput
  - interface ComplianceEstimatorResult
  - const GREEN_FUEL_ASSUMPTIONS: FuelAssumption[]
  - const DEFAULT_COMPLIANCE_ESTIMATOR_INPUT: Omit<ComplianceEstimatorInput, 'greenFuel'>
- `src/utils/curveChart.ts` — function serializeChartTime, const availabilityWindowToChartTime
- `src/utils/fuel.ts`
  - function getFuelRowClasses: (fuelType) => string
  - function getFuelBadgeClasses: (fuelType) => string
  - function getFuelStickyBg: (fuelType) => string
  - function getFuelChipClasses: (fuelType) => string
  - function getStatusConfig: (status) => StatusConfig
  - function formatExpiry: (order) => React.ReactNode
  - _...2 more_
- `src/utils/marketActivity.ts`
  - function isDemoMarketActivity: (activity) => boolean
  - function describeMarketActivity: (activity) => MarketActivityDescriptor
  - function describeForwardCurveSignal: (signal) => MarketActivityDescriptor
  - function marketActivityTextClass: (tone) => string
  - function marketActivityBadgeClass: (tone) => string
  - interface MarketActivityDescriptor
  - _...4 more_
- `src/utils/marketPorts.ts` — function resolveApprovedMapPorts, function filterPortsByActiveDeliveryPoints
- `src/utils/marketProduct.ts`
  - function formatMarketProduct: (value) => string
  - function getProductDisplayName: (product) => string
  - function getProductDisplayNameFromReference: (reference, products) => string
  - function getOrderDisplayName: (order) => string
  - type ProductReference
- `src/utils/marketProducts.ts`
  - function isMarketplaceProductFilter
  - function getMarketplaceProductOption
  - function getMarketplaceProductValue
  - function getMarketplaceFuelType
  - function getMarketplaceProductLabel
  - interface MarketplaceProductOption
  - _...3 more_
- `src/utils/navigationPerformance.ts`
  - function recordDashboardNavigationStart
  - function recordDashboardContentReady
  - function getDashboardNavigationEventName
  - interface DashboardNavigationMetric
- `src/utils/sliceUrl.ts`
  - function sliceToPath
  - function parseSlicePath
  - interface MarketSlice
- `src/utils/tradeAnalytics.ts`
  - function isActiveTradeStatus: (status) => boolean
  - function isCompletedTradeStatus: (status) => boolean
  - function isConfirmedLikeTrade: (tradeOrStatus) => boolean
  - function normalizeTradeLifecycleStatus: (status) => string
  - function tradeDisplayQuantityMt: (trade) => number
  - function tradeDisplayPricePerMt: (trade) => number
  - _...7 more_
- `src/utils/tradingPorts.ts`
  - function normalizeTradingPortName
  - function isApprovedTradingPortName
  - const filterApprovedTradingPorts
- `src/utils/watchlist.ts`
  - function getWatchlistSliceKeyFromParts: (marketProductCode?, deliveryPointId?, availabilityWindowCode?) => string
  - function getWatchlistSliceKey: (target) => string
  - function formatWatchlistSliceLabel: (slice) => string
  - function describeWatchlistEvent: (event) => string
  - function getWatchlistEventActivity: (event) => MarketActivityInput
  - function getLatestEventForSlice: (slice, events) => WatchlistEvent | undefined
  - _...1 more_
- `src/utils.ts`
  - function createCustomIcon
  - function calculateHeading
  - function getArbitrageRoute
  - function formatTierLabel

---

# Config

## Environment Variables

- `MODE` **required** — src/services/analytics.ts
- `VERDAXIS_SMOKE_EMAIL` **required** — scripts/smoke_navigation.py
- `VERDAXIS_SMOKE_PASSWORD` **required** — scripts/smoke_navigation.py
- `VERDAXIS_SMOKE_TOKEN` **required** — scripts/smoke_navigation.py
- `VITE_ANALYTICS_HOST` **required** — src/services/analytics.ts
- `VITE_ANALYTICS_WEBSITE_ID` **required** — src/services/analytics.ts
- `VITE_API_URL` (has default) — .env.example

## Config Files

- `.env.example`
- `Dockerfile`
- `tailwind.config.js`
- `tsconfig.json`
- `vercel.json`
- `vite.config.ts`

## Key Dependencies

- react: ^19.2.0

---

# Middleware

## auth
- authToken — `src/services/authToken.ts`
- auth-context.test — `src/tests/auth-context.test.tsx`
- auth-refresh.test — `src/tests/auth-refresh.test.ts`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `src/types.ts` — imported by **72** files
- `src/hooks/useNamespace.ts` — imported by **51** files
- `src/services/api.ts` — imported by **33** files
- `src/services/analytics.ts` — imported by **23** files
- `src/context/AuthContext.tsx` — imported by **19** files
- `src/types/productAnalytics.ts` — imported by **19** files
- `src/services/config.ts` — imported by **17** files
- `src/tests/test-utils.tsx` — imported by **15** files
- `src/i18n.ts` — imported by **14** files
- `src/components/admin/product-analytics/AnalyticsStates.tsx` — imported by **13** files
- `src/data.ts` — imported by **11** files
- `src/utils/marketProduct.ts` — imported by **10** files
- `src/utils/sliceUrl.ts` — imported by **6** files
- `src/components/ui/Tooltip.tsx` — imported by **6** files
- `src/utils/availabilityWindow.ts` — imported by **6** files
- `src/context/NotificationContext.tsx` — imported by **5** files
- `src/context/TutorialContext.tsx` — imported by **5** files
- `src/utils/marketActivity.ts` — imported by **5** files
- `src/components/admin/product-analytics/MetricStrip.tsx` — imported by **5** files
- `src/components/admin/product-analytics/TrendChart.tsx` — imported by **5** files

## Import Map (who imports what)

- `src/types.ts` ← `src/App.tsx`, `src/components/BuyerMap.tsx`, `src/components/CommandCenter.tsx`, `src/components/DataAnalytics.tsx`, `src/components/ForwardCurveWorkspace.tsx` +67 more
- `src/hooks/useNamespace.ts` ← `src/components/BuyerMap.tsx`, `src/components/CommandCenter.tsx`, `src/components/Compliance.tsx`, `src/components/GuidedTutorial.tsx`, `src/components/Marketplace.tsx` +46 more
- `src/services/api.ts` ← `src/components/BuyerMap.tsx`, `src/components/CommandCenter.tsx`, `src/components/DataAnalytics.tsx`, `src/components/ForwardCurveWorkspace.tsx`, `src/components/Marketplace.tsx` +28 more
- `src/services/analytics.ts` ← `src/App.tsx`, `src/components/AnalyticsProvider.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/GuidedTutorial.tsx`, `src/components/Marketplace.tsx` +18 more
- `src/context/AuthContext.tsx` ← `src/App.tsx`, `src/components/DataAnalytics.tsx`, `src/components/GuidedTutorial.tsx`, `src/components/Layout.tsx`, `src/components/Marketplace.tsx` +14 more
- `src/types/productAnalytics.ts` ← `src/components/admin/product-analytics/AcquisitionTab.tsx`, `src/components/admin/product-analytics/ActivationTab.tsx`, `src/components/admin/product-analytics/AggregateJourney.tsx`, `src/components/admin/product-analytics/AnalyticsFilterRail.tsx`, `src/components/admin/product-analytics/AnalyticsStates.tsx` +14 more
- `src/services/config.ts` ← `src/components/ReferralsTab.tsx`, `src/components/Settings.tsx`, `src/context/AuthContext.tsx`, `src/hooks/useSSE.ts`, `src/pages/CreateOrganizationPage.tsx` +12 more
- `src/tests/test-utils.tsx` ← `src/tests/benchmark-price-block.test.tsx`, `src/tests/compliance-estimator-card.test.tsx`, `src/tests/compliance-price-hint.test.tsx`, `src/tests/data-analytics.test.tsx`, `src/tests/features.test.ts` +10 more
- `src/i18n.ts` ← `src/components/LanguageSelector.tsx`, `src/components/public/HeroSection.tsx`, `src/components/public/LanguageRedirect.tsx`, `src/components/public/LegacyRedirect.tsx`, `src/components/public/PublicLanguageWrapper.tsx` +9 more
- `src/components/admin/product-analytics/AnalyticsStates.tsx` ← `src/components/admin/product-analytics/AcquisitionTab.tsx`, `src/components/admin/product-analytics/ActivationTab.tsx`, `src/components/admin/product-analytics/AggregateJourney.tsx`, `src/components/admin/product-analytics/CohortGrid.tsx`, `src/components/admin/product-analytics/EngagementTab.tsx` +8 more

---

# Test Coverage

> **4%** of routes and models are covered by tests
> 61 test files found

## Covered Routes

- GET:/

## Covered Models

- AnalyticsMeta
- ErrorDetail
- ForwardCurveMarketCell
- ForwardCurveSliceResponse
- ForwardCurveTableResponse
- MarketActivitySection
- MarketplaceResponse
- MetricValue
- OverlayAssumptions
- PortResponse
- ReliabilityResponse
- RetentionResponse

---

# CI/CD Pipelines

## GitHub Actions (1 workflow)

| Workflow | Triggers | Jobs | Deploy | Environments |
|---|---|---|---|---|
| Verdaxis Frontend CI | push, pull_request | 1 | — | — |

---
_Source: .github/workflows/frontend-ci.yml_
_Generated by codesight-cicd-plugin_

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_