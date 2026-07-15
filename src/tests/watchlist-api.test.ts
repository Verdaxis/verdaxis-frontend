import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';

const fetchMock = vi.fn();

describe('watchlist market radar API client', () => {
    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllGlobals();
    });

    it('loads the default market radar through the slice-first endpoint', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({
                id: 'radar-1',
                name: 'Market Radar',
                kind: 'RADAR_DEFAULT',
                unread_event_count: 0,
                total_slice_count: 0,
                has_more_slices: false,
                slices: [],
                created_at: '2026-04-13T00:00:00Z',
            }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
        vi.stubGlobal('fetch', fetchMock);

        await api.watchlists.getRadar();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url] = fetchMock.mock.calls[0] ?? [];
        expect(String(url)).toContain('/watchlists/me');
    });

    it('creates canonical slice targets instead of legacy product entries', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({
                id: 'target-1',
                target_type: 'SLICE',
                market_product_code: 'BIO_METHANOL',
                delivery_point_id: 'dp-1',
                availability_window_code: 'SPOT',
                active_order_count: 0,
                unread_event_count: 0,
                created_at: '2026-04-13T00:00:00Z',
            }), { status: 201, headers: { 'Content-Type': 'application/json' } })
        );
        vi.stubGlobal('fetch', fetchMock);

        await api.watchlists.createSliceTarget('radar-1', {
            market_product_code: 'BIO_METHANOL',
            delivery_point_id: 'dp-1',
            availability_window_code: 'SPOT',
        });

        const [url, options] = fetchMock.mock.calls[0] ?? [];
        expect(String(url)).toContain('/watchlists/radar-1/targets');
        expect(options?.method).toBe('POST');
        expect(JSON.parse(String(options?.body))).toEqual({
            target_type: 'SLICE',
            market_product_code: 'BIO_METHANOL',
            delivery_point_id: 'dp-1',
            availability_window_code: 'SPOT',
        });
    });

    it('loads paginated radar events', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ items: [], next_cursor: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchMock);

        await api.watchlists.listEvents('radar-1', { cursor: 'next-page', limit: 50 });

        const [url] = fetchMock.mock.calls[0] ?? [];
        expect(String(url)).toContain('/watchlists/radar-1/events?');
        expect(String(url)).toContain('cursor=next-page');
        expect(String(url)).toContain('limit=50');
    });
});
