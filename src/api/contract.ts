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
export type WireOrderCreateInput = Schemas['OrderCreate-Input'];
export type WireOrderSide = Schemas['OrderSide'];
export type WireOrderBookStatus = Schemas['OrderBookStatus'];
export type WireOrderCreationMethod = Schemas['OrderCreationMethod'];

// ─── Trades ─────────────────────────────────────────────────────────

export type WireTrade = Schemas['TradeResponse'];
export type WireTradePage = Schemas['PaginatedResponse_TradeResponse_'];
export type WireTradeCreateInput = Schemas['TradeCreate'];
export type WireTradeStatus = Schemas['TradeStatus'];

// ─── Users ──────────────────────────────────────────────────────────

/** `/api/auth/me` and `LoginResponse.profile`. */
export type WireUser = Schemas['UserResponse'];
export type WireUserRole = Schemas['UserRole'];
export type WireUserStatus = Schemas['UserStatus'];
export type WireExecutionEligibility = Schemas['ExecutionEligibilityResponse'];

// ─── Prices ─────────────────────────────────────────────────────────

export type WirePriceSummary = Schemas['PriceSummary'];
export type WirePriceDiscovery = Schemas['PriceDiscoveryResponse'];

// ─── Catalog ────────────────────────────────────────────────────────

export type WireProduct = Schemas['ProductResponse'];
export type WireDeliveryPoint = Schemas['DeliveryPointResponse'];

// ─── Notifications ──────────────────────────────────────────────────

export type WireNotification = Schemas['NotificationResponse'];

// ─── Market provenance vocabulary ───────────────────────────────────

export type WireMarketProduct = Schemas['MarketProduct'];
export type WireMarketSourceKind = Schemas['MarketSourceKind'];
export type WireMarketScope = Schemas['MarketScope'];
export type WireMarketDemoStatus = Schemas['MarketDemoStatus'];
export type WireTierLabel = Schemas['TierLabel'];
