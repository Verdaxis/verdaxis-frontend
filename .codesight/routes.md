# Routes

## CRUD Resources

- **`/api/quotes`** GET | POST | GET/:id | PATCH/:id → Quote
- **`/api/listings`** GET | POST | GET/:id | PUT/:id | DELETE/:id → Listing

## Other Routes

- `PUT` `/api/auth/approve/:user_id` params(user_id) → out: UserResponse [auth]
- `GET` `/api/auth/me` → out: UserResponse [auth]
- `PUT` `/api/auth/switch-role/:target_role` params(target_role) → out: Token [auth]
- `GET` `/api/ports` → out: PortResponse[] ✓
- `GET` `/api/ports/:port_id` params(port_id) → out: PortResponse
- `GET` `/api/vessels` → out: VesselResponse[]
- `GET` `/api/vessels/:vessel_id` params(vessel_id) → out: VesselResponse
- `GET` `/api/inventory` → out: InventoryResponse[]
- `POST` `/api/inventory` → in: InventoryCreate, out: InventoryResponse
- `GET` `/api/compliance/ledger` → out: ComplianceLedgerResponse[]
- `POST` `/api/compliance/verify`
- `POST` `/api/ai/chat` → in: Body_chat_api_ai_chat_post
- `GET` `/api/listings/aggregated` → out: AggregatedListingResponse[] [listings]
- `GET` `/api/listings/my` → out: PublicListingSupplierResponse[] [listings]
- `GET` `/api/listings/regions/list` → out: array [listings]
- `GET` `/api/listings/fuel-types/list` → out: array [listings]
- `POST` `/api/rfq/request` → in: RFQRequestCreate, out: RFQMatchResponse [rfq]
- `GET` `/api/rfq/my-requests` → out: RFQMatchDetailResponse[] [rfq]
- `GET` `/api/rfq/incoming` → out: RFQMatchDetailResponse[] [rfq]
- `PUT` `/api/rfq/:match_id/respond` params(match_id) → in: RFQMatchUpdate, out: RFQMatchResponse [rfq]
- `PUT` `/api/rfq/:match_id/complete` params(match_id) → in: RFQMatchComplete, out: RFQMatchResponse [rfq]
- `GET` `/api/rfq/admin/commissions` → out: CommissionResponse[] [rfq]
- `GET` `/api/rfq/admin/commissions/summary` → out: CommissionSummary [rfq]
- `PUT` `/api/rfq/admin/commissions/:commission_id` params(commission_id) → in: CommissionUpdate, out: CommissionResponse [rfq]
- `GET` `/` ✓
- `GET` `/health`
