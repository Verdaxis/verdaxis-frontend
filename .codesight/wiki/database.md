# Database

> **Navigation aid.** Schema shapes and field types extracted via AST. Read the actual schema source files before writing migrations or query logic.

**unknown** — 91 models

### AdminRejectBody

- `reason`: string _(required)_

### AggregatedOrderbookResponse

- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: string
- `fuel_type`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `region`: string
- `side`: OrderSide _(required)_
- `min_price`: string _(required)_
- `max_price`: string _(required)_
- `total_quantity`: string _(required)_
- `order_count`: integer _(required)_

### AlertCreate

- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: unknown
- `direction`: string _(required)_
- `threshold_usd`: unknown _(required)_

### AlertResponse

- `id`: string(uuid) _(required, uuid)_
- `org_id`: string(uuid) _(required, uuid)_
- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: unknown _(required)_
- `direction`: string _(required)_
- `threshold_usd`: string _(required)_
- `is_active`: boolean _(required)_
- `triggered_at`: unknown _(required)_
- `created_at`: string(date-time) _(required)_

### AuditLogResponse

- `id`: string(uuid) _(required, uuid)_
- `user_id`: unknown _(required)_
- `action`: string _(required)_
- `resource_type`: string _(required)_
- `resource_id`: unknown _(required)_
- `changes`: unknown _(required)_
- `ip_address`: unknown _(required)_
- `request_id`: unknown _(required)_
- `timestamp`: string(date-time) _(required)_

### Body_chat_api_ai_chat_post

- `message`: string _(required)_
- `history`: object[]

### Body_login_api_auth_login_post

- `grant_type`: unknown
- `username`: string _(required)_
- `password`: string(password) _(required)_
- `scope`: string
- `client_id`: unknown
- `client_secret`: undefined(password)

### Body_submit_kyc_api_kyc_submit_post

- `passport`: string _(required)_
- `company_doc`: string _(required)_

### Body_verify_document_api_compliance_verify_post

- `file`: string _(required)_

### CIAdjustedPrice

- `base_price_per_mt`: string _(required)_
- `carbon_intensity_gco2_mj`: string _(required)_
- `fueleu_ghg_intensity`: string _(required)_
- `compliance_cost_per_mt`: string _(required)_
- `effective_price_per_mt`: string _(required)_
- `ghg_reduction_pct`: string _(required)_

### CIIResponse

- `rating`: string _(required)_
- `score`: integer _(required)_

### CommissionResponse

- `id`: string(uuid) _(required, uuid)_
- `match_id`: string(uuid) _(required, uuid)_
- `amount_usd`: string _(required)_
- `status`: CommissionStatus _(required)_
- `invoice_number`: unknown
- `invoice_date`: unknown
- `payment_date`: unknown
- `created_at`: string(date-time) _(required)_

### CommissionSummary

- `total_pending_usd`: string _(required)_
- `total_invoiced_usd`: string _(required)_
- `total_paid_usd`: string _(required)_
- `pending_count`: integer _(required)_
- `invoiced_count`: integer _(required)_
- `paid_count`: integer _(required)_

### CommissionUpdate

- `status`: unknown
- `invoice_number`: unknown
- `invoice_date`: unknown
- `payment_date`: unknown
- `notes`: unknown

### ComplianceLedgerResponse

- `transaction_type`: string _(required)_
- `amount`: number _(required)_
- `currency`: string
- `units`: unknown
- `description`: unknown
- `reference_id`: unknown
- `id`: string(uuid) _(required, uuid)_
- `organization_id`: unknown
- `created_at`: string(date-time) _(required)_

### ComplianceScoreResponse

- `vessel_id`: string _(required)_
- `vessel_name`: string _(required)_
- `overall_score`: integer _(required)_
- `status`: string _(required)_
- `traffic_light`: string _(required)_
- `fueleu`: FuelEUResponse _(required)_
- `eu_ets`: EUETSResponse _(required)_
- `cii`: CIIResponse _(required)_
- `recommendations`: string[] _(required)_

### DailyStat

- `date`: string(date) _(required)_
- `orders_placed`: integer _(required)_
- `trades_executed`: integer _(required)_
- `volume_mt`: number _(required)_
- `gmv_usd`: number _(required)_
- `commission_usd`: number _(required)_

### DeliveryPointResponse

- `id`: string(uuid) _(required, uuid)_
- `name`: string _(required)_
- `region`: string _(required)_
- `timezone`: unknown
- `is_active`: boolean _(required)_

### DemandSignal

- `fuel_type`: string _(required)_
- `region`: string _(required)_
- `volume_mt`: string _(required)_
- `max_price_per_mt`: string _(required)_
- `urgency`: UrgencyLevel _(required)_
- `bid_count`: integer _(required)_
- `earliest_delivery`: string _(required)_
- `created_at`: string(date-time) _(required)_

### EUETSResponse

- `total_co2_tonnes`: string _(required)_
- `ets_price_per_tonne_eur`: string _(required)_
- `phase_in_pct`: string _(required)_
- `estimated_cost_eur`: string _(required)_
- `score`: integer _(required)_

### FleetComplianceSummary

- `total_vessels`: integer _(required)_
- `green_count`: integer _(required)_
- `amber_count`: integer _(required)_
- `red_count`: integer _(required)_
- `average_score`: number _(required)_
- `vessels`: ComplianceScoreResponse[] _(required)_

### FleetDemandEntry

- `fuel`: string _(required)_
- `ordered_vessels`: integer _(required)_
- `delivered_vessels`: integer _(required)_
- `avg_consumption_mt`: integer _(required)_
- `color`: string _(required)_

### FleetDemandResponse

- `entries`: FleetDemandEntry[] _(required)_
- `last_updated`: string _(required)_
- `sources`: string[] _(required)_

### ForgotPasswordRequest

- `email`: string _(required)_

### ForwardCurvePoint

- `availability_window`: string _(required)_
- `best_bid`: unknown
- `best_ask`: unknown
- `mid_price`: unknown
- `spread`: unknown
- `volume_mt`: string _(required)_
- `order_count`: integer _(required)_

### ForwardCurveResponse

- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: unknown
- `curve`: ForwardCurvePoint[] _(required)_
- `generated_at`: string(date-time) _(required)_

### FuelEUResponse

- `ghg_intensity_gco2_mj`: string _(required)_
- `target_intensity_gco2_mj`: string _(required)_
- `reduction_pct`: string _(required)_
- `compliance_balance_gco2`: string _(required)_
- `estimated_penalty_eur`: string _(required)_
- `score`: integer _(required)_

### HTTPValidationError

- `detail`: ValidationError[]

### InventoryCreate

- `port_id`: string _(required)_
- `fuel_type`: FuelType _(required)_
- `product_name`: unknown
- `current_stock_mt`: number _(required)_
- `incoming_stock_mt`: number
- `reserved_stock_mt`: number
- `price_per_mt_usd`: unknown
- `energy_density_mj_kg`: unknown
- `is_certified`: boolean

### InventoryItemUpdate

- `product_name`: unknown
- `current_stock_mt`: unknown
- `incoming_stock_mt`: unknown
- `price_per_mt_usd`: unknown

### InventoryResponse

- `port_id`: string _(required)_
- `fuel_type`: FuelType _(required)_
- `product_name`: unknown
- `current_stock_mt`: number _(required)_
- `incoming_stock_mt`: number
- `reserved_stock_mt`: number
- `price_per_mt_usd`: unknown
- `energy_density_mj_kg`: unknown
- `is_certified`: boolean
- `id`: string(uuid) _(required, uuid)_
- `supplier_id`: string(uuid) _(required, uuid)_
- `updated_at`: string(date-time) _(required)_

### LeaderboardEntry

- `rank`: integer _(required)_
- `user_name`: string _(required)_
- `organization_name`: unknown
- `referral_count`: integer _(required)_

### NegotiationCounterRequest

- `proposed_price`: unknown _(required)_
- `notes`: unknown

### NegotiationCreateRequest

- `bid_order_id`: unknown
- `ask_order_id`: unknown
- `counterparty_org_id`: string(uuid) _(required, uuid)_
- `product_id`: string(uuid) _(required, uuid)_
- `quantity_mt`: unknown _(required)_
- `proposed_price`: unknown _(required)_
- `notes`: unknown
- `expires_in_hours`: integer

### NegotiationListResponse

- `items`: NegotiationResponse[] _(required)_
- `total`: integer _(required)_

### NegotiationResponse

- `id`: string(uuid) _(required, uuid)_
- `bid_order_id`: unknown
- `ask_order_id`: unknown
- `initiator_org_id`: string(uuid) _(required, uuid)_
- `initiator_org_name`: unknown
- `counterparty_org_id`: string(uuid) _(required, uuid)_
- `counterparty_org_name`: unknown
- `initiator_side`: string _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: unknown
- `quantity_mt`: string _(required)_
- `current_price`: string _(required)_
- `status`: string _(required)_
- `last_actor_org_id`: string(uuid) _(required, uuid)_
- `trade_id`: unknown
- `expires_at`: string(date-time) _(required)_
- `created_at`: string(date-time) _(required)_
- `updated_at`: string(date-time) _(required)_
- `rounds`: NegotiationRoundResponse[]

### NegotiationRoundResponse

- `id`: string(uuid) _(required, uuid)_
- `round_number`: integer _(required)_
- `proposer_org_id`: string(uuid) _(required, uuid)_
- `proposer_org_name`: unknown
- `proposed_price`: string _(required)_
- `notes`: unknown
- `created_at`: string(date-time) _(required)_

### NotificationResponse

- `id`: string(uuid4) _(required)_
- `type`: string _(required)_
- `title`: string _(required)_
- `message`: string _(required)_
- `data`: unknown _(required)_
- `is_read`: boolean _(required)_
- `created_at`: string(date-time) _(required)_

### OrderCreate

- `side`: OrderSide _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `port_id`: unknown
- `vessel_id`: unknown
- `quantity_mt`: unknown _(required)_
- `price_per_mt_usd`: unknown _(required)_
- `availability_window`: string
- `certifications`: string[]
- `expires_at`: unknown
- `is_anonymous`: boolean

### OrderMyResponse

- `id`: string(uuid) _(required, uuid)_
- `side`: OrderSide _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: string
- `fuel_type`: string
- `fuel_grade`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `region`: string
- `port_id`: unknown
- `quantity_mt`: string _(required)_
- `remaining_quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `availability_window`: string _(required)_
- `certifications`: string[]
- `is_verdaxis_verified`: boolean _(required)_
- `tier_label`: TierLabel
- `status`: OrderBookStatus _(required)_
- `expires_at`: unknown
- `created_at`: string(date-time) _(required)_
- `carbon_intensity_gco2_mj`: unknown
- `is_crossed`: boolean
- `organization_id`: string(uuid) _(required, uuid)_
- `vessel_id`: unknown
- `updated_at`: string(date-time) _(required)_
- `trade_count`: integer

### OrderResponse

- `id`: string(uuid) _(required, uuid)_
- `side`: OrderSide _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: string
- `fuel_type`: string
- `fuel_grade`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `region`: string
- `port_id`: unknown
- `quantity_mt`: string _(required)_
- `remaining_quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `availability_window`: string _(required)_
- `certifications`: string[]
- `is_verdaxis_verified`: boolean _(required)_
- `tier_label`: TierLabel
- `status`: OrderBookStatus _(required)_
- `expires_at`: unknown
- `created_at`: string(date-time) _(required)_
- `carbon_intensity_gco2_mj`: unknown
- `is_crossed`: boolean

### OrderResponseWithCI

- `id`: string(uuid) _(required, uuid)_
- `side`: OrderSide _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: string
- `fuel_type`: string
- `fuel_grade`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `region`: string
- `port_id`: unknown
- `quantity_mt`: string _(required)_
- `remaining_quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `availability_window`: string _(required)_
- `certifications`: string[]
- `is_verdaxis_verified`: boolean _(required)_
- `tier_label`: TierLabel
- `status`: OrderBookStatus _(required)_
- `expires_at`: unknown
- `created_at`: string(date-time) _(required)_
- `carbon_intensity_gco2_mj`: unknown
- `is_crossed`: boolean
- `ci_adjusted_price`: unknown

### OrderUpdate

- `quantity_mt`: unknown
- `price_per_mt_usd`: unknown
- `availability_window`: unknown
- `certifications`: unknown
- `expires_at`: unknown

### OrganizationCreate

- `name`: string _(required)_
- `type`: OrgType _(required)_
- `tax_id`: unknown
- `country_code`: unknown

### OverviewResponse

- `total_users`: integer _(required)_
- `active_users_7d`: integer _(required)_
- `total_organizations`: integer _(required)_
- `total_orders`: integer _(required)_
- `open_orders`: integer _(required)_
- `total_trades`: integer _(required)_
- `confirmed_trades`: integer _(required)_
- `total_volume_mt`: number _(required)_
- `total_revenue_usd`: number _(required)_
- `total_gmv_usd`: number _(required)_

### PaginatedResponse_OrderResponse_

- `items`: OrderResponse[] _(required)_
- `total`: integer _(required)_
- `skip`: integer _(required)_
- `limit`: integer _(required)_

### PaginatedResponse_TradeResponse_

- `items`: TradeResponse[] _(required)_
- `total`: integer _(required)_
- `skip`: integer _(required)_
- `limit`: integer _(required)_

### PasswordChangeRequest

- `current_password`: string _(required)_
- `new_password`: string _(required)_

### PortFuelAvailability

- `port_id`: string _(required)_
- `port_name`: string _(required)_
- `lat`: number _(required)_
- `lng`: number _(required)_
- `fuel_type`: string _(required)_
- `total_stock_mt`: string _(required)_
- `supplier_count`: integer _(required)_
- `availability_level`: AvailabilityLevel _(required)_
- `avg_price_per_mt`: unknown

### PortIntelligenceBase

- `congestion_level`: unknown
- `methanol_price_avg`: unknown
- `biofuel_price_avg`: unknown
- `captured_at`: string(date-time) _(required)_

### PortResponse

- `id`: string _(required)_
- `name`: string _(required)_
- `country`: string _(required)_
- `location`: unknown
- `timezone`: unknown
- `is_active`: boolean
- `lat`: unknown
- `lng`: unknown
- `intelligence`: unknown

### PriceDiscoveryResponse

- `summaries`: PriceSummary[] _(required)_
- `generated_at`: string(date-time) _(required)_

### PriceSummary

- `product_id`: unknown
- `product_name`: string
- `fuel_type`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `region`: string
- `last_price`: unknown
- `avg_price_24h`: unknown
- `high_24h`: unknown
- `low_24h`: unknown
- `volume_24h`: string
- `trade_count_24h`: integer
- `price_change_pct`: unknown
- `last_trade_at`: unknown

### ProducerProjectResponse

- `id`: string(uuid) _(required, uuid)_
- `name`: string _(required)_
- `fuel_type`: string _(required)_
- `capacity_kt_per_year`: unknown
- `country`: string _(required)_
- `region`: unknown
- `lat`: unknown
- `lng`: unknown
- `cod_date`: unknown
- `cod_year`: unknown
- `status`: string _(required)_
- `data_source`: unknown
- `gena_project_id`: unknown
- `organization_id`: unknown
- `feedstock`: unknown
- `technology`: unknown
- `carbon_intensity_gco2_mj`: unknown
- `notes`: unknown
- `created_at`: string(date-time) _(required)_

### ProductResponse

- `id`: string(uuid) _(required, uuid)_
- `name`: string _(required)_
- `fuel_type`: string _(required)_
- `fuel_grade`: string _(required)_
- `unit`: string _(required)_
- `min_lot_size`: string _(required)_
- `is_active`: boolean _(required)_

### RFQCreateRequest

- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: unknown
- `quantity_mt`: unknown _(required)_
- `target_price_per_mt`: unknown
- `availability_window`: string
- `notes`: unknown
- `is_anonymous`: boolean
- `expires_in_hours`: integer

### RFQListResponse

- `items`: RFQResponse[] _(required)_
- `total`: integer _(required)_

### RFQQuoteRequest

- `price_per_mt_usd`: unknown _(required)_
- `notes`: unknown

### RFQQuoteResponse

- `id`: string(uuid) _(required, uuid)_
- `seller_org_id`: string(uuid) _(required, uuid)_
- `seller_org_name`: unknown
- `price_per_mt_usd`: string _(required)_
- `notes`: unknown
- `status`: string _(required)_
- `created_at`: string(date-time) _(required)_

### RFQResponse

- `id`: string(uuid) _(required, uuid)_
- `buyer_org_id`: string(uuid) _(required, uuid)_
- `buyer_org_name`: unknown
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: unknown
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `quantity_mt`: string _(required)_
- `target_price_per_mt`: unknown
- `availability_window`: string _(required)_
- `notes`: unknown
- `is_anonymous`: boolean _(required)_
- `status`: string _(required)_
- `expires_at`: string(date-time) _(required)_
- `created_at`: string(date-time) _(required)_
- `quote_count`: integer
- `quotes`: RFQQuoteResponse[]

### ReferencePriceItem

- `product_id`: unknown
- `product_name`: string
- `fuel_type`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `region`: string
- `vwap_usd`: string _(required)_
- `total_volume_mt`: string _(required)_
- `trade_count`: integer _(required)_
- `date`: string(date) _(required)_
- `visibility`: string

### ReferencePriceResponse

- `prices`: ReferencePriceItem[] _(required)_
- `generated_at`: string(date-time) _(required)_

### ReferralCodeResponse

- `referral_code`: string _(required)_
- `referral_link`: string _(required)_

### ReferralInviteRequest

- `email`: string(email) _(required)_

### ReferralListItem

- `organization_name`: unknown
- `role`: unknown
- `status`: string _(required)_
- `signed_up_at`: string(date-time) _(required)_

### ReferralStatsResponse

- `total`: integer _(required)_
- `verified`: integer _(required)_
- `active`: integer _(required)_
- `referrals`: ReferralListItem[] _(required)_

### RefreshRequest

- `refresh_token`: unknown

### RegisterWithOrgRequest

- `registration_token`: string _(required)_
- `organization`: OrganizationCreate _(required)_

### RegistrationResponse

- `status`: string _(required)_
- `user`: unknown
- `registration_token`: unknown

### ResendVerificationRequest

- `email`: string _(required)_

### ResetPasswordRequest

- `token`: string _(required)_
- `new_password`: string _(required)_

### ResolveCodeResponse

- `valid`: boolean _(required)_
- `organization_name`: unknown
- `organization_type`: unknown
- `referrer_name`: unknown

### ScenarioInput

- `vessel_id`: string _(required)_
- `fuel_mix`: object _(required)_
- `year`: integer

### SubscriptionResponse

- `id`: string(uuid) _(required, uuid)_
- `org_id`: string(uuid) _(required, uuid)_
- `tier`: SubscriptionTier _(required)_
- `started_at`: unknown
- `expires_at`: unknown
- `is_active`: boolean _(required)_

### SubscriptionUpdate

- `tier`: SubscriptionTier _(required)_

### SystemHealth

- `status`: string _(required)_
- `uptime_seconds`: number _(required)_
- `cpu_usage_pct`: number _(required)_
- `memory_usage_pct`: number _(required)_
- `disk_free_gb`: number _(required)_
- `disk_used_pct`: number _(required)_
- `platform`: string _(required)_

### Token

- `access_token`: string _(required)_
- `token_type`: string _(required)_

### TradeCreate

- `order_id`: string(uuid) _(required, uuid)_
- `quantity_mt`: unknown _(required)_

### TradeDeliverPayload

- `final_quantity_mt`: unknown _(required)_
- `final_price_per_mt`: unknown _(required)_

### TradeResponse

- `id`: string(uuid) _(required, uuid)_
- `bid_order_id`: unknown
- `ask_order_id`: unknown
- `buyer_id`: string(uuid) _(required, uuid)_
- `seller_id`: string(uuid) _(required, uuid)_
- `buyer_name`: string
- `seller_name`: string
- `initiated_by`: Initiator _(required)_
- `is_anonymous`: boolean
- `quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `status`: TradeStatus _(required)_
- `final_quantity_mt`: unknown
- `final_price_per_mt`: unknown
- `final_total_usd`: unknown
- `commission_rate_pct`: string
- `commission_amount_usd`: unknown
- `confirmed_at`: unknown
- `delivered_at`: unknown
- `paid_at`: unknown
- `created_at`: string(date-time) _(required)_
- `product_id`: unknown
- `product_name`: string
- `fuel_type`: string
- `fuel_grade`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `region`: string

### TradeTapeEntry

- `id`: string _(required)_
- `fuel_type`: string _(required)_
- `fuel_grade`: string _(required)_
- `region`: string _(required)_
- `quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `total_usd`: string _(required)_
- `confirmed_at`: string(date-time) _(required)_
- `availability_window`: string _(required)_

### TradeTapeResponse

- `items`: TradeTapeEntry[] _(required)_
- `total`: integer _(required)_
- `market_hours`: boolean _(required)_

### UserCreate

- `email`: string(email) _(required)_
- `first_name`: unknown
- `last_name`: unknown
- `role`: UserRole _(required)_
- `password`: string _(required)_
- `organization_id`: unknown
- `referral_code`: unknown

### UserResponse

- `email`: string(email) _(required)_
- `first_name`: unknown
- `last_name`: unknown
- `role`: UserRole _(required)_
- `id`: string(uuid) _(required, uuid)_
- `status`: UserStatus _(required)_
- `organization_id`: unknown
- `referral_code`: unknown

### UserUpdate

- `first_name`: unknown
- `last_name`: unknown
- `role`: unknown

### ValidationError

- `loc`: any[] _(required)_
- `msg`: string _(required)_
- `type`: string _(required)_
- `input`: unknown
- `ctx`: object

### VesselResponse

- `name`: string _(required)_
- `imo_number`: string _(required)_
- `vessel_type`: unknown
- `flag_state`: unknown
- `dwt`: unknown
- `cii_rating`: unknown
- `eu_ets_status`: unknown
- `fueleu_status`: unknown
- `current_location`: unknown
- `previous_location`: unknown
- `lat`: unknown
- `lng`: unknown
- `prev_lat`: unknown
- `prev_lng`: unknown
- `id`: string _(required)_
- `organization_id`: unknown
- `updated_at`: string(date-time) _(required)_

### WatchlistCreateRequest

- `name`: string _(required)_

### WatchlistEntryAddRequest

- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: unknown

### WatchlistEntryResponse

- `id`: string(uuid) _(required, uuid)_
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: unknown
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `created_at`: string(date-time) _(required)_

### WatchlistResponse

- `id`: string(uuid) _(required, uuid)_
- `name`: string _(required)_
- `entry_count`: integer
- `entries`: WatchlistEntryResponse[]
- `created_at`: string(date-time) _(required)_

## Schema Source Files

Search for ORM schema declarations:
- Drizzle: `pgTable` / `mysqlTable` / `sqliteTable`
- Prisma: `prisma/schema.prisma`
- TypeORM: `@Entity()` decorator
- SQLAlchemy: class inheriting `Base`

---
_Back to [overview.md](./overview.md)_