import { describe, expect, it } from 'vitest';

import { mapPortResponse } from '../services/api';
import { computePortMarketData } from '../utils/buyerMapMarket';
import { filterPortsByActiveDeliveryPoints, resolveApprovedMapPorts } from '../utils/marketPorts';
import { PORTS } from '../data';

describe('BuyerMap market data', () => {
    it('keeps the four seeded products separate instead of collapsing to two fuel buckets', () => {
        const aggregated = [
            {
                product_id: 'legacy-methanol',
                fuel_type: 'Methanol',
                delivery_point_id: 'singapore',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Asia',
                side: 'ASK',
                min_price: '900.00',
                max_price: '950.00',
                total_quantity: '10000.00',
                order_count: 4,
            },
            {
                product_id: 'bio-methanol',
                product_name: 'Bio Methanol',
                fuel_type: 'Methanol',
                delivery_point_id: 'singapore',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Asia',
                side: 'ASK',
                min_price: '1056.00',
                max_price: '1171.00',
                total_quantity: '37000.00',
                order_count: 12,
            },
            {
                product_id: 'bio-methanol',
                product_name: 'Bio Methanol',
                fuel_type: 'Methanol',
                delivery_point_id: 'singapore',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Asia',
                side: 'BID',
                min_price: '1036.00',
                max_price: '1083.00',
                total_quantity: '36500.00',
                order_count: 12,
            },
            {
                product_id: 'e-methanol',
                product_name: 'e-Methanol',
                fuel_type: 'Methanol',
                delivery_point_id: 'singapore',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Asia',
                side: 'ASK',
                min_price: '1185.00',
                max_price: '1233.00',
                total_quantity: '26000.00',
                order_count: 11,
            },
            {
                product_id: 'e-methanol',
                product_name: 'e-Methanol',
                fuel_type: 'Methanol',
                delivery_point_id: 'singapore',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Asia',
                side: 'BID',
                min_price: '1115.00',
                max_price: '1149.00',
                total_quantity: '23500.00',
                order_count: 8,
            },
            {
                product_id: 'bio-ethanol',
                product_name: 'Bio Ethanol',
                fuel_type: 'Ethanol',
                delivery_point_id: 'singapore',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Asia',
                side: 'ASK',
                min_price: '692.50',
                max_price: '726.70',
                total_quantity: '42500.00',
                order_count: 12,
            },
            {
                product_id: 'bio-ethanol',
                product_name: 'Bio Ethanol',
                fuel_type: 'Ethanol',
                delivery_point_id: 'singapore',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Asia',
                side: 'BID',
                min_price: '632.50',
                max_price: '666.70',
                total_quantity: '32500.00',
                order_count: 12,
            },
            {
                product_id: 'synthetic-ethanol',
                product_name: 'Synthetic Ethanol',
                fuel_type: 'Ethanol',
                delivery_point_id: 'singapore',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Asia',
                side: 'ASK',
                min_price: '785.00',
                max_price: '819.00',
                total_quantity: '31000.00',
                order_count: 10,
            },
            {
                product_id: 'synthetic-ethanol',
                product_name: 'Synthetic Ethanol',
                fuel_type: 'Ethanol',
                delivery_point_id: 'singapore',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Asia',
                side: 'BID',
                min_price: '718.50',
                max_price: '760.50',
                total_quantity: '31000.00',
                order_count: 13,
            },
            {
                product_id: 'legacy-ethanol',
                fuel_type: 'Ethanol',
                delivery_point_id: 'singapore',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Asia',
                side: 'BID',
                min_price: '600.00',
                max_price: '640.00',
                total_quantity: '10000.00',
                order_count: 4,
            },
        ];

        const result = computePortMarketData(aggregated as any, 'Singapore', 'Singapore');

        expect(result.fuelRows.map((row) => row.label).sort()).toEqual([
            'Bio Ethanol',
            'Bio Methanol',
            'e-Ethanol',
            'e-Methanol',
        ]);
        expect(result.fuelRows.map((row) => row.label)).not.toContain('Methanol');
        expect(result.fuelRows.map((row) => row.label)).not.toContain('Ethanol');

        const bioMethanol = result.fuelRows.find((row) => row.label === 'Bio Methanol');
        const syntheticEthanol = result.fuelRows.find((row) => row.label === 'e-Ethanol');

        expect(bioMethanol).toMatchObject({ bestBid: 1083, bestAsk: 1056 });
        expect(syntheticEthanol).toMatchObject({ bestBid: 760.5, bestAsk: 785 });
    });

    it('derives the reference from the selected product exact SPOT book', () => {
        const aggregated = [
            {
                product_name: 'Bio Methanol',
                market_product: 'BIO_METHANOL',
                fuel_type: 'Methanol',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Singapore',
                side: 'BID',
                min_price: '940.00',
                max_price: '950.00',
                total_quantity: '1000.00',
                order_count: 2,
                source_kind: 'DEMO_SEED',
                demo_status: 'DEMO_ONLY',
            },
            {
                product_name: 'Bio Methanol',
                market_product: 'BIO_METHANOL',
                fuel_type: 'Methanol',
                delivery_point_name: 'Singapore',
                availability_window: 'SPOT',
                region: 'Singapore',
                side: 'ASK',
                min_price: '1000.00',
                max_price: '1010.00',
                total_quantity: '1000.00',
                order_count: 2,
                source_kind: 'DEMO_SEED',
                demo_status: 'DEMO_ONLY',
            },
            {
                product_name: 'Bio Methanol',
                market_product: 'BIO_METHANOL',
                fuel_type: 'Methanol',
                delivery_point_name: 'Singapore',
                availability_window: '2027-Q1',
                region: 'Singapore',
                side: 'ASK',
                min_price: '520.00',
                max_price: '520.00',
                total_quantity: '1000.00',
                order_count: 1,
                source_kind: 'DEMO_SEED',
                demo_status: 'DEMO_ONLY',
            },
        ];

        const result = computePortMarketData(aggregated as any, 'Singapore');

        expect(result.reference).toEqual({
            productLabel: 'Bio Methanol',
            price: 975,
            source: 'DEMO',
        });
    });

    it('does not pull unsupported delivery points into approved ports through country or broad region matching', () => {
        const aggregated = [
            {
                product_name: 'Bio Methanol',
                market_product: 'BIO_METHANOL',
                fuel_type: 'Methanol',
                delivery_point_id: 'dp-ningbo',
                delivery_point_name: 'Ningbo',
                availability_window: 'SPOT',
                region: 'China',
                side: 'ASK',
                min_price: '100.00',
                max_price: '110.00',
                total_quantity: '9999.00',
                order_count: 9,
            },
            {
                product_name: 'Bio Methanol',
                market_product: 'BIO_METHANOL',
                fuel_type: 'Methanol',
                delivery_point_id: 'dp-shanghai',
                delivery_point_name: 'Shanghai',
                availability_window: 'SPOT',
                region: 'China',
                side: 'ASK',
                min_price: '700.00',
                max_price: '720.00',
                total_quantity: '1500.00',
                order_count: 2,
            },
        ];

        const result = computePortMarketData(aggregated as any, {
            id: 'cn-sha',
            catalogDeliveryPointId: 'dp-shanghai',
            name: 'Shanghai',
        });

        expect(result.totalVolume).toBe(1500);
        expect(result.fuelRows).toHaveLength(1);
        expect(result.fuelRows[0]).toMatchObject({
            label: 'Bio Methanol',
            bestAsk: 700,
            orderCount: 2,
        });
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
            mapPortResponse({
                id: 'singapore',
                name: 'Singapore',
                country: 'Singapore',
                lat: 1.26,
                lng: 103.82,
                intelligence: null,
            }),
            mapPortResponse({
                id: 'port-klang',
                name: 'Port Klang',
                country: 'Malaysia',
                lat: 3.0,
                lng: 101.4,
                intelligence: null,
            }),
            mapPortResponse({
                id: 'rotterdam',
                name: 'Rotterdam',
                country: 'Netherlands',
                lat: 51.92,
                lng: 4.48,
                intelligence: null,
            }),
        ];

        const deliveryPoints = [
            { id: 'sg', name: 'Singapore', region: 'Asia', is_active: true },
            { id: 'rtm', name: 'Rotterdam', region: 'Europe', is_active: true },
            { id: 'kl', name: 'Port Klang', region: 'Asia', is_active: false },
        ];

        const filtered = filterPortsByActiveDeliveryPoints(ports, deliveryPoints);

        expect(filtered.map((port) => port.name)).toEqual(['Singapore', 'Rotterdam']);
    });

    it('resolves approved map ports to catalog delivery point IDs by port name', () => {
        const livePorts = [
            mapPortResponse({
                id: 'sg-sin',
                name: 'Singapore',
                country: 'Singapore',
                lat: 1.26,
                lng: 103.82,
                intelligence: { methanol_price_avg: 615, price_trend: 1.5 },
            }),
        ];
        const deliveryPoints = [
            {
                id: '11111111-1111-1111-1111-111111111111',
                name: 'Singapore',
                region: 'Asia',
                is_active: true,
            },
        ];

        const resolved = resolveApprovedMapPorts(PORTS, livePorts, deliveryPoints);
        const singapore = resolved.find(port => port.name === 'Singapore');

        expect(singapore?.id).toBe('sg-sin');
        expect(singapore?.catalogDeliveryPointId).toBe('11111111-1111-1111-1111-111111111111');
        expect(singapore?.priceMethanol).toBe(615);
    });

    it('does not restore legacy static prices when live port intelligence is empty', () => {
        const livePorts = [
            mapPortResponse({
                id: 'sg-sin',
                name: 'Singapore',
                country: 'Singapore',
                lat: 1.26,
                lng: 103.82,
                intelligence: null,
            }),
        ];

        const singapore = resolveApprovedMapPorts(PORTS, livePorts).find(port => port.name === 'Singapore');

        expect(singapore?.priceMethanol).toBe(0);
        expect(singapore?.methanolSupply).toBe('Unknown');
    });
});
