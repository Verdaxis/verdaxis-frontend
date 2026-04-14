# verdaxis-intelligence-cockpit — AI Context Map

> **Stack:** raw-http | none | react | typescript

> 120 routes | 91 models | 115 components | 18 lib files | 3 env vars | 2 middleware | 2% test coverage
> **Token savings:** this file is ~12,600 tokens. Without it, AI exploration would cost ~150,000 tokens. **Saves ~137,400 tokens per conversation.**
> **Last scanned:** 2026-04-14 06:31 — re-run after significant changes

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

- `POST` `/api/auth/login` [authentication, auth] ✓
- `POST` `/api/auth/refresh` [authentication, auth]
- `POST` `/api/auth/logout` [authentication, auth]
- `POST` `/api/auth/register` → in: UserCreate, out: RegistrationResponse [authentication, auth]
- `POST` `/api/auth/register-with-org` → in: RegisterWithOrgRequest, out: UserResponse [authentication, auth]
- `GET` `/api/auth/verify-email` [authentication, auth]
- `POST` `/api/auth/resend-verification` [authentication, auth]
- `POST` `/api/auth/resend-verification-email` → in: ResendVerificationRequest [authentication, auth]
- `GET` `/api/auth/me` → out: UserResponse [authentication, auth]
- `PUT` `/api/auth/me` → in: UserUpdate, out: UserResponse [authentication, auth]
- `PUT` `/api/auth/me/password` → in: PasswordChangeRequest [authentication, auth]
- `POST` `/api/auth/forgot-password` → in: ForgotPasswordRequest [authentication, auth]
- `POST` `/api/auth/reset-password` → in: ResetPasswordRequest [authentication, auth]
- `PUT` `/api/auth/approve/:user_id` params(user_id) → out: UserResponse [authentication, auth]
- `PUT` `/api/auth/switch-role/:target_role` params(target_role) → out: Token [authentication, auth]
- `GET` `/api/ports` → out: PortResponse[] ✓
- `GET` `/api/ports/:port_id` params(port_id) → out: PortResponse
- `GET` `/api/vessels` → out: VesselResponse[]
- `GET` `/api/vessels/:vessel_id` params(vessel_id) → out: VesselResponse
- `POST` `/api/inventory/:item_id/publish` params(item_id)
- `GET` `/api/listings`
- `GET` `/api/listings/my`
- `GET` `/api/compliance/ledger` → out: ComplianceLedgerResponse[]
- `POST` `/api/compliance/verify`
- `POST` `/api/ai/chat` → in: Body_chat_api_ai_chat_post
- `GET` `/api/orders/admin/commissions` → out: CommissionResponse[] [orders]
- `GET` `/api/orders/admin/commissions/summary` → out: CommissionSummary [orders]
- `PUT` `/api/orders/admin/commissions/:commission_id` params(commission_id) → in: CommissionUpdate, out: CommissionResponse [orders]
- `GET` `/api/notifications` → out: NotificationResponse[] [notifications]
- `GET` `/api/notifications/unread-count` [notifications]
- `PATCH` `/api/notifications/:notification_id/read` params(notification_id) [notifications]
- `PATCH` `/api/notifications/read-all` [notifications]
- `GET` `/api/orderbook/bids` → out: PaginatedResponse_OrderResponse_ [orderbook]
- `GET` `/api/orderbook/asks` → out: PaginatedResponse_OrderResponse_ [orderbook]
- `GET` `/api/orderbook/with-ci` → out: OrderResponseWithCI[] [orderbook]
- `GET` `/api/orderbook/my` → out: OrderMyResponse[] [orderbook]
- `GET` `/api/orderbook/aggregated` → out: AggregatedOrderbookResponse[] [orderbook]
- `GET` `/api/orderbook/products` → out: array [orderbook]
- `GET` `/api/orderbook/regions` → out: array [orderbook]
- `GET` `/api/orderbook/fuel-types` → out: array [orderbook]
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
- `GET` `/api/compliance/fuels` → out: object [compliance]
- `GET` `/api/admin/analytics/overview` → out: OverviewResponse [admin-analytics]
- `GET` `/api/admin/analytics/daily` → out: DailyStat[] [admin-analytics]
- `POST` `/api/kyc/submit` [kyc]
- `GET` `/api/kyc/status` [kyc]
- `PUT` `/api/kyc/admin/:user_id/approve` params(user_id) [kyc]
- `PUT` `/api/kyc/admin/:user_id/reject` params(user_id) → in: AdminRejectBody [kyc]
- `GET` `/api/catalog/products` → out: ProductResponse[] [catalog]
- `GET` `/api/catalog/delivery-points` → out: DeliveryPointResponse[] [catalog]
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
- `POST` `/api/watchlists/:watchlist_id/entries` params(watchlist_id) → in: WatchlistEntryAddRequest, out: WatchlistEntryResponse [watchlists]
- `DELETE` `/api/watchlists/:watchlist_id/entries/:entry_id` params(watchlist_id, entry_id) [watchlists]
- `POST` `/api/rfq/:rfq_id/quote` params(rfq_id) → in: RFQQuoteRequest, out: RFQQuoteResponse [rfq]
- `POST` `/api/rfq/:rfq_id/accept/:quote_id` params(rfq_id, quote_id) → out: RFQQuoteResponse [rfq]
- `POST` `/api/rfq/:rfq_id/cancel` params(rfq_id) [rfq]
- `POST` `/api/negotiations/:negotiation_id/counter` params(negotiation_id) → in: NegotiationCounterRequest, out: NegotiationResponse [negotiations]
- `POST` `/api/negotiations/:negotiation_id/accept` params(negotiation_id) → out: NegotiationResponse [negotiations]
- `POST` `/api/negotiations/:negotiation_id/decline` params(negotiation_id) → out: NegotiationResponse [negotiations]
- `GET` `/api/news` [news]
- `POST` `/api/news/refresh` [news]
- `GET` `/api/fleet-intelligence` → out: FleetDemandResponse [fleet-intelligence]
- `GET` `/api/dashboard/health` → out: SystemHealth [dashboard]
- `GET` `/api/dashboard/logs` [dashboard]
- `GET` `/` ✓
- `GET` `/health`
- `GET` `/health/live`
- `GET` `/health/ready`

---

# Schema

### AdminRejectBody
- reason: string (required)

### AggregatedOrderbookResponse
- product_id: string(uuid) (required, uuid)
- product_name: string
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- side: OrderSide (required)
- min_price: string (required)
- max_price: string (required)
- total_quantity: string (required)
- order_count: integer (required)

### AlertCreate
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown
- direction: string (required)
- threshold_usd: unknown (required)

### AlertResponse
- id: string(uuid) (required, uuid)
- org_id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown (required)
- direction: string (required)
- threshold_usd: string (required)
- is_active: boolean (required)
- triggered_at: unknown (required)
- created_at: string(date-time) (required)

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

### Body_chat_api_ai_chat_post
- message: string (required)
- history: object[]

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

### Body_verify_document_api_compliance_verify_post
- file: string (required)

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

### ComplianceLedgerResponse
- transaction_type: string (required)
- amount: number (required)
- currency: string
- units: unknown
- description: unknown
- reference_id: unknown
- id: string(uuid) (required, uuid)
- organization_id: unknown
- created_at: string(date-time) (required)

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

### DailyStat
- date: string(date) (required)
- orders_placed: integer (required)
- trades_executed: integer (required)
- volume_mt: number (required)
- gmv_usd: number (required)
- commission_usd: number (required)

### DeliveryPointResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- region: string (required)
- timezone: unknown
- is_active: boolean (required)

### DemandSignal
- fuel_type: string (required)
- region: string (required)
- volume_mt: string (required)
- max_price_per_mt: string (required)
- urgency: UrgencyLevel (required)
- bid_count: integer (required)
- earliest_delivery: string (required)
- created_at: string(date-time) (required)

### EUETSResponse
- total_co2_tonnes: string (required)
- ets_price_per_tonne_eur: string (required)
- phase_in_pct: string (required)
- estimated_cost_eur: string (required)
- score: integer (required)

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

### FuelEUResponse
- ghg_intensity_gco2_mj: string (required)
- target_intensity_gco2_mj: string (required)
- reduction_pct: string (required)
- compliance_balance_gco2: string (required)
- estimated_penalty_eur: string (required)
- score: integer (required)

### HTTPValidationError
- detail: ValidationError[]

### InventoryCreate
- port_id: string (required)
- fuel_type: FuelType (required)
- product_name: unknown
- current_stock_mt: number (required)
- incoming_stock_mt: number
- reserved_stock_mt: number
- price_per_mt_usd: unknown
- energy_density_mj_kg: unknown
- is_certified: boolean

### InventoryItemUpdate
- product_name: unknown
- current_stock_mt: unknown
- incoming_stock_mt: unknown
- price_per_mt_usd: unknown

### InventoryResponse
- port_id: string (required)
- fuel_type: FuelType (required)
- product_name: unknown
- current_stock_mt: number (required)
- incoming_stock_mt: number
- reserved_stock_mt: number
- price_per_mt_usd: unknown
- energy_density_mj_kg: unknown
- is_certified: boolean
- id: string(uuid) (required, uuid)
- supplier_id: string(uuid) (required, uuid)
- updated_at: string(date-time) (required)

### LeaderboardEntry
- rank: integer (required)
- user_name: string (required)
- organization_name: unknown
- referral_count: integer (required)

### NegotiationCounterRequest
- proposed_price: unknown (required)
- notes: unknown

### NegotiationCreateRequest
- bid_order_id: unknown
- ask_order_id: unknown
- counterparty_org_id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
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
- initiator_side: string (required)
- product_id: string(uuid) (required, uuid)
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

### OrderCreate
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

### OrderMyResponse
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
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
- carbon_intensity_gco2_mj: unknown
- is_crossed: boolean
- organization_id: string(uuid) (required, uuid)
- vessel_id: unknown
- updated_at: string(date-time) (required)
- trade_count: integer

### OrderResponse
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
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
- carbon_intensity_gco2_mj: unknown
- is_crossed: boolean

### OrderResponseWithCI
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
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
- carbon_intensity_gco2_mj: unknown
- is_crossed: boolean
- ci_adjusted_price: unknown

### OrderUpdate
- quantity_mt: unknown
- price_per_mt_usd: unknown
- availability_window: unknown
- certifications: unknown
- expires_at: unknown

### OrganizationCreate
- name: string (required)
- type: OrgType (required)
- tax_id: unknown
- country_code: unknown

### OverviewResponse
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

### PortFuelAvailability
- port_id: string (required)
- port_name: string (required)
- lat: number (required)
- lng: number (required)
- fuel_type: string (required)
- total_stock_mt: string (required)
- supplier_count: integer (required)
- availability_level: AvailabilityLevel (required)
- avg_price_per_mt: unknown

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
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- last_price: unknown
- avg_price_24h: unknown
- high_24h: unknown
- low_24h: unknown
- volume_24h: string
- trade_count_24h: integer
- price_change_pct: unknown
- last_trade_at: unknown

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

### ProductResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- fuel_type: string (required)
- fuel_grade: string (required)
- unit: string (required)
- min_lot_size: string (required)
- is_active: boolean (required)

### RFQCreateRequest
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown
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
- buyer_org_id: string(uuid) (required, uuid)
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

### ReferencePriceItem
- product_id: unknown
- product_name: string
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- vwap_usd: string (required)
- total_volume_mt: string (required)
- trade_count: integer (required)
- date: string(date) (required)
- visibility: string

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

### ScenarioInput
- vessel_id: string (required)
- fuel_mix: object (required)
- year: integer

### SubscriptionResponse
- id: string(uuid) (required, uuid)
- org_id: string(uuid) (required, uuid)
- tier: SubscriptionTier (required)
- started_at: unknown
- expires_at: unknown
- is_active: boolean (required)

### SubscriptionUpdate
- tier: SubscriptionTier (required)

### SystemHealth
- status: string (required)
- uptime_seconds: number (required)
- cpu_usage_pct: number (required)
- memory_usage_pct: number (required)
- disk_free_gb: number (required)
- disk_used_pct: number (required)
- platform: string (required)

### Token
- access_token: string (required)
- token_type: string (required)

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
- fuel_type: string
- fuel_grade: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string

### TradeTapeEntry
- id: string (required)
- fuel_type: string (required)
- fuel_grade: string (required)
- region: string (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- total_usd: string (required)
- confirmed_at: string(date-time) (required)
- availability_window: string (required)

### TradeTapeResponse
- items: TradeTapeEntry[] (required)
- total: integer (required)
- market_hours: boolean (required)

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

### WatchlistEntryAddRequest
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown

### WatchlistEntryResponse
- id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
- product_name: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- created_at: string(date-time) (required)

### WatchlistResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- entry_count: integer
- entries: WatchlistEntryResponse[]
- created_at: string(date-time) (required)

---

# Components

- **ScrollToTop** — `src/App.tsx`
- **ActivityFeed** — `src/components/ActivityFeed.tsx`
- **BuyerMap** — props: onPortSelect, onNavigate, onOrderClick — `src/components/BuyerMap.tsx`
- **CommandCenter** — props: viewMode, onNavigate, openOrderId — `src/components/CommandCenter.tsx`
- **BuyerDashboard** — `src/components/CommandCenter.tsx`
- **SupplierDashboard** — `src/components/CommandCenter.tsx`
- **Compliance** — `src/components/Compliance.tsx`
- **DataAnalytics** — `src/components/DataAnalytics.tsx`
- **ErrorFallback** — props: fallback — `src/components/ErrorBoundary.tsx`
- **Fleet** — `src/components/Fleet.tsx`
- **ForwardCurve** — props: initialProductId, fuelType, deliveryPointName, onPeriodClick — `src/components/ForwardCurve.tsx`
- **GuidedTutorial** — props: viewMode — `src/components/GuidedTutorial.tsx`
- **LanguageSelector** — props: onLanguageChange, variant — `src/components/LanguageSelector.tsx`
- **Layout** — props: viewMode, onSwitchView, currentPage, onNavigate, onPrimaryAction — `src/components/Layout.tsx`
- **MarketFeed** — props: viewMode, onNavigate — `src/components/MarketFeed.tsx`
- **MarketTerminal** — props: onNavigate — `src/components/MarketTerminal.tsx`
- **Marketplace** — props: initialPort — `src/components/Marketplace.tsx`
- **MatchSuggestions** — props: onViewTrade, onCountChange, onNavigate — `src/components/MatchSuggestions.tsx`
- **MyTrades** — `src/components/MyTrades.tsx`
- **NeedsAttentionFeed** — props: trades, viewMode, onNavigate, onConfirmTrade, onPostOrder — `src/components/NeedsAttentionFeed.tsx`
- **NewsCard** — `src/components/NewsCard.tsx`
- **NewsFeed** — `src/components/NewsFeed.tsx`
- **OrderBook** — props: fuelType, marketProduct, region, availability, actionableSide, onLevelClick, onInstantTrade — `src/components/OrderBook.tsx`
- **OrderPlaceModal** — props: isOpen, onClose, side, prefillFuelType, prefillRegion, prefillPrice — `src/components/OrderPlaceModal.tsx`
- **PriceAlertManager** — props: isOpen, onClose — `src/components/PriceAlertManager.tsx`
- **RFQPanel** — props: role, sortBy, region, fuelType, availability — `src/components/RFQPanel.tsx`
- **ReferralsTab** — `src/components/ReferralsTab.tsx`
- **Settings** — props: viewMode — `src/components/Settings.tsx`
- **Stats** — `src/components/Stats.tsx`
- **SupplierAnalytics** — `src/components/SupplierAnalytics.tsx`
- **SupplierDemandFeed** — props: onNavigate — `src/components/SupplierDemandFeed.tsx`
- **SupplierInventory** — `src/components/SupplierInventory.tsx`
- **SupplierListingConsole** — `src/components/SupplierListingConsole.tsx`
- **SupplierQuotes** — `src/components/SupplierQuotes.tsx`
- **SupplierStats** — `src/components/SupplierStats.tsx`
- **TradeHistoryPage** — `src/components/TradeHistoryPage.tsx`
- **TradeNotifier** — `src/components/TradeNotifier.tsx`
- **TradeTape** — props: fuelType, region — `src/components/TradeTape.tsx`
- **Training** — `src/components/Training.tsx`
- **WatchlistPage** — `src/components/WatchlistPage.tsx`
- **AdminDashboard** — `src/components/admin/AdminDashboard.tsx`
- **Copilot** — props: viewMode, currentPage — `src/components/ai/Copilot.tsx`
- **CreateBidModal** — props: onSubmit, onCancel, isLoading — `src/components/buyer/CreateBidModal.tsx`
- **ComplianceDashboard** — props: onOpenLedger — `src/components/compliance/ComplianceDashboard.tsx`
- **ComplianceDataInput** — `src/components/compliance/ComplianceDataInput.tsx`
- **ComplianceLedgerModal** — props: onClose — `src/components/compliance/ComplianceLedgerModal.tsx`
- **ComplianceTracing** — `src/components/compliance/ComplianceTracing.tsx`
- **VesselDetailModal** — props: vessel, onClose — `src/components/fleet/VesselDetailModal.tsx`
- **Header** — props: viewMode, onSwitchView, onOpenMobileSidebar — `src/components/layout/Header.tsx`
- **IntelligencePanel** — props: isOpen, onClose, selectedPort, onPortSelect, onNavigate, ports, onArbitrageUpdate — `src/components/map/IntelligencePanel.tsx`
- **MapLegend** — `src/components/map/MapLegend.tsx`
- **MarketWatchTicker** — props: isPanelOpen, onOpenPanel — `src/components/map/MarketWatchTicker.tsx`
- **VesselMarkers** — `src/components/map/VesselMarkers.tsx`
- **NotificationBell** — `src/components/notifications/NotificationBell.tsx`
- **NotificationList** — props: onClose — `src/components/notifications/NotificationList.tsx`
- **DataOcean** — props: style — `src/components/public/DataOcean.tsx`
- **HeroSection** — `src/components/public/HeroSection.tsx`
- **LanguageRedirect** — `src/components/public/LanguageRedirect.tsx`
- **LegacyRedirect** — `src/components/public/LegacyRedirect.tsx`
- **PilotApplicationForm** — `src/components/public/PilotApplicationForm.tsx`
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
- **RFQOfferAlert** — props: onNavigateToRFQ — `src/components/rfq/RFQOfferAlert.tsx`
- **CreateListingModal** — props: onSubmit, onCancel, isLoading — `src/components/supplier/CreateListingModal.tsx`
- **CreateQuoteModal** — props: requestId, onClose, onSubmit — `src/components/supplier/CreateQuoteModal.tsx`
- **OrderbookDepth** — props: bids, asks, fuelType, region — `src/components/trading/OrderbookDepth.tsx`
- **MarketRadarPanel** — props: radar, events, loading, error, onOpenRadar — `src/components/watchlist/MarketRadarPanel.tsx`
- **AuthProvider** — `src/context/AuthContext.tsx`
- **CopilotProvider** — `src/context/CopilotContext.tsx`
- **NotificationProvider** — `src/context/NotificationContext.tsx`
- **ThemeProvider** — `src/context/ThemeContext.tsx`
- **TutorialProvider** — `src/context/TutorialContext.tsx`
- **COUNTRIES** — props: value, onChange, placeholder, searchPlaceholder, noResults — `src/pages/CreateOrganizationPage.tsx`
- **ForgotPasswordPage** — `src/pages/ForgotPasswordPage.tsx`
- **InvitePage** — `src/pages/InvitePage.tsx`
- **KycPage** — `src/pages/KycPage.tsx`
- **LoginPage** — `src/pages/LoginPage.tsx`
- **OnboardingPage** — `src/pages/OnboardingPage.tsx`
- **RESEND_COOLDOWN** — `src/pages/RegisterPage.tsx`
- **ResetPasswordPage** — `src/pages/ResetPasswordPage.tsx`
- **VerifyEmailPage** — `src/pages/VerifyEmailPage.tsx`
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
- `src/data/calculatorDefaults.ts`
  - function calculateVoyage: (energyDensity, fuelPrice, dailyConsumption, inputs) => VoyageResult
  - interface CalculatorInputs
  - interface VoyageResult
  - const defaultInputs: CalculatorInputs
- `src/data/educationArticles.ts`
  - function getEducationArticles: () => EducationArticle[]
  - interface EducationArticle
  - const educationArticles: EducationArticle[]
- `src/hooks/useDemoMode.ts` — function useDemoMode: () => [boolean, () => void], function isDemoMode: () => boolean
- `src/hooks/useLocalePath.ts` — function useLocalePath: () => void
- `src/hooks/useNamespace.ts` — function useNamespace: (ns) => void
- `src/hooks/useSSE.ts` — function useSSE: (channel, onEvent, enabled) => void
- `src/hooks/useWatchlist.ts` — function useWatchlist: () => UseWatchlistResult
- `src/i18n.ts`
  - function isSupportedLang: (lang) => lang is SupportedLang
  - function loadNamespace: (ns) => Promise<void>
  - type SupportedLang
  - const SUPPORTED_LANGS
- `src/services/ai-engine/cache.ts` — function getCachedData, function setCachedData
- `src/services/ai-engine/chat.ts`
  - function chatWithCopilot
  - interface ChatResponse
  - const SYSTEM_INSTRUCTION
- `src/services/ai-engine/generators.ts`
  - function generateMarketNarrative
  - function generateArbitrageInsight
  - function analyzeRisk
  - function fetchLiveMarketData
  - function performWebSearch
  - interface MarketDataResult
- `src/services/authToken.ts`
  - function getAccessToken: () => string | null
  - function setAccessToken: (token) => void
  - function clearAccessToken: () => void
- `src/utils/availabilityWindow.ts`
  - function normalizeAvailabilityWindow: (value) => string
  - function compareAvailabilityWindows: (left, right) => number
  - function formatAvailabilityWindow: (value) => string
  - function formatAvailabilityWindowPeriod: (value) => string
  - function getAvailabilityWindowOptions: (options?) => AvailabilityWindowOption[]
  - function getAvailabilityWindowSummary: (value, options?) => void
  - _...2 more_
- `src/utils/fuel.ts`
  - function getFuelRowClasses: (fuelType) => string
  - function getFuelBadgeClasses: (fuelType) => string
  - function getFuelStickyBg: (fuelType) => string
  - function getFuelChipClasses: (fuelType) => string
  - function getStatusConfig: (status) => StatusConfig
  - function formatExpiry: (order) => React.ReactNode
  - _...2 more_
- `src/utils/marketProduct.ts`
  - function formatMarketProduct: (value) => string
  - function normalizeProductDisplayName: (value) => string
  - function getProductDisplayName: (product) => string
  - function getOrderDisplayName: (order) => string
  - const MARKET_PRODUCT_LABELS: Record<MarketProduct, string>
- `src/utils/watchlist.ts`
  - function getWatchlistSliceKeyFromParts: (marketProductCode?, deliveryPointId?, availabilityWindowCode?) => string
  - function getWatchlistSliceKey: (target) => string
  - function formatWatchlistSliceLabel: (slice) => string
  - function describeWatchlistEvent: (event) => string
  - function getLatestEventForSlice: (slice, events) => WatchlistEvent | undefined
  - function getLatestEventForTarget: (target, events) => WatchlistEvent | undefined
- `src/utils.ts`
  - function createCustomIcon
  - function calculateHeading
  - function getArbitrageRoute
  - function formatTierLabel

---

# Config

## Environment Variables

- `VITE_API_URL` (has default) — .env.example
- `VITE_AUTHENTIK_CLIENT_ID` (has default) — .env.example
- `VITE_AUTHENTIK_URL` (has default) — .env.example

## Config Files

- `.env.example`
- `Dockerfile`
- `tailwind.config.js`
- `tsconfig.json`
- `vite.config.ts`

## Key Dependencies

- react: ^19.2.0

---

# Middleware

## auth
- authentik-guide — `docs/authentik-guide.md`
- authToken — `src/services/authToken.ts`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `src/types.ts` — imported by **64** files
- `src/hooks/useNamespace.ts` — imported by **61** files
- `src/services/api.ts` — imported by **34** files
- `src/services/config.ts` — imported by **19** files
- `src/context/AuthContext.tsx` — imported by **16** files
- `src/context/CopilotContext.tsx` — imported by **8** files
- `src/i18n.ts` — imported by **8** files
- `src/components/ui/VerdaxisSelect.tsx` — imported by **8** files
- `src/components/Toast.tsx` — imported by **6** files
- `src/utils/marketProduct.ts` — imported by **6** files
- `src/context/ThemeContext.tsx` — imported by **5** files
- `src/services/authToken.ts` — imported by **5** files
- `src/components/ui/Tooltip.tsx` — imported by **5** files
- `src/tests/test-utils.tsx` — imported by **5** files
- `src/context/NotificationContext.tsx` — imported by **4** files
- `src/context/TutorialContext.tsx` — imported by **4** files
- `src/components/OrderPlaceModal.tsx` — imported by **4** files
- `src/utils/watchlist.ts` — imported by **4** files
- `src/utils/availabilityWindow.ts` — imported by **4** files
- `src/services/ai-engine/generators.ts` — imported by **4** files

## Import Map (who imports what)

- `src/types.ts` ← `src/App.tsx`, `src/components/BuyerMap.tsx`, `src/components/CommandCenter.tsx`, `src/components/DataAnalytics.tsx`, `src/components/Fleet.tsx` +59 more
- `src/hooks/useNamespace.ts` ← `src/components/ActivityFeed.tsx`, `src/components/BuyerMap.tsx`, `src/components/CommandCenter.tsx`, `src/components/Compliance.tsx`, `src/components/Fleet.tsx` +56 more
- `src/services/api.ts` ← `src/components/BuyerMap.tsx`, `src/components/CommandCenter.tsx`, `src/components/DataAnalytics.tsx`, `src/components/Fleet.tsx`, `src/components/ForwardCurve.tsx` +29 more
- `src/services/config.ts` ← `src/components/ActivityFeed.tsx`, `src/components/RFQPanel.tsx`, `src/components/ReferralsTab.tsx`, `src/components/Settings.tsx`, `src/components/rfq/RFQOfferAlert.tsx` +14 more
- `src/context/AuthContext.tsx` ← `src/App.tsx`, `src/components/Layout.tsx`, `src/components/Marketplace.tsx`, `src/components/MyTrades.tsx`, `src/components/RFQPanel.tsx` +11 more
- `src/context/CopilotContext.tsx` ← `src/components/BuyerMap.tsx`, `src/components/CommandCenter.tsx`, `src/components/Fleet.tsx`, `src/components/MarketTerminal.tsx`, `src/components/Marketplace.tsx` +3 more
- `src/i18n.ts` ← `src/components/LanguageSelector.tsx`, `src/components/public/LanguageRedirect.tsx`, `src/components/public/LegacyRedirect.tsx`, `src/components/public/PublicLanguageWrapper.tsx`, `src/components/public/PublicNav.tsx` +3 more
- `src/components/ui/VerdaxisSelect.tsx` ← `src/components/Marketplace.tsx`, `src/components/OrderPlaceModal.tsx`, `src/components/RFQPanel.tsx`, `src/components/SupplierListingConsole.tsx`, `src/components/TradeHistoryPage.tsx` +3 more
- `src/components/Toast.tsx` ← `src/App.tsx`, `src/components/ForwardCurve.tsx`, `src/components/MyTrades.tsx`, `src/components/PriceAlertManager.tsx`, `src/components/TradeHistoryPage.tsx` +1 more
- `src/utils/marketProduct.ts` ← `src/components/Marketplace.tsx`, `src/components/OrderBook.tsx`, `src/components/OrderPlaceModal.tsx`, `src/components/SupplierListingConsole.tsx`, `src/components/supplier/CreateListingModal.tsx` +1 more

---

# Test Coverage

> **2%** of routes and models are covered by tests
> 27 test files found

## Covered Routes

- POST:/api/auth/login
- GET:/api/ports
- GET:/

## Covered Models

- CIAdjustedPrice
- PortFuelAvailability

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_