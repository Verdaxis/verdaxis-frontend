# Openapi.json

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Openapi.json subsystem handles **25 routes**.

## Routes

- `GET` `/api/ports` → out: PortResponse[]
  `openapi.json`
- `GET` `/api/ports/:port_id` params(port_id) → out: PortResponse
  `openapi.json`
- `GET` `/api/vessels` → out: VesselResponse[]
  `openapi.json`
- `GET` `/api/vessels/:vessel_id` params(vessel_id) → out: VesselResponse
  `openapi.json`
- `GET` `/api/quotes` → out: QuoteResponse[]
  `openapi.json`
- `POST` `/api/quotes` → in: QuoteCreate, out: QuoteResponse
  `openapi.json`
- `PATCH` `/api/quotes/:quote_id` params(quote_id) → in: QuoteUpdate, out: QuoteResponse
  `openapi.json`
- `GET` `/api/inventory` → out: InventoryResponse[]
  `openapi.json`
- `POST` `/api/inventory` → in: InventoryCreate, out: InventoryResponse
  `openapi.json`
- `GET` `/api/compliance/ledger` → out: ComplianceLedgerResponse[]
  `openapi.json`
- `POST` `/api/ai/chat` → in: Body_chat_api_ai_chat_post
  `openapi.json`
- `GET` `/api/listings` → out: PublicListingResponse[] [listings]
  `openapi.json`
- `POST` `/api/listings` → in: PublicListingCreate, out: PublicListingResponse [listings]
  `openapi.json`
- `GET` `/api/listings/aggregated` → out: AggregatedListingResponse[] [listings]
  `openapi.json`
- `GET` `/api/listings/my` → out: PublicListingSupplierResponse[] [listings]
  `openapi.json`
- `GET` `/api/listings/:listing_id` params(listing_id) → out: PublicListingResponse [listings]
  `openapi.json`
- `PUT` `/api/listings/:listing_id` params(listing_id) → in: PublicListingUpdate, out: PublicListingResponse [listings]
  `openapi.json`
- `DELETE` `/api/listings/:listing_id` params(listing_id) [listings]
  `openapi.json`
- `GET` `/api/listings/regions/list` → out: array [listings]
  `openapi.json`
- `GET` `/api/listings/fuel-types/list` → out: array [listings]
  `openapi.json`
- `POST` `/api/rfq/request` → in: RFQRequestCreate, out: RFQMatchResponse [rfq]
  `openapi.json`
- `GET` `/api/rfq/my-requests` → out: RFQMatchDetailResponse[] [rfq]
  `openapi.json`
- `GET` `/api/rfq/incoming` → out: RFQMatchDetailResponse[] [rfq]
  `openapi.json`
- `PUT` `/api/rfq/:match_id/respond` params(match_id) → in: RFQMatchUpdate, out: RFQMatchResponse [rfq]
  `openapi.json`
- `PUT` `/api/rfq/:match_id/complete` params(match_id) → in: RFQMatchComplete, out: RFQMatchResponse [rfq]
  `openapi.json`

## Source Files

Read these before implementing or modifying this subsystem:
- `openapi.json`

---
_Back to [overview.md](./overview.md)_