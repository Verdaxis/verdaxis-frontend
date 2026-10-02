import { describe, expect, it } from 'vitest';

import { PORTS } from '../data';
import { mapPortResponse } from '../services/api';
import type { DeliveryPoint, MapCompactMarket, Product } from '../types';
import { computePortMarketData, getMarketProductMapPorts } from '../utils/buyerMapMarket';
import { filterPortsByActiveDeliveryPoints, resolveApprovedMapPorts } from '../utils/marketPorts';

const compactMarket = (overrides: Partial<MapCompactMarket> = {}): MapCompactMarket => ({
    product_id: 'product-bio-methanol',
    product_name: 'Bio Methanol',
    market_product: 'BIO_METHANOL',
    fuel_type: 'Methanol',
    delivery_point_id: 'dp-singapore',
    delivery_point_name: 'Singapore',
    region: 'Asia',
    evidence_class: 'REAL',
    source_kind: 'LIVE_ORDER',
    scope: 'DELIVERY_POINT',
    demo_status: 'REAL_ONLY',
    bid_min_price: null,
    bid_max_price: null,
    bid_total_quantity: '0',
    bid_order_count: 0,
    ask_min_price: null,
    ask_max_price: null,
    ask_total_quantity: '0',
    ask_order_count: 0,
    spot_best_bid: null,
    spot_best_ask: null,
    observed_at: '2026-10-02T00:00:00Z',
    ...overrides,
});

describe('BuyerMap market data', () => {
    it('uses active orderbook catalog coverage for B100 without adding liquidity', () => {
        const singapore: DeliveryPoint = { id: 'singapore-catalog', name: 'Singapore', region: 'Asia', is_active: true };
        const rotterdam: DeliveryPoint = { id: 'rotterdam-catalog', name: 'Rotterdam', region: 'Europe', is_active: true };
        const product: Product = {
            id: 'ucome', name: 'UCOME B100', market_product: 'UCOME_B100',
            fuel_type: 'FAME', fuel_grade: 'UCOME', unit: 'MT', min_lot_size: 1,
            is_active: true, execution_mode: 'ORDERBOOK',
            available_delivery_point_ids: [singapore.id],
        };

        expect(getMarketProductMapPorts('UCOME_B100', [product], [singapore, rotterdam], PORTS).map(port => port.name)).toEqual(['Singapore']);
        expect(getMarketProductMapPorts('UCOME_B100', [{ ...product, is_active: false }], [singapore], PORTS)).toEqual([]);
        expect(getMarketProductMapPorts('UCOME_B100', [{ ...product, execution_mode: 'RFQ_ONLY' }], [singapore], PORTS)).toEqual([]);
        expect(getMarketProductMapPorts('UCOME_B100', [product], [{ ...singapore, is_active: false }], PORTS)).toEqual([]);
        expect(getMarketProductMapPorts('UCOME_B100', [product], [], PORTS)).toEqual([]);
    });

    it('does not borrow alcohol prices or volume when B100 is selected', () => {
        const market = compactMarket({
            bid_max_price: '950', bid_total_quantity: '500', bid_order_count: 1,
            ask_min_price: '1000', ask_total_quantity: '500', ask_order_count: 1,
            spot_best_bid: '950', spot_best_ask: '1000',
        });

        expect(computePortMarketData([market], 'Singapore', 'UCOME_B100')).toEqual({
            totalVolume: 0, fuelRows: [], spreadPct: 999, reference: null,
        });
        expect(computePortMarketData([market], 'Singapore', 'BIO_METHANOL').reference?.price).toBe(975);
    });

    it('matches the legacy all-window golden for mixed REAL and DEMO rows', () => {
        const markets = [
            compactMarket({
                bid_min_price: '900.00',
                bid_max_price: '950.00',
                bid_total_quantity: '3000.00',
                bid_order_count: 3,
                ask_min_price: '1000.00',
                ask_max_price: '1100.00',
                ask_total_quantity: '4000.00',
                ask_order_count: 4,
                spot_best_bid: '950.00',
                spot_best_ask: '1000.20',
            }),
            compactMarket({
                evidence_class: 'DEMO',
                source_kind: 'DEMO_SEED',
                demo_status: 'DEMO_ONLY',
                bid_min_price: '800.00',
                bid_max_price: '960.00',
                bid_total_quantity: '500.00',
                bid_order_count: 1,
                ask_min_price: '990.00',
                ask_max_price: '1200.00',
                ask_total_quantity: '750.00',
                ask_order_count: 2,
                spot_best_bid: '940.10',
            }),
        ];

        const result = computePortMarketData(markets, 'Singapore', 'Bio Methanol');

        expect(result).toEqual({
            totalVolume: 8250,
            fuelRows: [{
                key: 'Bio Methanol',
                label: 'Bio Methanol',
                bestBid: 960,
                bestAsk: 990,
                orderCount: 10,
                spreadPct: ((990 - 960) / 975) * 100,
            }],
            spreadPct: ((990 - 960) / 975) * 100,
            reference: {
                productLabel: 'Bio Methanol',
                price: 975.1,
                source: 'MIXED',
            },
        });
    });

    it('keeps all five canonical products separate', () => {
        const products = [
            ['BIO_METHANOL', 'Bio Methanol', 'Methanol'],
            ['E_METHANOL', 'e-Methanol', 'Methanol'],
            ['BIO_ETHANOL', 'Bio Ethanol', 'Ethanol'],
            ['SYNTHETIC_ETHANOL', 'Synthetic Ethanol', 'Ethanol'],
            ['UCOME_B100', 'Bio Methanol', 'FAME'],
        ] as const;
        const markets = products.map(([marketProduct, productName, fuelType], index) => compactMarket({
            product_id: `product-${marketProduct}`,
            product_name: productName,
            market_product: marketProduct,
            fuel_type: fuelType,
            bid_min_price: String(700 + index),
            bid_max_price: String(700 + index),
            bid_total_quantity: '100',
            bid_order_count: 1,
            ask_min_price: String(720 + index),
            ask_max_price: String(720 + index),
            ask_total_quantity: '100',
            ask_order_count: 1,
        }));

        const result = computePortMarketData(markets, 'Singapore');

        expect(result.fuelRows.map(row => row.label).sort()).toEqual([
            'Bio Ethanol',
            'Bio Methanol',
            'UCOME B100',
            'e-Ethanol',
            'e-Methanol',
        ]);
    });

    it('preserves a one-sided B100 SPOT reference and product selection', () => {
        const product = 'UCOME_B100';
        const markets = [
            compactMarket({
                product_id: `product-${product}`,
                product_name: 'Bio Methanol',
                market_product: product,
                fuel_type: 'FAME',
                evidence_class: 'DEMO',
                source_kind: 'DEMO_SEED',
                demo_status: 'DEMO_ONLY',
                bid_min_price: '780',
                bid_max_price: '780',
                bid_total_quantity: '500',
                bid_order_count: 1,
                spot_best_bid: '780',
            }),
            compactMarket({
                ask_min_price: '1100',
                ask_max_price: '1100',
                ask_total_quantity: '500',
                ask_order_count: 1,
                spot_best_ask: '1100',
            }),
        ];

        const result = computePortMarketData(markets, 'Singapore', product);

        expect(result.fuelRows).toEqual([expect.objectContaining({
            label: 'UCOME B100',
            bestBid: 780,
            bestAsk: null,
            orderCount: 1,
        })]);
        expect(result.reference).toEqual({ productLabel: 'UCOME B100', price: 780, source: 'DEMO' });
        expect(result.spreadPct).toBe(999);
    });

    it('keeps the SPOT midpoint separate from all-window extrema', () => {
        const market = compactMarket({
            bid_min_price: '900',
            bid_max_price: '950',
            bid_total_quantity: '2000',
            bid_order_count: 2,
            ask_min_price: '520',
            ask_max_price: '1010',
            ask_total_quantity: '3000',
            ask_order_count: 3,
            spot_best_bid: '950',
            spot_best_ask: '1000',
        });

        const result = computePortMarketData([market], 'Singapore');

        expect(result.fuelRows[0]).toMatchObject({ bestBid: 950, bestAsk: 520, orderCount: 5 });
        expect(result.reference).toEqual({
            productLabel: 'Bio Methanol',
            price: 975,
            source: 'MARKET',
        });
    });

    it('keeps all-window data when a product has no SPOT market', () => {
        const market = compactMarket({
            product_name: 'e-Methanol',
            market_product: 'E_METHANOL',
            bid_min_price: '800',
            bid_max_price: '850',
            bid_total_quantity: '1000',
            bid_order_count: 1,
            ask_min_price: '900',
            ask_max_price: '950',
            ask_total_quantity: '1500',
            ask_order_count: 2,
        });

        const result = computePortMarketData([market], 'Singapore', 'e-Methanol');

        expect(result.totalVolume).toBe(2500);
        expect(result.fuelRows[0]).toMatchObject({ bestBid: 850, bestAsk: 900, orderCount: 3 });
        expect(result.reference).toBeNull();
    });

    it('does not match another delivery point through a broad region name', () => {
        const markets = [
            compactMarket({
                delivery_point_id: 'dp-ningbo',
                delivery_point_name: 'Ningbo',
                region: 'Shanghai',
                ask_min_price: '100',
                ask_max_price: '110',
                ask_total_quantity: '9999',
                ask_order_count: 9,
            }),
            compactMarket({
                delivery_point_id: 'dp-shanghai',
                delivery_point_name: 'Shanghai',
                region: 'China',
                ask_min_price: '700',
                ask_max_price: '720',
                ask_total_quantity: '1500',
                ask_order_count: 2,
            }),
        ];

        const result = computePortMarketData(markets, {
            id: 'cn-sha',
            catalogDeliveryPointId: 'dp-shanghai',
            name: 'Shanghai',
        });

        expect(result.totalVolume).toBe(1500);
        expect(result.fuelRows).toHaveLength(1);
        expect(result.fuelRows[0]).toMatchObject({ bestAsk: 700, orderCount: 2 });
    });

    it('does not invent port intelligence when the backend returns none', () => {
        const port = mapPortResponse({
            id: 'sg-sin',
            name: 'Singapore',
            country: 'Singapore',
            lat: 1.26,
            lng: 103.82,
            intelligence: null,
        });

        expect(port.priceMethanol).toBe(0);
        expect(port.methanolSupply).toBe('Unknown');
        expect(port.details?.priceHistory).toEqual([]);
        expect(port.details?.congestionLevel).toBe('Unknown');
        expect(port.details?.forecastSupply).toBe('Unknown');
        expect(port.details?.plattsPrice).toBeUndefined();
    });

    it('keeps only ports that are active market delivery points on the intelligence map', () => {
        const ports = [
            mapPortResponse({ id: 'singapore', name: 'Singapore', country: 'Singapore', lat: 1.26, lng: 103.82, intelligence: null }),
            mapPortResponse({ id: 'port-klang', name: 'Port Klang', country: 'Malaysia', lat: 3.0, lng: 101.4, intelligence: null }),
            mapPortResponse({ id: 'rotterdam', name: 'Rotterdam', country: 'Netherlands', lat: 51.92, lng: 4.48, intelligence: null }),
        ];
        const deliveryPoints = [
            { id: 'sg', name: 'Singapore', region: 'Asia', is_active: true },
            { id: 'rtm', name: 'Rotterdam', region: 'Europe', is_active: true },
            { id: 'kl', name: 'Port Klang', region: 'Asia', is_active: false },
        ];

        const filtered = filterPortsByActiveDeliveryPoints(ports, deliveryPoints);

        expect(filtered.map(port => port.name)).toEqual(['Singapore', 'Rotterdam']);
    });

    it('resolves approved map ports to catalog delivery point IDs by port name', () => {
        const livePorts = [mapPortResponse({
            id: 'sg-sin',
            name: 'Singapore',
            country: 'Singapore',
            lat: 1.26,
            lng: 103.82,
            intelligence: { methanol_price_avg: 615, price_trend: 1.5 },
        })];
        const deliveryPoints = [{
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Singapore',
            region: 'Asia',
            is_active: true,
        }];

        const resolved = resolveApprovedMapPorts(PORTS, livePorts, deliveryPoints);
        const singapore = resolved.find(port => port.name === 'Singapore');

        expect(singapore?.id).toBe('sg-sin');
        expect(singapore?.catalogDeliveryPointId).toBe('11111111-1111-1111-1111-111111111111');
        expect(singapore?.priceMethanol).toBe(615);
    });

    it('does not restore legacy static prices when live port intelligence is empty', () => {
        const livePorts = [mapPortResponse({
            id: 'sg-sin',
            name: 'Singapore',
            country: 'Singapore',
            lat: 1.26,
            lng: 103.82,
            intelligence: null,
        })];

        const singapore = resolveApprovedMapPorts(PORTS, livePorts).find(port => port.name === 'Singapore');

        expect(singapore?.priceMethanol).toBe(0);
        expect(singapore?.methanolSupply).toBe('Unknown');
    });
});
