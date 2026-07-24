# Openapi.json

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Openapi.json subsystem handles **98 routes**.

## Routes

- `GET` `/api/ports` → out: PortResponse[]
  `openapi.json`
- `GET` `/api/ports/:port_id` params(port_id) → out: PortResponse
  `openapi.json`
- `GET` `/api/vessels` → out: VesselResponse[]
  `openapi.json`
- `GET` `/api/vessels/:vessel_id` params(vessel_id) → out: VesselResponse
  `openapi.json`
- `GET` `/api/inventory` → out: InventoryResponse[]
  `openapi.json`
- `POST` `/api/inventory` → in: InventoryCreate, out: InventoryResponse
  `openapi.json`
- `PATCH` `/api/inventory/:item_id` params(item_id) → in: InventoryItemUpdate, out: InventoryResponse
  `openapi.json`
- `DELETE` `/api/inventory/:item_id` params(item_id)
  `openapi.json`
- `POST` `/api/inventory/:item_id/publish` params(item_id)
  `openapi.json`
- `GET` `/api/listings`
  `openapi.json`
- `GET` `/api/listings/my`
  `openapi.json`
- `POST` `/api/ai/chat` → in: AIChatRequest
  `openapi.json`
- `GET` `/api/notifications` → out: NotificationResponse[] [notifications]
  `openapi.json`
- `GET` `/api/notifications/unread-count` [notifications]
  `openapi.json`
- `PATCH` `/api/notifications/:notification_id/read` params(notification_id) [notifications]
  `openapi.json`
- `PATCH` `/api/notifications/read-all` [notifications]
  `openapi.json`
- `GET` `/api/users/me/preferences` [preferences]
  `openapi.json`
- `PUT` `/api/users/me/preferences/:namespace` params(namespace) [preferences]
  `openapi.json`
- `GET` `/api/orderbook/bids` → out: PaginatedResponse_OrderResponse_ [orderbook]
  `openapi.json`
- `GET` `/api/orderbook/asks` → out: PaginatedResponse_OrderResponse_ [orderbook]
  `openapi.json`
- `GET` `/api/orderbook/with-ci` → out: OrderResponseWithCI[] [orderbook]
  `openapi.json`
- `GET` `/api/orderbook/my` → out: OrderMyResponse[] [orderbook]
  `openapi.json`
- `GET` `/api/orderbook/my/latest-ask-template` [orderbook]
  `openapi.json`
- `GET` `/api/orderbook/aggregated` → out: AggregatedOrderbookResponse[] [orderbook]
  `openapi.json`
- `GET` `/api/orderbook/products` → out: array [orderbook]
  `openapi.json`
- `GET` `/api/orderbook/regions` → out: array [orderbook]
  `openapi.json`
- `GET` `/api/orderbook/fuel-types` → out: array [orderbook]
  `openapi.json`
- `GET` `/api/orderbook` → out: OrderResponse[] [orderbook]
  `openapi.json`
- `POST` `/api/orderbook` → in: OrderCreate-Input, out: OrderResponse [orderbook]
  `openapi.json`
- `PUT` `/api/orderbook/:order_id` params(order_id) → in: OrderUpdate, out: OrderResponse [orderbook]
  `openapi.json`
- `DELETE` `/api/orderbook/:order_id` params(order_id) [orderbook]
  `openapi.json`
- `POST` `/api/trades/` → in: TradeCreate, out: TradeResponse [trades]
  `openapi.json`
- `GET` `/api/trades/my` → out: PaginatedResponse_TradeResponse_ [trades]
  `openapi.json`
- `PUT` `/api/trades/:trade_id/decline` params(trade_id) → out: TradeResponse [trades]
  `openapi.json`
- `PUT` `/api/trades/:trade_id/deliver` params(trade_id) → in: TradeDeliverPayload, out: TradeResponse [trades]
  `openapi.json`
- `POST` `/api/trades/:trade_id/pay` params(trade_id) → out: TradeResponse [trades]
  `openapi.json`
- `GET` `/api/prices` → out: PriceDiscoveryResponse [price-discovery]
  `openapi.json`
- `GET` `/api/prices/reference` → out: ReferencePriceResponse [price-discovery]
  `openapi.json`
- `GET` `/api/prices/reference/export` [price-discovery]
  `openapi.json`
- `GET` `/api/matchmaking/suggestions` [matchmaking]
  `openapi.json`
- `PATCH` `/api/matchmaking/suggestions/:order_id/dismiss` params(order_id) [matchmaking]
  `openapi.json`
- `GET` `/api/producers` → out: ProducerProjectResponse[] [producers]
  `openapi.json`
- `GET` `/api/availability` → out: PortFuelAvailability[] [availability]
  `openapi.json`
- `GET` `/api/demand` → out: DemandSignal[] [demand]
  `openapi.json`
- `GET` `/api/stream/prices` [real-time]
  `openapi.json`
- `GET` `/api/stream/orderbook` [real-time]
  `openapi.json`
- `GET` `/api/stream/trades` [real-time]
  `openapi.json`
- `GET` `/api/compliance/vessels/:vessel_id/score` params(vessel_id) → out: ComplianceScoreResponse [compliance]
  `openapi.json`
- `GET` `/api/compliance/fleet` → out: FleetComplianceSummary [compliance]
  `openapi.json`
- `POST` `/api/compliance/scenario` → in: ScenarioInput, out: ComplianceScoreResponse [compliance]
  `openapi.json`
- `POST` `/api/compliance/pricing-overlay` → in: PricingOverlayRequest, out: PricingOverlayResponse [compliance]
  `openapi.json`
- `GET` `/api/compliance/fuels` → out: object [compliance]
  `openapi.json`
- `POST` `/api/kyc/submit` [kyc]
  `openapi.json`
- `GET` `/api/kyc/status` [kyc]
  `openapi.json`
- `GET` `/api/catalog/products` → out: ProductResponse[] [catalog]
  `openapi.json`
- `GET` `/api/catalog/delivery-points` → out: DeliveryPointResponse[] [catalog]
  `openapi.json`
- `GET` `/api/curves/forward/table` → out: ForwardCurveTableResponse [forward-curve]
  `openapi.json`
- `GET` `/api/curves/forward/slice` → out: ForwardCurveSliceResponse [forward-curve]
  `openapi.json`
- `GET` `/api/curves/forward/board` → out: ForwardCurveBoardResponse [forward-curve]
  `openapi.json`
- `GET` `/api/curves/forward` → out: ForwardCurveResponse [forward-curve]
  `openapi.json`
- `GET` `/api/curves/forward/export` [forward-curve]
  `openapi.json`
- `GET` `/api/alerts` → out: AlertResponse[] [alerts]
  `openapi.json`
- `POST` `/api/alerts` → in: AlertCreate, out: AlertResponse [alerts]
  `openapi.json`
- `DELETE` `/api/alerts/:alert_id` params(alert_id) [alerts]
  `openapi.json`
- `GET` `/api/stream/activity` [real-time]
  `openapi.json`
- `GET` `/api/subscriptions/me` → out: SubscriptionResponse [subscriptions]
  `openapi.json`
- `GET` `/api/referrals/my-code` → out: ReferralCodeResponse [referrals]
  `openapi.json`
- `GET` `/api/referrals/my-referrals` → out: ReferralStatsResponse [referrals]
  `openapi.json`
- `GET` `/api/referrals/leaderboard` → out: LeaderboardEntry[] [referrals]
  `openapi.json`
- `POST` `/api/referrals/invite` → in: ReferralInviteRequest [referrals]
  `openapi.json`
- `GET` `/api/referrals/resolve/:code` params(code) → out: ResolveCodeResponse [referrals]
  `openapi.json`
- `GET` `/api/trade-tape` → out: TradeTapeResponse [trade-tape]
  `openapi.json`
- `GET` `/api/watchlists` → out: WatchlistResponse[] [watchlists]
  `openapi.json`
- `POST` `/api/watchlists` → in: WatchlistCreateRequest, out: WatchlistResponse [watchlists]
  `openapi.json`
- `GET` `/api/watchlists/me` → out: WatchlistSummaryResponse [watchlists]
  `openapi.json`
- `GET` `/api/watchlists/:watchlist_id` params(watchlist_id) → out: WatchlistDetailResponse [watchlists]
  `openapi.json`
- `DELETE` `/api/watchlists/:watchlist_id` params(watchlist_id) [watchlists]
  `openapi.json`
- `POST` `/api/watchlists/:watchlist_id/targets` params(watchlist_id) → out: WatchlistTargetResponse [watchlists]
  `openapi.json`
- `DELETE` `/api/watchlists/:watchlist_id/targets/:target_id` params(watchlist_id, target_id) [watchlists]
  `openapi.json`
- `GET` `/api/watchlists/:watchlist_id/events` params(watchlist_id) → out: WatchlistEventsPageResponse [watchlists]
  `openapi.json`
- `PATCH` `/api/watchlists/:watchlist_id/events/:event_id` params(watchlist_id, event_id) → out: WatchlistEventResponse [watchlists]
  `openapi.json`
- `POST` `/api/watchlists/:watchlist_id/entries` params(watchlist_id) → in: WatchlistEntryAddRequest, out: WatchlistEntryResponse [watchlists]
  `openapi.json`
- `DELETE` `/api/watchlists/:watchlist_id/entries/:entry_id` params(watchlist_id, entry_id) [watchlists]
  `openapi.json`
- `GET` `/api/rfq` → out: RFQListResponse [rfq]
  `openapi.json`
- `POST` `/api/rfq` → in: RFQCreateRequest, out: RFQResponse [rfq]
  `openapi.json`
- `GET` `/api/rfq/:rfq_id` params(rfq_id) → out: RFQResponse [rfq]
  `openapi.json`
- `POST` `/api/rfq/:rfq_id/quote` params(rfq_id) → in: RFQQuoteRequest, out: RFQQuoteResponse [rfq]
  `openapi.json`
- `POST` `/api/rfq/:rfq_id/accept/:quote_id` params(rfq_id, quote_id) → out: RFQQuoteResponse [rfq]
  `openapi.json`
- `POST` `/api/rfq/:rfq_id/cancel` params(rfq_id) [rfq]
  `openapi.json`
- `GET` `/api/negotiations` → out: NegotiationListResponse [negotiations]
  `openapi.json`
- `POST` `/api/negotiations` → in: NegotiationCreateRequest, out: NegotiationResponse [negotiations]
  `openapi.json`
- `GET` `/api/negotiations/:negotiation_id` params(negotiation_id) → out: NegotiationResponse [negotiations]
  `openapi.json`
- `POST` `/api/negotiations/:negotiation_id/counter` params(negotiation_id) → in: NegotiationCounterRequest, out: NegotiationResponse [negotiations]
  `openapi.json`
- `POST` `/api/negotiations/:negotiation_id/accept` params(negotiation_id) → out: NegotiationResponse [negotiations]
  `openapi.json`
- `POST` `/api/negotiations/:negotiation_id/decline` params(negotiation_id) → out: NegotiationResponse [negotiations]
  `openapi.json`
- `GET` `/api/news` [news]
  `openapi.json`
- `GET` `/api/fleet-intelligence` → out: FleetDemandResponse [fleet-intelligence]
  `openapi.json`
- `GET` `/api/benchmarks` → out: BenchmarkQuoteResponse [benchmarks]
  `openapi.json`

## Source Files

Read these before implementing or modifying this subsystem:
- `openapi.json`

---
_Back to [overview.md](./overview.md)_