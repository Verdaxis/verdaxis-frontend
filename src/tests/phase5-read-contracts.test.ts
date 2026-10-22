import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, api } from '../services/api';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

const requestUrl = (call: number): string => String(fetchMock.mock.calls[call]?.[0]);

describe('market_read_wrapper_cases', () => {
    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllGlobals();
    });

    it('keeps producer null coordinates, cod year and decimal metadata as wire values', async () => {
        fetchMock.mockResolvedValue(jsonResponse([
            {
                id: 'producer-1',
                name: 'Gulf Methanol One',
                fuel_type: 'Methanol',
                capacity_kt_per_year: '1234567890123.456789012345678901',
                country: 'Saudi Arabia',
                region: null,
                lat: null,
                lng: null,
                cod_date: null,
                cod_year: null,
                status: 'ANNOUNCED',
                data_source: null,
                gena_project_id: null,
                organization_id: null,
                feedstock: null,
                technology: null,
                carbon_intensity_gco2_mj: '93.30',
                notes: null,
                created_at: '2026-10-01T00:00:00Z',
            },
            {
                id: 'producer-2',
                name: 'Equator Methanol Two',
                fuel_type: 'Methanol',
                capacity_kt_per_year: '0.00',
                country: 'Indonesia',
                region: 'Asia Pacific',
                lat: 0,
                lng: 0,
                cod_date: '2028-01-15',
                cod_year: 2028,
                status: 'UNDER_CONSTRUCTION',
                data_source: 'Industry register',
                gena_project_id: 'gena-2',
                organization_id: null,
                feedstock: 'Bio-methane',
                technology: 'Gasification',
                carbon_intensity_gco2_mj: null,
                notes: 'Two-phase build',
                created_at: '2026-10-02T00:00:00Z',
            },
        ]));
        vi.stubGlobal('fetch', fetchMock);

        const projects = await api.producers.list({
            fuel_type: 'Methanol',
            country: 'Saudi Arabia',
            status: 'ANNOUNCED',
            cod_year_min: 2026,
            cod_year_max: 2030,
        });

        // The wrapper must not read decimals or turn a null into zero: the
        // Phase 5 contract keeps the wire spelling at this boundary.
        expect(projects[0]?.capacity_kt_per_year).toBe('1234567890123.456789012345678901');
        expect(typeof projects[0]?.capacity_kt_per_year).toBe('string');
        expect(projects[0]?.carbon_intensity_gco2_mj).toBe('93.30');
        expect(projects[0]?.lat).toBeNull();
        expect(projects[0]?.lng).toBeNull();
        expect(projects[0]?.cod_year).toBeNull();
        // A real zero coordinate stays a zero instead of a missing value.
        expect(projects[1]?.lat).toBe(0);
        expect(projects[1]?.lng).toBe(0);
        expect(projects[1]?.capacity_kt_per_year).toBe('0.00');
        expect(projects[1]?.cod_year).toBe(2028);

        const url = new URL(requestUrl(0), 'http://localhost');
        expect(url.pathname).toBe('/api/producers');
        expect(url.searchParams.get('fuel_type')).toBe('Methanol');
        expect(url.searchParams.get('country')).toBe('Saudi Arabia');
        expect(url.searchParams.get('status')).toBe('ANNOUNCED');
        expect(url.searchParams.get('cod_year_min')).toBe('2026');
        expect(url.searchParams.get('cod_year_max')).toBe('2030');
    });

    it('keeps availability stock and average price nullable and exact', async () => {
        fetchMock.mockResolvedValue(jsonResponse([
            {
                port_id: 'port-singapore',
                port_name: 'Singapore',
                lat: 1.264,
                lng: 103.84,
                fuel_type: 'Methanol',
                market_product_code: 'BIO_METHANOL',
                total_stock_mt: null,
                supplier_count: 0,
                availability_level: 'NONE',
                avg_price_per_mt: null,
                source_kind: 'NO_DATA',
                scope: 'DELIVERY_POINT',
                demo_status: 'UNKNOWN',
                unknown_count: 0,
            },
            {
                port_id: 'port-rotterdam',
                port_name: 'Rotterdam',
                lat: 51.95,
                lng: 4.14,
                fuel_type: 'Methanol',
                market_product_code: 'BIO_METHANOL',
                total_stock_mt: '98765432109876.543210987654321098',
                supplier_count: 7,
                availability_level: 'AVAILABLE',
                avg_price_per_mt: '1150.50',
                source_kind: 'LIVE_INVENTORY',
                scope: 'DELIVERY_POINT',
                demo_status: 'REAL_ONLY',
                unknown_count: 1,
            },
        ]));
        vi.stubGlobal('fetch', fetchMock);

        const ports = await api.availability.list({ fuel_type: 'Methanol' });

        expect(ports[0]?.total_stock_mt).toBeNull();
        expect(ports[0]?.avg_price_per_mt).toBeNull();
        expect(ports[0]?.supplier_count).toBe(0);
        expect(ports[1]?.total_stock_mt).toBe('98765432109876.543210987654321098');
        expect(ports[1]?.avg_price_per_mt).toBe('1150.50');
        expect(typeof ports[1]?.avg_price_per_mt).toBe('string');

        const url = new URL(requestUrl(0), 'http://localhost');
        expect(url.pathname).toBe('/api/availability');
        expect(url.searchParams.get('fuel_type')).toBe('Methanol');
    });

    it('keeps demand volume and maximum price nullable and exact', async () => {
        fetchMock.mockResolvedValue(jsonResponse([
            {
                fuel_type: 'Ammonia',
                region: 'Asia Pacific',
                market_product_code: null,
                delivery_point_id: null,
                delivery_point_name: null,
                availability_window_code: null,
                volume_mt: null,
                max_price_per_mt: null,
                urgency: 'LOW',
                bid_count: 0,
                earliest_delivery: '2027-01-01',
                created_at: '2026-10-01T00:00:00Z',
                source_kind: 'NO_DATA',
                scope: 'REGION',
                demo_status: 'UNKNOWN',
                unknown_count: 0,
            },
            {
                fuel_type: 'Ammonia',
                region: 'Asia Pacific',
                market_product_code: 'GREEN_AMMONIA',
                delivery_point_id: '0f1d2f9a-6f3c-4c1b-9f1f-2f6f0f0f0f0f',
                delivery_point_name: 'Yokohama',
                availability_window_code: 'SPOT',
                volume_mt: '12345678901234567890.123456789',
                max_price_per_mt: '2400.00',
                urgency: 'HIGH',
                bid_count: 3,
                earliest_delivery: '2026-11-01',
                created_at: '2026-10-02T00:00:00Z',
                source_kind: 'LIVE_ORDER',
                scope: 'DELIVERY_POINT',
                demo_status: 'MIXED',
                unknown_count: 2,
            },
        ]));
        vi.stubGlobal('fetch', fetchMock);

        const signals = await api.demand.signals({ fuel_type: 'Ammonia', region: 'Asia Pacific', limit: 128 });

        expect(signals[0]?.volume_mt).toBeNull();
        expect(signals[0]?.max_price_per_mt).toBeNull();
        expect(signals[1]?.volume_mt).toBe('12345678901234567890.123456789');
        expect(signals[1]?.max_price_per_mt).toBe('2400.00');
        expect(typeof signals[1]?.volume_mt).toBe('string');

        const url = new URL(requestUrl(0), 'http://localhost');
        expect(url.pathname).toBe('/api/demand');
        expect(url.searchParams.get('fuel_type')).toBe('Ammonia');
        expect(url.searchParams.get('region')).toBe('Asia Pacific');
        expect(url.searchParams.get('limit')).toBe('128');
    });

    it('turns a structured 422 into a typed client error', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            detail: { code: 'INVALID_FUEL_FILTER', message: 'The fuel filter is not supported.' },
        }, 422));
        vi.stubGlobal('fetch', fetchMock);

        const failure = api.producers.list({ fuel_type: 'Unobtainium' });

        await expect(failure).rejects.toBeInstanceOf(ApiError);
        await failure.catch((error: unknown) => {
            const apiError = error as ApiError;
            expect(apiError.status).toBe(422);
            expect(apiError.code).toBe('INVALID_FUEL_FILTER');
            expect(apiError.message).toBe('The fuel filter is not supported.');
        });
    });

    it('turns an unavailable 503 into a typed client error', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            detail: { code: 'MARKET_READ_UNAVAILABLE', message: 'The market read is temporarily unavailable.' },
        }, 503));
        vi.stubGlobal('fetch', fetchMock);

        const failure = api.availability.list();

        await expect(failure).rejects.toBeInstanceOf(ApiError);
        await failure.catch((error: unknown) => {
            const apiError = error as ApiError;
            expect(apiError.status).toBe(503);
            expect(apiError.code).toBe('MARKET_READ_UNAVAILABLE');
        });
    });
});
