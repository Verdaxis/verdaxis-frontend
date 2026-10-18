/**
 * Readable names for the backend wire shapes the app uses most.
 *
 * Every alias resolves into `./generated/openapi`, which is generated from the
 * vendored `openapi.json`. Nothing here is imported at runtime: the module is
 * type-only, so it changes no bundle output. The hand-written interfaces in
 * `src/types.ts` stay the shapes components consume; `contract.test-d.ts`
 * compares the two and records every known difference.
 */

import type { components } from './generated/openapi';

type Schemas = components['schemas'];

// ─── Orders and the order book ──────────────────────────────────────

/** Public, anonymized order. The owner view is `WireOwnedOrder`. */
export type WireOrder = Schemas['OrderResponse'];
/** Owner view of an order: adds the organization, version and lifecycle fields. */
export type WireOwnedOrder = Schemas['OrderMyResponse'];
export type WireOrderPage = Schemas['PaginatedResponse_OrderResponse_'];
export type WireOrderBookSnapshot = Schemas['OrderBookSnapshotResponse'];
export type WireAggregatedOrderbook = Schemas['AggregatedOrderbookResponse'];
export type WireMapCompactMarket = Schemas['MapCompactMarketResponse'];
export type WireMapCompactSummary = Schemas['MapCompactSummaryResponse'];
export type WireMapSummary = Schemas['MapSummaryResponse'];
export type WireMapRecentAsk = Schemas['MapRecentAskResponse'];
export type WireOrderCreateInput = Schemas['OrderCreate-Input'];
export type WireOrderSide = Schemas['OrderSide'];
export type WireOrderBookStatus = Schemas['OrderBookStatus'];
export type WireOrderCreationMethod = Schemas['OrderCreationMethod'];

// ─── Trades ─────────────────────────────────────────────────────────

export type WireTrade = Schemas['TradeResponse'];
export type WireTradePage = Schemas['PaginatedResponse_TradeResponse_'];
export type WireTradeCreateInput = Schemas['TradeCreate'];
export type WireTradeStatus = Schemas['TradeStatus'];
export type WireTradeTapeEntry = Schemas['TradeTapeEntry'];
export type WireTradeTapeResponse = Schemas['TradeTapeResponse'];

// ─── Users ──────────────────────────────────────────────────────────

/** `/api/auth/me` and `LoginResponse.profile`. */
export type WireUser = Schemas['UserResponse'];
export type WireUserRole = Schemas['UserRole'];
export type WireUserStatus = Schemas['UserStatus'];
export type WireExecutionEligibility = Schemas['ExecutionEligibilityResponse'];

// ─── Prices ─────────────────────────────────────────────────────────

export type WirePriceSummary = Schemas['PriceSummary'];
export type WirePriceDiscovery = Schemas['PriceDiscoveryResponse'];
export type WireReferencePrice = Schemas['ReferencePriceResponse'];
export type WireReferencePriceItem = Schemas['ReferencePriceItem'];

// ─── Catalog ────────────────────────────────────────────────────────

export type WireProduct = Schemas['ProductResponse'];
export type WireDeliveryPoint = Schemas['DeliveryPointResponse'];
export type WireInventoryItem = Schemas['InventoryResponse'];
export type WirePort = Schemas['PortResponse'];

// ─── Forward curve ──────────────────────────────────────────────────

export type WireForwardCurve = Schemas['ForwardCurveResponse'];
export type WireForwardCurvePoint = Schemas['ForwardCurvePoint'];
export type WireForwardCurveBoard = Schemas['ForwardCurveBoardResponse'];
export type WireForwardCurveBoardCell = Schemas['ForwardCurveBoardCell'];
export type WireForwardCurveBoardDepthLevel = Schemas['ForwardCurveBoardDepthLevel'];
export type WireForwardCurveBoardIndication = Schemas['ForwardCurveBoardIndication'];
export type WireForwardCurveBoardIndicationSummary = Schemas['ForwardCurveBoardIndicationSummary'];
export type WireForwardCurveBoardFairPriceBand = Schemas['ForwardCurveBoardFairPriceBand'];
export type WireForwardCurveBoardPhysicalStem = Schemas['ForwardCurveBoardPhysicalStem'];
export type WireForwardCurveBoardPhysicalStemSummary = Schemas['ForwardCurveBoardPhysicalStemSummary'];
export type WireForwardCurveBoardPort = Schemas['ForwardCurveBoardPort'];
export type WireForwardCurveBoardFocus = Schemas['ForwardCurveBoardFocus'];
export type WireForwardCurveMarketCell = Schemas['ForwardCurveMarketCell'];
export type WireForwardCurveTableRow = Schemas['ForwardCurveTableRow'];
export type WireForwardCurveTable = Schemas['ForwardCurveTableResponse'];
export type WireForwardCurveLatestSignal = Schemas['ForwardCurveLatestSignal'];
export type WireForwardCurveSlice = Schemas['ForwardCurveSliceResponse'];
export type WireForwardCurveSliceTrade = Schemas['ForwardCurveSliceTrade'];
export type WireForwardCurveSliceEvidencePoint = Schemas['ForwardCurveSliceEvidencePoint'];

// ─── Watchlists ─────────────────────────────────────────────────────

export type WireWatchlistTarget = Schemas['WatchlistTargetResponse'];
export type WireWatchlistEvent = Schemas['WatchlistEventResponse'];
export type WireWatchlistEventsPage = Schemas['WatchlistEventsPageResponse'];
export type WireWatchlistSummary = Schemas['WatchlistSummaryResponse'];
export type WireWatchlistDetail = Schemas['WatchlistDetailResponse'];

// ─── Notifications ──────────────────────────────────────────────────

export type WireNotification = Schemas['NotificationResponse'];

// ─── Market provenance vocabulary ───────────────────────────────────

export type WireMarketProduct = Schemas['MarketProduct'];
export type WireMarketSourceKind = Schemas['MarketSourceKind'];
export type WireMarketScope = Schemas['MarketScope'];
export type WireMarketDemoStatus = Schemas['MarketDemoStatus'];
export type WireTierLabel = Schemas['TierLabel'];
