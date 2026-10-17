/**
 * Compile-time contract test: the hand-written interfaces in `src/types.ts` and
 * `src/context/AuthContext.tsx` against the generated wire shapes in
 * `./contract`.
 *
 * This file is type checked, never executed (its name does not match the Vitest
 * `include` patterns), and it imports nothing at runtime. Every assertion below
 * pins the *current* state of the code, including the known differences recorded
 * in `docs/refactor/api-type-drift.md`. A change to either side therefore fails
 * `npm run typecheck` (the TypeScript 7 native checker, which CI runs), which is
 * the signal to update the drift record and the step 5b migration plan together.
 * DRIFT ids match that document.
 */

import { expectTypeOf } from 'vitest';
import type { AggregatedOrderbook, AvailabilityWindow, DeliveryPoint, ExecutionEligibility, MapCompactMarket, MarketProduct, MarketSourceKind, Notification, OrderBookOrder, OrderCreateInput, PriceSummary, Product, Trade } from '../types';
import {
    toAggregatedOrderbook,
    toMapCompactMarket,
    toOrderBookOrder,
    toProduct,
    toTrade,
} from './mappers';
import type { User } from '../context/AuthContext';
import type { PaginatedResult } from '../services/api';
import type {
    WireAggregatedOrderbook,
    WireDeliveryPoint,
    WireExecutionEligibility,
    WireMapCompactMarket,
    WireMarketDemoStatus,
    WireMarketScope,
    WireMarketSourceKind,
    WireNotification,
    WireOrder,
    WireOrderCreateInput,
    WireOrderCreationMethod,
    WireOwnedOrder,
    WirePriceSummary,
    WireProduct,
    WireTrade,
    WireUser,
    WireUserRole,
    WireUserStatus,
} from './contract';

/** True when `K` is a declared key of `T`. */
type HasProperty<T, K extends PropertyKey> = K extends keyof T ? true : false;
/** True when `Member` is assignable to `Union`, that is, it is one of its members. */
type HasMember<Union, Member> = Member extends Union ? true : false;

// ─── Decimals: converted once, at the boundary ─────────────────────
// DRIFT-1 is resolved by the mappers in `./mappers`, not by a type change: the
// wire still spells a decimal as a JSON string, and the app types still declare
// `number`. The pins below hold both sides of that contract, plus the mapper
// that joins them, so a change to either side still fails here.

expectTypeOf<WireOrder['quantity_mt']>().toEqualTypeOf<string>();
expectTypeOf<WireOrder['remaining_quantity_mt']>().toEqualTypeOf<string>();
expectTypeOf<WireOrder['price_per_mt_usd']>().toEqualTypeOf<string>();
expectTypeOf<WireOrder['carbon_intensity_gco2_mj']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WireOrder['benchmark_price_per_mt_usd']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WireOrder['premium_discount_per_mt_usd']>().toEqualTypeOf<string | null | undefined>();

expectTypeOf<OrderBookOrder['quantity_mt']>().toEqualTypeOf<number>();
expectTypeOf<OrderBookOrder['remaining_quantity_mt']>().toEqualTypeOf<number>();
expectTypeOf<OrderBookOrder['price_per_mt_usd']>().toEqualTypeOf<number>();
expectTypeOf<OrderBookOrder['carbon_intensity_gco2_mj']>().toEqualTypeOf<number | null | undefined>();
expectTypeOf<OrderBookOrder['benchmark_price_per_mt_usd']>().toEqualTypeOf<number | null | undefined>();
expectTypeOf<OrderBookOrder['premium_discount_per_mt_usd']>().toEqualTypeOf<number | null | undefined>();
expectTypeOf<typeof toOrderBookOrder>().parameter(0).toEqualTypeOf<WireOrder>();
expectTypeOf<typeof toOrderBookOrder>().returns.toEqualTypeOf<OrderBookOrder>();

expectTypeOf<WireTrade['quantity_mt']>().toEqualTypeOf<string>();
expectTypeOf<WireTrade['price_per_mt_usd']>().toEqualTypeOf<string>();
expectTypeOf<WireTrade['final_quantity_mt']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WireTrade['final_price_per_mt']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WireTrade['final_total_usd']>().toEqualTypeOf<string | null | undefined>();

expectTypeOf<Trade['quantity_mt']>().toEqualTypeOf<number>();
expectTypeOf<Trade['price_per_mt_usd']>().toEqualTypeOf<number>();
expectTypeOf<Trade['final_quantity_mt']>().toEqualTypeOf<number | null | undefined>();
expectTypeOf<Trade['final_price_per_mt']>().toEqualTypeOf<number | null | undefined>();
expectTypeOf<Trade['final_total_usd']>().toEqualTypeOf<number | null | undefined>();
expectTypeOf<typeof toTrade>().parameter(0).toEqualTypeOf<WireTrade>();
expectTypeOf<typeof toTrade>().returns.toEqualTypeOf<Trade>();

expectTypeOf<WirePriceSummary['last_price']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WirePriceSummary['avg_price_24h']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WirePriceSummary['high_24h']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WirePriceSummary['low_24h']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WirePriceSummary['price_change_pct']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WirePriceSummary['volume_24h']>().toEqualTypeOf<string>();

expectTypeOf<PriceSummary['last_price']>().toEqualTypeOf<number | null>();
expectTypeOf<PriceSummary['avg_price_24h']>().toEqualTypeOf<number | null>();
expectTypeOf<PriceSummary['high_24h']>().toEqualTypeOf<number | null>();
expectTypeOf<PriceSummary['low_24h']>().toEqualTypeOf<number | null>();
expectTypeOf<PriceSummary['price_change_pct']>().toEqualTypeOf<number | null>();
expectTypeOf<PriceSummary['volume_24h']>().toEqualTypeOf<number>();

expectTypeOf<WireProduct['min_lot_size']>().toEqualTypeOf<string>();
expectTypeOf<Product['min_lot_size']>().toEqualTypeOf<number>();
expectTypeOf<typeof toProduct>().parameter(0).toEqualTypeOf<WireProduct>();
expectTypeOf<typeof toProduct>().returns.toEqualTypeOf<Product>();

// The create payload accepts either form on the wire; the frontend sends numbers.
expectTypeOf<WireOrderCreateInput['quantity_mt']>().toEqualTypeOf<number | string>();
expectTypeOf<WireOrderCreateInput['price_per_mt_usd']>().toEqualTypeOf<number | string>();
expectTypeOf<OrderCreateInput['quantity_mt']>().toEqualTypeOf<number>();
expectTypeOf<OrderCreateInput['price_per_mt_usd']>().toEqualTypeOf<number>();

expectTypeOf<WireAggregatedOrderbook['min_price']>().toEqualTypeOf<string>();
expectTypeOf<WireAggregatedOrderbook['max_price']>().toEqualTypeOf<string>();
expectTypeOf<WireAggregatedOrderbook['total_quantity']>().toEqualTypeOf<string>();
expectTypeOf<AggregatedOrderbook['min_price']>().toEqualTypeOf<number>();
expectTypeOf<AggregatedOrderbook['max_price']>().toEqualTypeOf<number>();
expectTypeOf<AggregatedOrderbook['total_quantity']>().toEqualTypeOf<number>();
expectTypeOf<typeof toAggregatedOrderbook>().parameter(0).toEqualTypeOf<WireAggregatedOrderbook>();
expectTypeOf<typeof toAggregatedOrderbook>().returns.toEqualTypeOf<AggregatedOrderbook>();

expectTypeOf<WireMapCompactMarket['bid_min_price']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WireMapCompactMarket['bid_total_quantity']>().toEqualTypeOf<string>();
expectTypeOf<MapCompactMarket['bid_min_price']>().toEqualTypeOf<number | null>();
expectTypeOf<MapCompactMarket['bid_total_quantity']>().toEqualTypeOf<number>();
expectTypeOf<typeof toMapCompactMarket>().parameter(0).toEqualTypeOf<WireMapCompactMarket>();
expectTypeOf<typeof toMapCompactMarket>().returns.toEqualTypeOf<MapCompactMarket>();

// ─── DRIFT-4: owner-view fields folded into the public interface ───
// `OrderResponse` carries no ownership fields; `OrderMyResponse` adds them as
// required. The frontend has one interface with all of them optional, so code
// cannot tell which view it holds.

expectTypeOf<HasProperty<WireOrder, 'organization_id'>>().toEqualTypeOf<false>();
expectTypeOf<HasProperty<WireOrder, 'trade_count'>>().toEqualTypeOf<false>();
expectTypeOf<HasProperty<WireOrder, 'etag'>>().toEqualTypeOf<false>();
expectTypeOf<HasProperty<WireOrder, 'updated_at'>>().toEqualTypeOf<false>();
expectTypeOf<HasProperty<WireOrder, 'vessel_id'>>().toEqualTypeOf<false>();

expectTypeOf<HasProperty<WireOwnedOrder, 'organization_id'>>().toEqualTypeOf<true>();
expectTypeOf<HasProperty<WireOwnedOrder, 'trade_count'>>().toEqualTypeOf<true>();
expectTypeOf<HasProperty<WireOwnedOrder, 'etag'>>().toEqualTypeOf<true>();
expectTypeOf<HasProperty<WireOwnedOrder, 'updated_at'>>().toEqualTypeOf<true>();
expectTypeOf<HasProperty<WireOwnedOrder, 'vessel_id'>>().toEqualTypeOf<true>();

expectTypeOf<WireOwnedOrder['organization_id']>().toEqualTypeOf<string>();
expectTypeOf<WireOwnedOrder['trade_count']>().toEqualTypeOf<number>();
expectTypeOf<WireOwnedOrder['updated_at']>().toEqualTypeOf<string>();
expectTypeOf<WireOwnedOrder['etag']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WireOwnedOrder['vessel_id']>().toEqualTypeOf<string | null | undefined>();

expectTypeOf<OrderBookOrder['organization_id']>().toEqualTypeOf<string | undefined>();
expectTypeOf<OrderBookOrder['trade_count']>().toEqualTypeOf<number | undefined>();
expectTypeOf<OrderBookOrder['updated_at']>().toEqualTypeOf<string | undefined>();
expectTypeOf<OrderBookOrder['etag']>().toEqualTypeOf<string | undefined>();
expectTypeOf<OrderBookOrder['vessel_id']>().toEqualTypeOf<string | undefined>();

// ─── DRIFT-5: the `User` profile ───────────────────────────────────
// `email_verified` is not on `UserResponse` at all; `/auth/me` can never set it.
// `referral_code` is on the wire and missing from the frontend type.

expectTypeOf<HasProperty<WireUser, 'email_verified'>>().toEqualTypeOf<false>();
expectTypeOf<HasProperty<User, 'email_verified'>>().toEqualTypeOf<true>();
expectTypeOf<User['email_verified']>().toEqualTypeOf<boolean | undefined>();

expectTypeOf<HasProperty<WireUser, 'referral_code'>>().toEqualTypeOf<true>();
expectTypeOf<WireUser['referral_code']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<HasProperty<User, 'referral_code'>>().toEqualTypeOf<false>();

expectTypeOf<WireUser['role']>().toEqualTypeOf<WireUserRole | null | undefined>();
expectTypeOf<User['role']>().toEqualTypeOf<'BUYER' | 'SUPPLIER' | 'ADMIN' | null>();
expectTypeOf<WireUser['status']>().toEqualTypeOf<WireUserStatus>();
expectTypeOf<User['status']>().toEqualTypeOf<'PENDING' | 'APPROVED' | 'REJECTED'>();

expectTypeOf<WireUser['first_name']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WireUser['last_name']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<User['first_name']>().toEqualTypeOf<string | null>();
expectTypeOf<User['last_name']>().toEqualTypeOf<string | null>();

expectTypeOf<WireUser['kyc_status']>().toEqualTypeOf<string>();
expectTypeOf<User['kyc_status']>().toEqualTypeOf<string | undefined>();
expectTypeOf<WireUser['must_change_password']>().toEqualTypeOf<boolean>();
expectTypeOf<User['must_change_password']>().toEqualTypeOf<boolean | undefined>();
expectTypeOf<WireUser['execution_eligibility']>().toEqualTypeOf<WireExecutionEligibility | undefined>();
expectTypeOf<User['execution_eligibility']>().toEqualTypeOf<ExecutionEligibility | null | undefined>();

// The eligibility reason is one field the two sides model identically.
expectTypeOf<WireExecutionEligibility['reason']>().toEqualTypeOf<ExecutionEligibility['reason']>();
expectTypeOf<WireExecutionEligibility['grace_expires_at']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<ExecutionEligibility['grace_expires_at']>().toEqualTypeOf<string | null>();

// ─── DRIFT-6: availability windows, display labels against codes ───
// The frontend union holds display labels ("Q1 2026"); the wire sends canonical
// codes ("2026-Q1"). Every cast of a canonical code into `AvailabilityWindow`
// puts a value in the union that the union does not describe.

expectTypeOf<WireOrder['availability_window']>().toEqualTypeOf<string>();
expectTypeOf<HasMember<WireOrder['availability_window'], 'SPOT'>>().toEqualTypeOf<true>();

expectTypeOf<HasMember<AvailabilityWindow, 'Spot'>>().toEqualTypeOf<true>();
expectTypeOf<HasMember<AvailabilityWindow, 'SPOT'>>().toEqualTypeOf<false>();
expectTypeOf<HasMember<AvailabilityWindow, '2026-Q3'>>().toEqualTypeOf<false>();
expectTypeOf<HasMember<AvailabilityWindow, '2026-CAL'>>().toEqualTypeOf<false>();
expectTypeOf<HasMember<AvailabilityWindow, '2026-04'>>().toEqualTypeOf<false>();

expectTypeOf<OrderBookOrder['availability_window']>().toEqualTypeOf<AvailabilityWindow>();
expectTypeOf<WireTrade['availability_window']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<Trade['availability_window']>().toEqualTypeOf<string | undefined>();

// ─── DRIFT-7: remaining differences on the named wire shapes ──────

// `product_name` is on the wire and missing from the app's price summary.
expectTypeOf<HasProperty<WirePriceSummary, 'product_name'>>().toEqualTypeOf<true>();
expectTypeOf<WirePriceSummary['product_name']>().toEqualTypeOf<string>();
expectTypeOf<HasProperty<PriceSummary, 'product_name'>>().toEqualTypeOf<false>();

// Fields the wire always sends, which the app marks optional.
expectTypeOf<WirePriceSummary['real_trade_count_24h']>().toEqualTypeOf<number>();
expectTypeOf<PriceSummary['real_trade_count_24h']>().toEqualTypeOf<number | undefined>();
expectTypeOf<WirePriceSummary['demo_trade_count_24h']>().toEqualTypeOf<number>();
expectTypeOf<PriceSummary['demo_trade_count_24h']>().toEqualTypeOf<number | undefined>();
expectTypeOf<WirePriceSummary['unknown_trade_count_24h']>().toEqualTypeOf<number>();
expectTypeOf<PriceSummary['unknown_trade_count_24h']>().toEqualTypeOf<number | undefined>();
expectTypeOf<WirePriceSummary['availability_window']>().toEqualTypeOf<string>();
expectTypeOf<PriceSummary['availability_window']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WirePriceSummary['is_reference']>().toEqualTypeOf<boolean>();
expectTypeOf<PriceSummary['is_reference']>().toEqualTypeOf<boolean | undefined>();

// Commissions: the wire sends exact strings on every response; the trade
// boundary converts them, so the app types are plain numbers again.
expectTypeOf<WireTrade['commission_rate_pct']>().toEqualTypeOf<string>();
expectTypeOf<Trade['commission_rate_pct']>().toEqualTypeOf<number>();
expectTypeOf<WireTrade['commission_amount_usd']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<WireTrade['commission_fee_per_mt_usd']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<Trade['commission_amount_usd']>().toEqualTypeOf<number | null | undefined>();
expectTypeOf<Trade['commission_fee_per_mt_usd']>().toEqualTypeOf<number | null | undefined>();

expectTypeOf<WireProduct['execution_mode']>().toEqualTypeOf<string>();
expectTypeOf<Product['execution_mode']>().toEqualTypeOf<'ORDERBOOK' | 'RFQ_ONLY' | undefined>();
expectTypeOf<WireProduct['available_delivery_point_ids']>().toEqualTypeOf<string[]>();
expectTypeOf<Product['available_delivery_point_ids']>().toEqualTypeOf<string[] | undefined>();
expectTypeOf<WireProduct['market_product']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<Product['market_product']>().toEqualTypeOf<MarketProduct | undefined>();
expectTypeOf<WireProduct['spec_description']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<Product['spec_description']>().toEqualTypeOf<string | undefined>();

expectTypeOf<WireDeliveryPoint['timezone']>().toEqualTypeOf<string | null | undefined>();
expectTypeOf<DeliveryPoint['timezone']>().toEqualTypeOf<string | undefined>();

expectTypeOf<WireNotification['type']>().toEqualTypeOf<string>();
expectTypeOf<Notification['type']>().toEqualTypeOf<'SYSTEM' | 'ORDER_UPDATE' | 'DIRECT_ORDER' | 'DIRECT_ORDER_OFFER' | 'USER_STATUS'>();
expectTypeOf<WireNotification['data']>().toEqualTypeOf<{ [key: string]: unknown } | null>();
expectTypeOf<Notification['data']>().toEqualTypeOf<any>();

// ─── Shapes that already agree ─────────────────────────────────────
// Pinned so a change to either side is noticed here too.

type OrderProvenance = 'source_kind' | 'scope' | 'demo_status' | 'version' | 'terms_digest' | 'product_id' | 'product_name' | 'fuel_grade' | 'is_crossed' | 'certification_declared' | 'is_demo_listing' | 'msds_available';
expectTypeOf<Pick<OrderBookOrder, OrderProvenance>>().toEqualTypeOf<Pick<WireOrder, OrderProvenance>>();
expectTypeOf<Pick<Trade, 'source_kind' | 'scope' | 'demo_status'>>().toEqualTypeOf<Pick<WireTrade, 'source_kind' | 'scope' | 'demo_status'>>();
expectTypeOf<MarketSourceKind>().toEqualTypeOf<WireMarketSourceKind>();
expectTypeOf<WireOrder['certifications']>().toEqualTypeOf<string[] | undefined>();
expectTypeOf<OrderBookOrder['certifications']>().toEqualTypeOf<string[]>();
expectTypeOf<WireOwnedOrder['creation_method']>().toEqualTypeOf<string>();
expectTypeOf<OrderBookOrder['creation_method']>().toEqualTypeOf<string | undefined>();

expectTypeOf<OrderBookOrder['unknown_count']>().toEqualTypeOf<WireOrder['unknown_count']>();
expectTypeOf<Trade['unknown_count']>().toEqualTypeOf<WireTrade['unknown_count']>();

expectTypeOf<PaginatedResult<unknown>>().toEqualTypeOf<{ items: unknown[]; total: number; skip: number; limit: number }>();
expectTypeOf<WireNotification['is_read']>().toEqualTypeOf<boolean>();
expectTypeOf<Notification['is_read']>().toEqualTypeOf<boolean>();
expectTypeOf<WireNotification['created_at']>().toEqualTypeOf<string>();
expectTypeOf<Notification['created_at']>().toEqualTypeOf<string>();
expectTypeOf<WireProduct['is_active']>().toEqualTypeOf<boolean>();
expectTypeOf<Product['is_active']>().toEqualTypeOf<boolean>();
expectTypeOf<WireDeliveryPoint['region']>().toEqualTypeOf<string>();
expectTypeOf<DeliveryPoint['region']>().toEqualTypeOf<string>();
