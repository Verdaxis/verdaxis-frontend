/**
 * One mapper per wire shape: the single place a backend decimal becomes a
 * number (DRIFT-1 in `docs/refactor/api-type-drift.md`).
 *
 * Every mapper takes a generated wire type from `./contract` and returns the
 * hand-written app type from `src/types.ts`. Apply it at the entry point — a
 * service method or the stream handler — so no component sees a wire string.
 *
 * Two rules, both needed to keep today's behaviour exact:
 *
 * - A decimal the app declares as a required `number` becomes that number, or
 *   `NaN` when the wire cannot be read (see `requireWireDecimal`).
 * - A decimal the wire may omit or send as `null` becomes `number | null`, so
 *   `value ?? fallback` at a caller still means "no value".
 *
 * Non-decimal fields follow the generated contract where the app does not
 * deliberately normalize them. Remaining vocabulary casts belong to other
 * response families; see the drift record for the resolved order metadata.
 */

import { parseWireDecimal, requireWireDecimal } from './decimals';
import type {
    WireAggregatedOrderbook,
    WireForwardCurve,
    WireForwardCurveBoard,
    WireForwardCurveBoardCell,
    WireForwardCurveBoardDepthLevel,
    WireForwardCurveBoardFairPriceBand,
    WireForwardCurveBoardFocus,
    WireForwardCurveBoardIndication,
    WireForwardCurveBoardIndicationSummary,
    WireForwardCurveBoardPhysicalStem,
    WireForwardCurveBoardPhysicalStemSummary,
    WireForwardCurveBoardPort,
    WireForwardCurveLatestSignal,
    WireForwardCurveMarketCell,
    WireForwardCurvePoint,
    WireForwardCurveSlice,
    WireForwardCurveSliceEvidencePoint,
    WireForwardCurveSliceTrade,
    WireForwardCurveTable,
    WireForwardCurveTableRow,
    WireInventoryItem,
    WireMapCompactMarket,
    WireMapRecentAsk,
    WireOrder,
    WirePriceSummary,
    WireProduct,
    WireReferencePriceItem,
    WireTrade,
    WireTradeTapeEntry,
} from './contract';
import type {
    AggregatedOrderbook,
    ForwardCurveBoardCell,
    ForwardCurveBoardDepthLevel,
    ForwardCurveBoardFairPriceBand,
    ForwardCurveBoardFocus,
    ForwardCurveBoardIndication,
    ForwardCurveBoardIndicationSummary,
    ForwardCurveBoardPhysicalStem,
    ForwardCurveBoardPhysicalStemSummary,
    ForwardCurveBoardPort,
    ForwardCurveBoardResponse,
    ForwardCurveLatestSignal,
    ForwardCurveMarketCell,
    ForwardCurvePoint,
    ForwardCurveResponse,
    ForwardCurveSliceEvidencePoint,
    ForwardCurveSliceResponse,
    ForwardCurveSliceTrade,
    ForwardCurveTableResponse,
    ForwardCurveTableRow,
    InventoryItem,
    MapCompactMarket,
    OrderBookOrder,
    PriceSummary,
    Product,
    Trade,
    TradeTapeEntry,
} from '../types';

/** The compact map market's most recent ask, as the buyer map consumes it. */
export interface MapRecentAsk {
    product_id: string;
    product_name: string;
    market_product: string;
    fuel_type: string;
    delivery_point_id: string;
    delivery_point_name: string;
    region: string;
    price_per_mt_usd: number;
    remaining_quantity_mt: number;
    created_at: string;
    evidence_class: string;
    source_kind: string;
    scope: string;
    demo_status: string;
}

/** One daily reference price row from `/prices/reference`. */
export interface ReferencePriceItem {
    product_id?: string | null;
    delivery_point_id?: string | null;
    availability_window: string;
    fuel_type: string;
    region: string;
    vwap_usd: number;
    total_volume_mt: number;
    trade_count: number;
    date: string;
    visibility: string;
}

/** Map every record of a bare array, a paginated `{ items }` body or one record. */
export const mapWireRecords = <T>(value: unknown, map: (record: any) => T): T[] => {
    if (Array.isArray(value)) return value.map(map);
    if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
        return (value as { items: unknown[] }).items.map(map);
    }
    return [];
};

/**
 * Keep a paginated envelope (`total`, `skip`, `limit`) and map its `items`.
 *
 * A body without an `items` array cannot carry wire records, so it maps to an
 * empty `items` array rather than passing the body through: a caller that
 * reads `page.items` unconditionally (the listing and blotter tables do) would
 * otherwise receive wire-shaped records — or crash on a malformed page.
 */
export const mapWirePage = <T>(page: T, map: (record: any) => unknown): T => {
    if (!page || typeof page !== 'object') {
        return { items: [] } as T;
    }
    return {
        ...page,
        items: mapWireRecords((page as { items?: unknown }).items, map),
    } as T;
};

/**
 * The product-terms layer (`src/services/orderTerms.ts`) replaces `fame_terms`,
 * `lng_terms` and their trade snapshots with the app shapes before a mapper
 * runs. Their generated wire type still describes the raw, pre-normalized form,
 * so this re-describes the wire record for the mapper's return assertion. It
 * returns the same object, so no property is added or dropped.
 */
const withMappedTerms = <Wire, Terms>(wire: Wire): Omit<Wire, keyof Terms> & Terms =>
    wire as unknown as Omit<Wire, keyof Terms> & Terms;

// ─── Orders ─────────────────────────────────────────────────────────

export const toOrderBookOrder = (wire: WireOrder): OrderBookOrder => ({
    ...withMappedTerms<WireOrder, Pick<OrderBookOrder, 'fame_terms' | 'lng_terms'>>(wire),
    quantity_mt: requireWireDecimal(wire.quantity_mt),
    remaining_quantity_mt: requireWireDecimal(wire.remaining_quantity_mt),
    price_per_mt_usd: requireWireDecimal(wire.price_per_mt_usd),
    carbon_intensity_gco2_mj: parseWireDecimal(wire.carbon_intensity_gco2_mj),
    benchmark_price_per_mt_usd: parseWireDecimal(wire.benchmark_price_per_mt_usd),
    premium_discount_per_mt_usd: parseWireDecimal(wire.premium_discount_per_mt_usd),
    fuel_grade: wire.fuel_grade,
    availability_window: wire.availability_window,
    market_product: wire.market_product as OrderBookOrder['market_product'],
    source_kind: wire.source_kind,
    scope: wire.scope,
    demo_status: wire.demo_status,
    // The wire marks the identity prose fields nullable; the app omits them.
    delivery_point_id: wire.delivery_point_id ?? undefined,
    delivery_point_name: wire.delivery_point_name ?? undefined,
    port_id: wire.port_id ?? undefined,
    expires_at: wire.expires_at ?? undefined,
    certifications: wire.certifications ?? [],
} as OrderBookOrder);

/** A bare array or a paginated body of orders. */
export const toOrderBookOrders = (value: unknown): OrderBookOrder[] =>
    mapWireRecords(value, toOrderBookOrder);

// ─── Trades ─────────────────────────────────────────────────────────

export const toTrade = (wire: WireTrade): Trade => ({
    ...withMappedTerms<WireTrade, Pick<Trade, 'fame_terms_snapshot' | 'lng_terms_snapshot'>>(wire),
    quantity_mt: requireWireDecimal(wire.quantity_mt),
    price_per_mt_usd: requireWireDecimal(wire.price_per_mt_usd),
    final_quantity_mt: parseWireDecimal(wire.final_quantity_mt),
    final_price_per_mt: parseWireDecimal(wire.final_price_per_mt),
    final_total_usd: parseWireDecimal(wire.final_total_usd),
    commission_rate_pct: requireWireDecimal(wire.commission_rate_pct),
    commission_amount_usd: parseWireDecimal(wire.commission_amount_usd),
    commission_fee_per_mt_usd: parseWireDecimal(wire.commission_fee_per_mt_usd),
    fuel_grade: wire.fuel_grade as Trade['fuel_grade'],
    source_kind: wire.source_kind,
    scope: wire.scope,
    demo_status: wire.demo_status,
    // The wire marks the identity prose fields nullable; the app omits them.
    bid_order_id: wire.bid_order_id ?? undefined,
    ask_order_id: wire.ask_order_id ?? undefined,
    buyer_id: wire.buyer_id ?? null,
    seller_id: wire.seller_id ?? null,
    availability_window: wire.availability_window ?? undefined,
    product_id: wire.product_id ?? undefined,
    product_name: wire.product_name,
    delivery_point_id: wire.delivery_point_id ?? undefined,
    delivery_point_name: wire.delivery_point_name ?? undefined,
    commission_plan: wire.commission_plan ?? null,
    commission_payer: wire.commission_payer ?? null,
    confirmed_at: wire.confirmed_at ?? undefined,
    delivered_at: wire.delivered_at ?? undefined,
    paid_at: wire.paid_at ?? undefined,
} as Trade);

export const toTrades = (value: unknown): Trade[] => mapWireRecords(value, toTrade);

// ─── Prices ─────────────────────────────────────────────────────────

export const toPriceSummary = (wire: WirePriceSummary): PriceSummary => ({
    ...wire,
    last_price: parseWireDecimal(wire.last_price),
    avg_price_24h: parseWireDecimal(wire.avg_price_24h),
    high_24h: parseWireDecimal(wire.high_24h),
    low_24h: parseWireDecimal(wire.low_24h),
    price_change_pct: parseWireDecimal(wire.price_change_pct),
    volume_24h: requireWireDecimal(wire.volume_24h),
    market_product: wire.market_product as PriceSummary['market_product'],
    source_kind: wire.source_kind as PriceSummary['source_kind'],
    scope: wire.scope as PriceSummary['scope'],
    demo_status: wire.demo_status as PriceSummary['demo_status'],
    // The wire may omit or null these; the app type expects a value or null.
    last_trade_at: wire.last_trade_at ?? null,
    availability_window: wire.availability_window,
    delivery_point_id: wire.delivery_point_id ?? null,
    delivery_point_name: wire.delivery_point_name ?? null,
    product_id: wire.product_id ?? null,
    observed_at: wire.observed_at ?? null,
    real_trade_count_24h: wire.real_trade_count_24h,
    demo_trade_count_24h: wire.demo_trade_count_24h,
    unknown_trade_count_24h: wire.unknown_trade_count_24h,
    is_reference: wire.is_reference,
} as PriceSummary);

export const toPriceSummaries = (value: unknown): PriceSummary[] =>
    mapWireRecords(value, toPriceSummary);

export const toReferencePriceItem = (wire: WireReferencePriceItem): ReferencePriceItem => ({
    ...wire,
    vwap_usd: requireWireDecimal(wire.vwap_usd),
    total_volume_mt: requireWireDecimal(wire.total_volume_mt),
});

export const toReferencePriceItems = (value: unknown): ReferencePriceItem[] =>
    mapWireRecords(value, toReferencePriceItem);

// ─── Aggregated order book and the map summary ──────────────────────

export const toAggregatedOrderbook = (wire: WireAggregatedOrderbook): AggregatedOrderbook => ({
    ...wire,
    source_kind: wire.source_kind as AggregatedOrderbook['source_kind'],
    scope: wire.scope as AggregatedOrderbook['scope'],
    demo_status: wire.demo_status as AggregatedOrderbook['demo_status'],
    min_price: requireWireDecimal(wire.min_price),
    max_price: requireWireDecimal(wire.max_price),
    total_quantity: requireWireDecimal(wire.total_quantity),
    market_product: wire.market_product as AggregatedOrderbook['market_product'],
});

export const toAggregatedOrderbooks = (value: unknown): AggregatedOrderbook[] =>
    mapWireRecords(value, toAggregatedOrderbook);

export const toMapCompactMarket = (wire: WireMapCompactMarket): MapCompactMarket => ({
    ...wire,
    source_kind: wire.source_kind as MapCompactMarket['source_kind'],
    scope: wire.scope as MapCompactMarket['scope'],
    demo_status: wire.demo_status as MapCompactMarket['demo_status'],
    bid_min_price: parseWireDecimal(wire.bid_min_price),
    bid_max_price: parseWireDecimal(wire.bid_max_price),
    bid_total_quantity: requireWireDecimal(wire.bid_total_quantity),
    ask_min_price: parseWireDecimal(wire.ask_min_price),
    ask_max_price: parseWireDecimal(wire.ask_max_price),
    ask_total_quantity: requireWireDecimal(wire.ask_total_quantity),
    spot_best_bid: parseWireDecimal(wire.spot_best_bid),
    spot_best_ask: parseWireDecimal(wire.spot_best_ask),
});

export const toMapCompactMarkets = (value: unknown): MapCompactMarket[] =>
    mapWireRecords(value, toMapCompactMarket);

export const toMapRecentAsk = (wire: WireMapRecentAsk): MapRecentAsk => ({
    ...wire,
    price_per_mt_usd: requireWireDecimal(wire.price_per_mt_usd),
    remaining_quantity_mt: requireWireDecimal(wire.remaining_quantity_mt),
});

export const toMapRecentAsks = (value: unknown): MapRecentAsk[] =>
    mapWireRecords(value, toMapRecentAsk);

// ─── Trade tape ─────────────────────────────────────────────────────

export const toTradeTapeEntry = (wire: WireTradeTapeEntry): TradeTapeEntry => ({
    ...wire,
    quantity_mt: requireWireDecimal(wire.quantity_mt),
    price_per_mt_usd: requireWireDecimal(wire.price_per_mt_usd),
    market_product: wire.market_product as TradeTapeEntry['market_product'],
    scope: wire.scope as TradeTapeEntry['scope'],
    // The wire may answer `null` where the app type omits the field.
    product_id: wire.product_id ?? undefined,
    delivery_point_id: wire.delivery_point_id ?? undefined,
    delivery_point_name: wire.delivery_point_name ?? undefined,
} as TradeTapeEntry);

export const toTradeTapeEntries = (value: unknown): TradeTapeEntry[] =>
    mapWireRecords(value, toTradeTapeEntry);

// ─── Catalog and inventory ──────────────────────────────────────────

/**
 * `min_lot_size` becomes `NaN` rather than 0 so the order form keeps its
 * "catalog minimum unavailable" guard instead of accepting a bogus minimum.
 */
export const toProduct = (wire: WireProduct): Product => ({
    ...wire,
    min_lot_size: requireWireDecimal(wire.min_lot_size),
    market_product: wire.market_product as Product['market_product'],
    execution_mode: wire.execution_mode as Product['execution_mode'],
    // The wire may answer `null` where the app type omits the field.
    spec_description: wire.spec_description ?? undefined,
});

export const toProducts = (value: unknown): Product[] => mapWireRecords(value, toProduct);

export const toInventoryItem = (wire: WireInventoryItem): InventoryItem => {
    const currentStock = requireWireDecimal(wire.current_stock_mt);
    return {
        id: wire.id,
        productName: wire.product_name || wire.fuel_type,
        portId: wire.port_id,
        portName: wire.port_id?.split('-')[1]?.toUpperCase() || wire.port_id,
        currentStock,
        incomingStock: requireWireDecimal(wire.incoming_stock_mt) || 0,
        pricePerMt: requireWireDecimal(wire.price_per_mt_usd) || 0,
        status: currentStock <= 0 ? 'Out of Stock' : currentStock < 500 ? 'Low Stock' : 'Available',
    };
};

export const toInventoryItems = (value: unknown): InventoryItem[] =>
    mapWireRecords(value, toInventoryItem);

// ─── Trade event stream ─────────────────────────────────────────────

/**
 * The decimals one trade stream event carries. The keys differ by event
 * (`final_*` once the trade is delivered), so the map is explicit rather than a
 * scan of every numeric-looking field.
 */
const TRADE_STREAM_DECIMALS: Record<string, readonly string[]> = {
    trade_created: ['quantity', 'price'],
    trade_confirmed: ['quantity', 'price'],
    trade_paid: ['quantity', 'price'],
    trade_auto_matched: ['quantity', 'price'],
    trade_delivered: ['final_quantity', 'final_price', 'final_total'],
};

/** Convert the decimals of one trade stream payload; other keys pass through. */
export const toTradeStreamPayload = (event: string, data: unknown): unknown => {
    const keys = TRADE_STREAM_DECIMALS[event];
    if (!keys || !data || typeof data !== 'object' || Array.isArray(data)) return data;
    const payload = { ...(data as Record<string, unknown>) };
    for (const key of keys) {
        if (key in payload) payload[key] = parseWireDecimal(payload[key]);
    }
    return payload;
};

// ─── Forward curve ──────────────────────────────────────────────────

export const toForwardCurvePoint = (wire: WireForwardCurvePoint): ForwardCurvePoint => ({
    ...wire,
    mid_price: parseWireDecimal(wire.mid_price),
    best_bid: parseWireDecimal(wire.best_bid),
    best_ask: parseWireDecimal(wire.best_ask),
    spread: parseWireDecimal(wire.spread),
    volume_mt: requireWireDecimal(wire.volume_mt),
});

export const toForwardCurveResponse = (wire: WireForwardCurve): ForwardCurveResponse => ({
    ...wire,
    curve: Array.isArray(wire.curve) ? wire.curve.map(toForwardCurvePoint) : [],
    // The app declares a `product_name` the curve response does not carry; it
    // has always been undefined. Pinned by DRIFT-7's product-name family.
} as ForwardCurveResponse);

export const toForwardCurveBoardDepthLevel = (
    wire: WireForwardCurveBoardDepthLevel,
): ForwardCurveBoardDepthLevel => ({
    ...wire,
    price_per_mt_usd: requireWireDecimal(wire.price_per_mt_usd),
    quantity_mt: requireWireDecimal(wire.quantity_mt),
    source_kind: wire.source_kind as ForwardCurveBoardDepthLevel['source_kind'],
    demo_status: wire.demo_status as ForwardCurveBoardDepthLevel['demo_status'],
} as ForwardCurveBoardDepthLevel);

export const toForwardCurveBoardIndication = (
    wire: WireForwardCurveBoardIndication,
): ForwardCurveBoardIndication => ({
    ...wire,
    price_per_mt_usd: requireWireDecimal(wire.price_per_mt_usd),
    quantity_mt: parseWireDecimal(wire.quantity_mt),
});

export const toForwardCurveBoardIndicationSummary = (
    wire: WireForwardCurveBoardIndicationSummary,
): ForwardCurveBoardIndicationSummary => ({
    ...wire,
    latest_bid_price_per_mt_usd: parseWireDecimal(wire.latest_bid_price_per_mt_usd),
    latest_ask_price_per_mt_usd: parseWireDecimal(wire.latest_ask_price_per_mt_usd),
    latest_mid_price_per_mt_usd: parseWireDecimal(wire.latest_mid_price_per_mt_usd),
    total_quantity_mt: parseWireDecimal(wire.total_quantity_mt),
});

export const toForwardCurveBoardFairPriceBand = (
    wire: WireForwardCurveBoardFairPriceBand,
): ForwardCurveBoardFairPriceBand => ({
    ...wire,
    low_price_per_mt_usd: requireWireDecimal(wire.low_price_per_mt_usd),
    mid_price_per_mt_usd: requireWireDecimal(wire.mid_price_per_mt_usd),
    high_price_per_mt_usd: requireWireDecimal(wire.high_price_per_mt_usd),
});

export const toForwardCurveBoardPhysicalStem = (
    wire: WireForwardCurveBoardPhysicalStem,
): ForwardCurveBoardPhysicalStem => ({
    ...wire,
    quantity_mt: requireWireDecimal(wire.quantity_mt),
});

export const toForwardCurveBoardPhysicalStemSummary = (
    wire: WireForwardCurveBoardPhysicalStemSummary,
): ForwardCurveBoardPhysicalStemSummary => ({
    ...wire,
    available_quantity_mt: parseWireDecimal(wire.available_quantity_mt),
    tentative_quantity_mt: parseWireDecimal(wire.tentative_quantity_mt),
});

/** The provenance-vocabulary fields a board or table cell carries, narrowed once. */
const provenanceVocabulary = (wire: WireForwardCurveBoardCell) => ({
    benchmark_source_kind: wire.benchmark_source_kind as ForwardCurveBoardCell['benchmark_source_kind'],
    best_bid_source_kind: wire.best_bid_source_kind as ForwardCurveBoardCell['best_bid_source_kind'],
    best_ask_source_kind: wire.best_ask_source_kind as ForwardCurveBoardCell['best_ask_source_kind'],
    order_source_kind: wire.order_source_kind as ForwardCurveBoardCell['order_source_kind'],
    scope: wire.scope as ForwardCurveBoardCell['scope'],
    demo_status: wire.demo_status as ForwardCurveBoardCell['demo_status'],
});

/** The decimals a board cell and a table cell share, read in one place. */
const cellDecimals = <T extends WireForwardCurveBoardCell | WireForwardCurveMarketCell>(wire: T) => ({
    benchmark_mid: parseWireDecimal(wire.benchmark_mid),
    best_bid: parseWireDecimal(wire.best_bid),
    best_ask: parseWireDecimal(wire.best_ask),
    real_best_bid: parseWireDecimal(wire.real_best_bid),
    real_best_ask: parseWireDecimal(wire.real_best_ask),
    demo_best_bid: parseWireDecimal(wire.demo_best_bid),
    demo_best_ask: parseWireDecimal(wire.demo_best_ask),
    spread: parseWireDecimal(wire.spread),
    volume_mt: requireWireDecimal(wire.volume_mt),
});

export const toForwardCurveBoardCell = (wire: WireForwardCurveBoardCell): ForwardCurveBoardCell => ({
    ...wire,
    ...cellDecimals(wire),
    ...provenanceVocabulary(wire),
    market_product: wire.market_product as ForwardCurveBoardCell['market_product'],
    // The wire marks the prose fields optional; the app type declares them.
    benchmark_source: wire.benchmark_source ?? null,
    fair_price_band_provenance: wire.fair_price_band_provenance as ForwardCurveBoardCell['fair_price_band_provenance'],
    indication_summary: wire.indication_summary
        ? toForwardCurveBoardIndicationSummary(wire.indication_summary)
        : undefined,
    fair_price_band: wire.fair_price_band
        ? toForwardCurveBoardFairPriceBand(wire.fair_price_band)
        : null,
    physical_stem_summary: wire.physical_stem_summary
        ? toForwardCurveBoardPhysicalStemSummary(wire.physical_stem_summary)
        : undefined,
});

export const toForwardCurveMarketCell = (wire: WireForwardCurveMarketCell): ForwardCurveMarketCell => ({
    ...wire,
    ...cellDecimals(wire),
    primary_value: parseWireDecimal(wire.primary_value),
    benchmark_source_kind: wire.benchmark_source_kind as ForwardCurveMarketCell['benchmark_source_kind'],
    primary_source_kind: wire.primary_source_kind as ForwardCurveMarketCell['primary_source_kind'],
    primary_signal_type: wire.primary_signal_type as ForwardCurveMarketCell['primary_signal_type'],
    scope: wire.scope as ForwardCurveMarketCell['scope'],
    demo_status: wire.demo_status as ForwardCurveMarketCell['demo_status'],
    market_product: wire.market_product as ForwardCurveMarketCell['market_product'],
    label_policy: wire.label_policy as ForwardCurveMarketCell['label_policy'],
    public_source_label: wire.public_source_label,
    indication_summary: wire.indication_summary
        ? toForwardCurveBoardIndicationSummary(wire.indication_summary)
        : undefined,
    fair_price_band: wire.fair_price_band
        ? toForwardCurveBoardFairPriceBand(wire.fair_price_band)
        : null,
    physical_stem_summary: wire.physical_stem_summary
        ? toForwardCurveBoardPhysicalStemSummary(wire.physical_stem_summary)
        : undefined,
});

const toForwardCurveBoardPort = (wire: WireForwardCurveBoardPort): ForwardCurveBoardPort => ({
    ...wire,
    cells: Array.isArray(wire.cells) ? wire.cells.map(toForwardCurveBoardCell) : [],
});

const toForwardCurveBoardFocus = (wire: WireForwardCurveBoardFocus): ForwardCurveBoardFocus => ({
    ...wire,
    market_product: wire.market_product as ForwardCurveBoardFocus['market_product'],
    curve: Array.isArray(wire.curve) ? wire.curve.map(toForwardCurveBoardCell) : [],
    depth_bids: Array.isArray(wire.depth_bids) ? wire.depth_bids.map(toForwardCurveBoardDepthLevel) : [],
    depth_asks: Array.isArray(wire.depth_asks) ? wire.depth_asks.map(toForwardCurveBoardDepthLevel) : [],
    indications: Array.isArray(wire.indications) ? wire.indications.map(toForwardCurveBoardIndication) : [],
    fair_price_band: wire.fair_price_band
        ? toForwardCurveBoardFairPriceBand(wire.fair_price_band)
        : null,
    physical_stems: Array.isArray(wire.physical_stems)
        ? wire.physical_stems.map(toForwardCurveBoardPhysicalStem)
        : [],
});

export const toForwardCurveBoard = (wire: WireForwardCurveBoard): ForwardCurveBoardResponse => ({
    ...wire,
    products: Array.isArray(wire.products)
        ? wire.products.map(product => ({
            ...product,
            market_product: product.market_product as ForwardCurveBoardResponse['products'][number]['market_product'],
        }))
        : [],
    ports: Array.isArray(wire.ports) ? wire.ports.map(toForwardCurveBoardPort) : [],
    focus: toForwardCurveBoardFocus(wire.focus),
});

const toForwardCurveLatestSignal = (wire: WireForwardCurveLatestSignal): ForwardCurveLatestSignal => ({
    ...wire,
    primary_value: parseWireDecimal(wire.primary_value),
    demo_status: wire.demo_status as ForwardCurveLatestSignal['demo_status'],
    market_product: wire.market_product as ForwardCurveLatestSignal['market_product'],
} as ForwardCurveLatestSignal);

const toForwardCurveTableRow = (wire: WireForwardCurveTableRow): ForwardCurveTableRow => ({
    ...wire,
    market_product: wire.market_product as ForwardCurveTableRow['market_product'],
    cells: Object.fromEntries(
        Object.entries(wire.cells ?? {}).map(([key, cell]) => [
            key,
            toForwardCurveMarketCell(cell as WireForwardCurveMarketCell),
        ]),
    ),
} as ForwardCurveTableRow);

export const toForwardCurveTable = (wire: WireForwardCurveTable): ForwardCurveTableResponse => ({
    ...wire,
    rows: Array.isArray(wire.rows) ? wire.rows.map(toForwardCurveTableRow) : [],
    latest_signals: Array.isArray(wire.latest_signals)
        ? wire.latest_signals.map(toForwardCurveLatestSignal)
        : [],
});

export const toForwardCurveSliceTrade = (
    wire: WireForwardCurveSliceTrade,
): ForwardCurveSliceTrade => ({
    ...wire,
    price_per_mt_usd: requireWireDecimal(wire.price_per_mt_usd),
    quantity_mt: requireWireDecimal(wire.quantity_mt),
    source_kind: wire.source_kind as ForwardCurveSliceTrade['source_kind'],
    demo_status: wire.demo_status as ForwardCurveSliceTrade['demo_status'],
} as ForwardCurveSliceTrade);

export const toForwardCurveSliceEvidencePoint = (
    wire: WireForwardCurveSliceEvidencePoint,
): ForwardCurveSliceEvidencePoint => ({
    ...wire,
    price_per_mt_usd: parseWireDecimal(wire.price_per_mt_usd),
    low_price_per_mt_usd: parseWireDecimal(wire.low_price_per_mt_usd),
    high_price_per_mt_usd: parseWireDecimal(wire.high_price_per_mt_usd),
    quantity_mt: parseWireDecimal(wire.quantity_mt),
    source_kind: wire.source_kind as ForwardCurveSliceEvidencePoint['source_kind'],
});

export const toForwardCurveSlice = (wire: WireForwardCurveSlice): ForwardCurveSliceResponse => ({
    ...wire,
    cell: toForwardCurveMarketCell(wire.cell),
    depth_bids: Array.isArray(wire.depth_bids) ? wire.depth_bids.map(toForwardCurveBoardDepthLevel) : [],
    depth_asks: Array.isArray(wire.depth_asks) ? wire.depth_asks.map(toForwardCurveBoardDepthLevel) : [],
    trades: Array.isArray(wire.trades) ? wire.trades.map(toForwardCurveSliceTrade) : [],
    indications: Array.isArray(wire.indications) ? wire.indications.map(toForwardCurveBoardIndication) : [],
    fair_price_band: wire.fair_price_band
        ? toForwardCurveBoardFairPriceBand(wire.fair_price_band)
        : null,
    physical_stems: Array.isArray(wire.physical_stems)
        ? wire.physical_stems.map(toForwardCurveBoardPhysicalStem)
        : [],
    evidence_points: Array.isArray(wire.evidence_points)
        ? wire.evidence_points.map(toForwardCurveSliceEvidencePoint)
        : [],
});
