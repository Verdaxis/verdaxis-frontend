import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';

const fetchMock = vi.fn();

function jsonResponse(body: unknown) {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('price discovery API client', () => {
    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllGlobals();
    });

    it('sends canonical price summary filters', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ summaries: [], generated_at: '2026-04-14T00:00:00Z' }));
        vi.stubGlobal('fetch', fetchMock);

        await api.prices.getSummaries({
            market_product: 'BIO_METHANOL',
            delivery_point_id: 'port-123',
            availability_window: 'SPOT',
            hours: 24,
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url] = fetchMock.mock.calls[0] ?? [];
        expect(String(url)).toContain('/prices?');
        expect(String(url)).toContain('market_product=BIO_METHANOL');
        expect(String(url)).toContain('delivery_point_id=port-123');
        expect(String(url)).toContain('availability_window=SPOT');
        expect(String(url)).toContain('hours=24');
    });

    it('sends canonical reference price filters', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ prices: [], generated_at: '2026-04-14T00:00:00Z' }));
        vi.stubGlobal('fetch', fetchMock);

        await api.prices.getReference({
            market_product: 'SYNTHETIC_ETHANOL',
            delivery_point_id: 'port-456',
            availability_window: '2026-Q3',
            visibility: 'internal',
            date_from: '2026-01-01',
            date_to: '2026-03-01',
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url] = fetchMock.mock.calls[0] ?? [];
        const parsedUrl = new URL(String(url));
        expect(String(url)).toContain('/prices/reference?');
        expect(String(url)).toContain('market_product=SYNTHETIC_ETHANOL');
        expect(String(url)).toContain('delivery_point_id=port-456');
        expect(String(url)).toContain('availability_window=2026-Q3');
        expect(String(url)).toContain('visibility=internal');
        expect(parsedUrl.searchParams.get('date_from')).toBe('2026-01-01');
        expect(parsedUrl.searchParams.get('date_to')).toBe('2026-03-01');
        expect(parsedUrl.searchParams.get('from')).toBeNull();
        expect(parsedUrl.searchParams.get('to')).toBeNull();
    });

    it('sends forward curve board filters', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            availability_window: 'SPOT',
            products: [],
            ports: [],
            focus: {
                product_id: 'prod-1',
                market_product: 'BIO_METHANOL',
                product_name: 'Bio Methanol',
                delivery_point_id: 'dp-1',
                delivery_point_name: 'Singapore',
                region: 'Asia',
                availability_window: 'SPOT',
                curve: [],
                depth_bids: [],
                depth_asks: [],
            },
            generated_at: '2026-04-14T00:00:00Z',
        }));
        vi.stubGlobal('fetch', fetchMock);

        await api.curves.board({
            availability_window: '2026-Q3',
            focus_market_product: 'BIO_METHANOL',
            focus_delivery_point_id: 'dp-1',
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url] = fetchMock.mock.calls[0] ?? [];
        expect(String(url)).toContain('/curves/forward/board?');
        expect(String(url)).toContain('availability_window=2026-Q3');
        expect(String(url)).toContain('focus_market_product=BIO_METHANOL');
        expect(String(url)).toContain('focus_delivery_point_id=dp-1');
    });

    it('wires admin user listing and review endpoints', async () => {
        fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ items: [], total: 0 })));
        vi.stubGlobal('fetch', fetchMock);

        await api.admin.users('limit=100&status=APPROVED');
        await api.admin.approveUser('user-123');
        await api.admin.rejectUser('user-456');

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/admin/analytics/users?limit=100&status=APPROVED');
        expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/auth/approve/user-123');
        expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'PUT' });
        expect(String(fetchMock.mock.calls[2]?.[0])).toContain('/admin/analytics/users/user-456/reject');
        expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'PUT' });
    });

});
