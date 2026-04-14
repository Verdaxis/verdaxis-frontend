import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';

const fetchMock = vi.fn();

describe('price discovery API client', () => {
    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllGlobals();
    });

    it('sends canonical price summary filters', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ summaries: [], generated_at: '2026-04-14T00:00:00Z' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
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
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ prices: [], generated_at: '2026-04-14T00:00:00Z' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchMock);

        await api.prices.getReference({
            market_product: 'SYNTHETIC_ETHANOL',
            delivery_point_id: 'port-456',
            availability_window: '2026-Q3',
            visibility: 'internal',
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url] = fetchMock.mock.calls[0] ?? [];
        expect(String(url)).toContain('/prices/reference?');
        expect(String(url)).toContain('market_product=SYNTHETIC_ETHANOL');
        expect(String(url)).toContain('delivery_point_id=port-456');
        expect(String(url)).toContain('availability_window=2026-Q3');
        expect(String(url)).toContain('visibility=internal');
    });
});
