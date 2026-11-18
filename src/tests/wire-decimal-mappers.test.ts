import type { NormalizedOrderWire, NormalizedTradeWire } from '../api/mappers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../services/api';

import type {
    WireAggregatedOrderbook,
    WireForwardCurvePoint,
    WireInventoryItem,
    WireMapCompactMarket,
    WireOrder,
    WirePriceSummary,
    WireProduct,
    WireReferencePriceItem,
    WireTrade,
    WireTradeTapeEntry,
} from '../api/contract';
import {
    mapWirePage,
    toAggregatedOrderbook,
    toForwardCurvePoint,
    toInventoryItem,
    toMapCompactMarket,
    toOrderBookOrder,
    toPriceSummary,
    toProduct,
    toReferencePriceItem,
    toTrade,
    toTradeStreamPayload,
    toTradeTapeEntry,
} from '../api/mappers';

/**
 * The spellings one number may arrive in. Tracker decision 67 lets the backend
 * change how it spells a decimal; the app must not care. See DRIFT-1 in
 * `docs/refactor/api-type-drift.md`.
 */
const SPELLINGS = ['650', '650.0', '650.00', '6.5E+2', ' 650.00 '];
const VALUE = 650;

/**
 * A wire fixture written with the fields a test reads. The cast keeps the
 * fixtures short; the assertions below still fail if a field name is wrong,
 * because the mapper would then read `undefined`.
 */
const wire = <T,>(value: object): T => value as unknown as T;

const WIRE_ORDER = wire<WireOrder>({
    id: 'order-1',
    side: 'BID',
    product_id: 'product-1',
    product_name: 'B30',
    market_product: 'B30',
    fuel_type: 'Biofuel',
    fuel_grade: 'B30',
    region: 'Asia',
    delivery_point_id: 'dp-sg',
    delivery_point_name: 'Singapore',
    quantity_mt: '650.00',
    remaining_quantity_mt: '650.00',
    price_per_mt_usd: '650.00',
    availability_window: 'SPOT',
    certifications: [],
    is_verdaxis_verified: true,
    tier_label: 'INDEPENDENT',
    status: 'OPEN',
    created_at: '2026-10-15T12:00:00Z',
    is_demo_listing: false,
    is_crossed: false,
    certification_declared: true,
    msds_available: true,
    off_spec: false,
    version: 1,
    terms_digest: 'digest',
    unknown_count: 0,
    source_kind: 'LIVE_ORDER',
    scope: 'DELIVERY_POINT',
    demo_status: 'REAL_ONLY',
});

const WIRE_TRADE = wire<WireTrade>({
    id: 'trade-1',
    quantity_mt: '650.00',
    price_per_mt_usd: '650.00',
    final_quantity_mt: '650.00',
    final_price_per_mt: '650.00',
    final_total_usd: '650.00',
    commission_rate_pct: '650.00',
    commission_amount_usd: '650.00',
    commission_fee_per_mt_usd: '650.00',
    buyer_name: 'Buyer',
    seller_name: 'Seller',
    initiated_by: 'BUYER',
    is_anonymous: false,
    status: 'CONFIRMED',
    fuel_type: 'Biofuel',
    fuel_grade: 'B30',
    region: 'Asia',
    created_at: '2026-10-15T12:00:00Z',
    source_kind: 'CONFIRMED_TRADE',
    scope: 'DELIVERY_POINT',
    demo_status: 'REAL_ONLY',
    unknown_count: 0,
});

const WIRE_PRICE_SUMMARY = wire<WirePriceSummary>({
    availability_window: 'SPOT',
    last_price: '650.00',
    avg_price_24h: '650.00',
    high_24h: '650.00',
    low_24h: '650.00',
    price_change_pct: '650.00',
    volume_24h: '650.00',
    trade_count_24h: 3,
    real_trade_count_24h: 3,
    demo_trade_count_24h: 0,
    unknown_trade_count_24h: 0,
    fuel_type: 'Biofuel',
    region: 'Asia',
    product_name: 'B30',
    is_reference: false,
    source_kind: 'LIVE_ORDER',
    scope: 'DELIVERY_POINT',
    demo_status: 'REAL_ONLY',
});

const WIRE_AGGREGATED = wire<WireAggregatedOrderbook>({
    product_id: 'product-1',
    product_name: 'B30',
    market_product: 'B30',
    region: 'Asia',
    fuel_type: 'Biofuel',
    side: 'BID',
    min_price: '650.00',
    max_price: '650.00',
    total_quantity: '650.00',
    order_count: 2,
    product_total_order_count: 2,
    evidence_class: 'REAL',
    observed_at: '2026-10-15T12:00:00Z',
    source_kind: 'LIVE_ORDER',
    scope: 'DELIVERY_POINT',
    demo_status: 'REAL_ONLY',
});

const WIRE_COMPACT = wire<WireMapCompactMarket>({
    product_id: 'product-1',
    product_name: 'B30',
    market_product: 'B30',
    fuel_type: 'Biofuel',
    delivery_point_id: 'dp-sg',
    delivery_point_name: 'Singapore',
    region: 'Asia',
    evidence_class: 'REAL',
    source_kind: 'LIVE_ORDER',
    scope: 'DELIVERY_POINT',
    demo_status: 'REAL_ONLY',
    bid_min_price: '650.00',
    bid_max_price: '650.00',
    bid_total_quantity: '650.00',
    bid_order_count: 1,
    ask_min_price: '650.00',
    ask_max_price: '650.00',
    ask_total_quantity: '650.00',
    ask_order_count: 1,
    spot_best_bid: '650.00',
    spot_best_ask: '650.00',
    observed_at: '2026-10-15T12:00:00Z',
});

const WIRE_PRODUCT = wire<WireProduct>({
    id: 'product-1',
    name: 'B30',
    market_product: 'B30',
    fuel_type: 'Biofuel',
    fuel_grade: 'B30',
    unit: 'MT',
    min_lot_size: '650.00',
    is_active: true,
    execution_mode: 'ORDERBOOK',
    available_delivery_point_ids: ['dp-sg'],
});

const WIRE_TRADE_TAPE = wire<WireTradeTapeEntry>({
    id: 'tape-1',
    fuel_type: 'Biofuel',
    fuel_grade: 'B30',
    region: 'Asia',
    quantity_mt: '650.00',
    price_per_mt_usd: '650.00',
    total_usd: '650.00',
    confirmed_at: '2026-10-15T12:00:00Z',
    availability_window: 'SPOT',
    is_demo_trade: false,
    scope: 'DELIVERY_POINT',
    provenance_kind: 'CONFIRMED_TRADE',
    source_kind: 'CONFIRMED_TRADE',
    demo_status: 'REAL_ONLY',
});

const WIRE_CURVE_POINT = wire<WireForwardCurvePoint>({
    availability_window: 'SPOT',
    mid_price: '650.00',
    best_bid: '650.00',
    best_ask: '650.00',
    spread: '650.00',
    volume_mt: '650.00',
    order_count: 1,
});

const WIRE_REFERENCE = wire<WireReferencePriceItem>({
    availability_window: 'SPOT',
    fuel_type: 'Biofuel',
    region: 'Asia',
    vwap_usd: '650.00',
    total_volume_mt: '650.00',
    trade_count: 1,
    date: '2026-10-15',
    visibility: 'internal',
});

const WIRE_INVENTORY = wire<WireInventoryItem>({
    id: 'inv-1',
    fuel_type: 'Biofuel',
    product_name: 'B30',
    port_id: 'sg-sin',
    current_stock_mt: '650.00',
    incoming_stock_mt: '650.00',
    price_per_mt_usd: '650.00',
});

/** Each mapper, the wire record it reads and the numbers it must produce. */
const MAPPERS: Array<{
    name: string;
    build: (record: any) => any;
    // The wire field each spelling is written into, and the app field it lands in.
    pairs: Array<[string, string]>;
}> = [
    {
        name: 'toOrderBookOrder',
        build: record => toOrderBookOrder(record),
        pairs: [
            ['quantity_mt', 'quantity_mt'],
            ['remaining_quantity_mt', 'remaining_quantity_mt'],
            ['price_per_mt_usd', 'price_per_mt_usd'],
            ['carbon_intensity_gco2_mj', 'carbon_intensity_gco2_mj'],
            ['benchmark_price_per_mt_usd', 'benchmark_price_per_mt_usd'],
            ['premium_discount_per_mt_usd', 'premium_discount_per_mt_usd'],
        ],
    },
    {
        name: 'toTrade',
        build: record => toTrade(record),
        pairs: [
            ['quantity_mt', 'quantity_mt'],
            ['price_per_mt_usd', 'price_per_mt_usd'],
            ['final_quantity_mt', 'final_quantity_mt'],
            ['final_price_per_mt', 'final_price_per_mt'],
            ['final_total_usd', 'final_total_usd'],
            ['commission_rate_pct', 'commission_rate_pct'],
            ['commission_amount_usd', 'commission_amount_usd'],
            ['commission_fee_per_mt_usd', 'commission_fee_per_mt_usd'],
        ],
    },
    {
        name: 'toPriceSummary',
        build: record => toPriceSummary(record),
        pairs: [
            ['last_price', 'last_price'],
            ['avg_price_24h', 'avg_price_24h'],
            ['high_24h', 'high_24h'],
            ['low_24h', 'low_24h'],
            ['price_change_pct', 'price_change_pct'],
            ['volume_24h', 'volume_24h'],
        ],
    },
    {
        name: 'toAggregatedOrderbook',
        build: record => toAggregatedOrderbook(record),
        pairs: [
            ['min_price', 'min_price'],
            ['max_price', 'max_price'],
            ['total_quantity', 'total_quantity'],
        ],
    },
    {
        name: 'toMapCompactMarket',
        build: record => toMapCompactMarket(record),
        pairs: [
            ['bid_min_price', 'bid_min_price'],
            ['bid_max_price', 'bid_max_price'],
            ['bid_total_quantity', 'bid_total_quantity'],
            ['ask_min_price', 'ask_min_price'],
            ['ask_max_price', 'ask_max_price'],
            ['ask_total_quantity', 'ask_total_quantity'],
            ['spot_best_bid', 'spot_best_bid'],
            ['spot_best_ask', 'spot_best_ask'],
        ],
    },
    {
        name: 'toProduct',
        build: record => toProduct(record),
        pairs: [['min_lot_size', 'min_lot_size']],
    },
    {
        name: 'toTradeTapeEntry',
        build: record => toTradeTapeEntry(record),
        pairs: [
            ['quantity_mt', 'quantity_mt'],
            ['price_per_mt_usd', 'price_per_mt_usd'],
        ],
    },
    {
        name: 'toForwardCurvePoint',
        build: record => toForwardCurvePoint(record),
        pairs: [
            ['mid_price', 'mid_price'],
            ['best_bid', 'best_bid'],
            ['best_ask', 'best_ask'],
            ['spread', 'spread'],
            ['volume_mt', 'volume_mt'],
        ],
    },
    {
        name: 'toReferencePriceItem',
        build: record => toReferencePriceItem(record),
        pairs: [
            ['vwap_usd', 'vwap_usd'],
            ['total_volume_mt', 'total_volume_mt'],
        ],
    },
    {
        name: 'toInventoryItem',
        build: record => toInventoryItem(record),
        pairs: [
            ['current_stock_mt', 'currentStock'],
            ['incoming_stock_mt', 'incomingStock'],
            ['price_per_mt_usd', 'pricePerMt'],
        ],
    },
];

const RECORDS: Record<string, any> = {
    toOrderBookOrder: WIRE_ORDER,
    toTrade: WIRE_TRADE,
    toPriceSummary: WIRE_PRICE_SUMMARY,
    toAggregatedOrderbook: WIRE_AGGREGATED,
    toMapCompactMarket: WIRE_COMPACT,
    toProduct: WIRE_PRODUCT,
    toTradeTapeEntry: WIRE_TRADE_TAPE,
    toForwardCurvePoint: WIRE_CURVE_POINT,
    toReferencePriceItem: WIRE_REFERENCE,
    toInventoryItem: WIRE_INVENTORY,
};

describe('mapWirePage: no wire record passes through unmapped', () => {
    const mapped = (record: any) => ({ id: record.id, quantity_mt: 500 });

    it('maps the items of a well-formed page', () => {
        expect(mapWirePage({ items: [{ id: 'a', quantity_mt: '500.00' }], total: 1, skip: 0, limit: 20 }, mapped))
            .toEqual({ items: [{ id: 'a', quantity_mt: 500 }], total: 1, skip: 0, limit: 20 });
    });

    it('returns an empty items array for a body without one', () => {
        // A malformed page cannot carry wire records, so nothing passes
        // through: the caller's `page.items` read stays safe and wire-free.
        expect(mapWirePage({ total: 0 }, mapped)).toEqual({ total: 0, items: [] });
        expect(mapWirePage({}, mapped)).toEqual({ items: [] });
    });

    it('returns an empty page for a null or scalar body', () => {
        expect(mapWirePage(null, mapped)).toEqual({ items: [] });
        expect(mapWirePage(undefined, mapped)).toEqual({ items: [] });
        expect(mapWirePage('error text', mapped)).toEqual({ items: [] });
    });
});

describe('wire decimal mappers: the spelling of a decimal changes nothing', () => {
    for (const mapper of MAPPERS) {
        it(`${mapper.name} maps every spelling of one value to the same app field`, () => {
            const base = RECORDS[mapper.name];
            for (const [wireField, appField] of mapper.pairs) {
                let expected: any = null;
                for (const spelling of SPELLINGS) {
                    const mapped = mapper.build({ ...base, [wireField]: spelling });
                    if (expected === null) expected = mapped;
                    expect(mapped[appField], `${wireField} as ${JSON.stringify(spelling)}`).toBe(VALUE);
                    expect(mapped).toEqual(expected);
                }
            }
        });
    }

    it('reads the create, confirm, deliver and paid stream payloads the same way', () => {
        const events: Array<[string, string[]]> = [
            ['trade_created', ['quantity', 'price']],
            ['trade_confirmed', ['quantity', 'price']],
            ['trade_paid', ['quantity', 'price']],
            ['trade_auto_matched', ['quantity', 'price']],
            ['trade_delivered', ['final_quantity', 'final_price', 'final_total']],
            ['price_alert_triggered', ['price', 'threshold_usd']],
        ];
        for (const [event, keys] of events) {
            for (const key of keys) {
                const payload = toTradeStreamPayload(event, { [key]: '650.00', status: 'PAID' }) as Record<string, unknown>;
                expect(payload[key], `${event}.${key}`).toBe(VALUE);
                expect(payload.status).toBe('PAID');
            }
        }
        // An event this app does not read keeps its payload untouched.
        expect(toTradeStreamPayload('trade_declined', { quantity: '650.00' })).toEqual({ quantity: '650.00' });
        expect(toTradeStreamPayload('trade_created', null)).toBeNull();
    });
});

describe('wire decimal mappers: absent, empty and malformed values', () => {
    it('keeps a malformed optional price null', () => {
        const summary = toPriceSummary({ ...WIRE_PRICE_SUMMARY, last_price: 'abc' });
        expect(summary.last_price).toBeNull();
    });

    it('marks a malformed quantity unavailable while preserving zero', () => {
        const order = { ...WIRE_ORDER, fame_terms: null, lng_terms: null };
        expect(toOrderBookOrder({ ...order, quantity_mt: 'abc' }).quantity_mt).toBeNaN();
        expect(toOrderBookOrder({ ...order, quantity_mt: '0.00' }).quantity_mt).toBe(0);
    });

    it('leaves a field the wire omits absent for a nullable app field', () => {
        const { final_total_usd: _omitted, ...withoutTotal } = WIRE_TRADE as any;
        expect(toTrade(withoutTotal as NormalizedTradeWire).final_total_usd).toBeNull();
    });

    it('keeps a NaN quantity out of a sum instead of inventing a value', () => {
        // The number readers downstream keep their own guards; the mapper only
        // has to avoid turning "unreadable" into a plausible number.
        const mapped = toMapCompactMarket({ ...WIRE_COMPACT, bid_total_quantity: 'abc' } as WireMapCompactMarket);
        expect(mapped.bid_total_quantity).toBeNaN();
        expect(toProduct({ ...WIRE_PRODUCT, min_lot_size: undefined } as unknown as WireProduct).min_lot_size).toBeNaN();
    });

});

describe('Trade participant freeze projection', () => {
    afterEach(() => vi.restoreAllMocks());
    const freeze = { reason_code: 'COMPLIANCE_REVIEW', set_at: '2026-10-29T12:34:00Z' };

    it('preserves optional freeze fields through the paged API read', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
            items: [{ ...WIRE_TRADE, is_frozen: true, freeze }], total: 1, skip: 0, limit: 20,
        }));
        const result = await api.trades.myTradesPaged(undefined, { force: true });
        expect(result.items[0]).toMatchObject({ is_frozen: true, freeze, quantity_mt: 650 });
    });

    it.each(['confirm', 'decline', 'deliver', 'pay'] as const)('preserves the participant block in %s responses', async operation => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ...WIRE_TRADE, is_frozen: true, freeze }));
        const result = operation === 'deliver'
            ? await api.trades.deliver('trade-projection', { final_quantity_mt: 650, final_price_per_mt: 650 })
            : await api.trades[operation]('trade-projection');
        expect(result).toMatchObject({ is_frozen: true, freeze, quantity_mt: 650 });
    });

    it.each(['confirm', 'decline', 'deliver', 'pay'] as const)('retains a structured freeze refusal from %s', async operation => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ detail: { code: 'TRADE_FROZEN', message: 'Trade frozen' } }, { status: 409 }));
        const result = operation === 'deliver'
            ? api.trades.deliver('trade-refusal', { final_quantity_mt: 650, final_price_per_mt: 650 })
            : api.trades[operation]('trade-refusal');
        await expect(result).rejects.toMatchObject({ status: 409, code: 'TRADE_FROZEN' });
        await expect(result).rejects.toBeInstanceOf(ApiError);
    });

    it.each([{}, { is_frozen: false, freeze: null }])('preserves the compatible unfrozen projection %j', projection => {
        const result = toTrade({ ...WIRE_TRADE, fame_terms_snapshot: null, lng_terms_snapshot: null, ...projection });
        expect(result.is_frozen).toBe((projection as { is_frozen?: boolean }).is_frozen);
        expect(result.freeze).toBe((projection as { freeze?: null }).freeze);
    });
});
