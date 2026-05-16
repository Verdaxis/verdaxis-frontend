import { afterEach, describe, expect, it, vi } from 'vitest';

import { __resetApiReadCachesForTests, api } from '../services/api';
import { clearAccessToken, setAccessToken } from '../services/authToken';

const fetchMock = vi.fn();
const jsonResponse = (body: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });

describe('price discovery API client', () => {
    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllGlobals();
        vi.useRealTimers();
        clearAccessToken();
        __resetApiReadCachesForTests();
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
        expect(String(url)).toContain('/prices/reference?');
        expect(String(url)).toContain('market_product=SYNTHETIC_ETHANOL');
        expect(String(url)).toContain('delivery_point_id=port-456');
        expect(String(url)).toContain('availability_window=2026-Q3');
        expect(String(url)).toContain('visibility=internal');
        expect(String(url)).toContain('from=2026-01-01');
        expect(String(url)).toContain('to=2026-03-01');
        expect(String(url)).not.toContain('date_from=');
        expect(String(url)).not.toContain('date_to=');
    });

    it('coalesces and reuses price summary reads by exact filter and auth scope', async () => {
        fetchMock.mockImplementation(() =>
            Promise.resolve(jsonResponse({ summaries: [], generated_at: '2026-04-14T00:00:00Z' }))
        );
        vi.stubGlobal('fetch', fetchMock);

        setAccessToken('token-a');
        await Promise.all([
            api.prices.getSummaries({ market_product: 'BIO_METHANOL', delivery_point_id: 'port-123' }),
            api.prices.getSummaries({ market_product: 'BIO_METHANOL', delivery_point_id: 'port-123' }),
        ]);
        await api.prices.getSummaries({ market_product: 'BIO_METHANOL', delivery_point_id: 'port-123' });

        setAccessToken('token-b');
        await api.prices.getSummaries({ market_product: 'BIO_METHANOL', delivery_point_id: 'port-123' });
        await api.prices.getSummaries({ market_product: 'E_METHANOL', delivery_point_id: 'port-123' });

        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('keeps reference price visibility filters in separate cache entries', async () => {
        fetchMock.mockImplementation(() =>
            Promise.resolve(jsonResponse({ prices: [], generated_at: '2026-04-14T00:00:00Z' }))
        );
        vi.stubGlobal('fetch', fetchMock);

        await api.prices.getReference({ market_product: 'BIO_METHANOL', visibility: 'internal' });
        await api.prices.getReference({ market_product: 'BIO_METHANOL', visibility: 'internal' });
        await api.prices.getReference({ market_product: 'BIO_METHANOL', visibility: 'external' });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('visibility=internal');
        expect(String(fetchMock.mock.calls[1]?.[0])).toContain('visibility=external');
    });

    it('does not cache failed market-data reads', async () => {
        fetchMock
            .mockResolvedValueOnce(new Response('upstream failed', { status: 500 }))
            .mockResolvedValueOnce(
                jsonResponse({ summaries: [], generated_at: '2026-04-14T00:00:00Z' })
            );
        vi.stubGlobal('fetch', fetchMock);

        await expect(api.prices.getSummaries({ market_product: 'BIO_ETHANOL' })).rejects.toThrow('upstream failed');
        await expect(api.prices.getSummaries({ market_product: 'BIO_ETHANOL' })).resolves.toEqual({
            summaries: [],
            generated_at: '2026-04-14T00:00:00Z',
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('expires forward curve cache after its short freshness window and supports forced refresh', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-14T00:00:00Z'));
        fetchMock.mockImplementation(() =>
            Promise.resolve(jsonResponse({ curve: [], generated_at: '2026-04-14T00:00:00Z' }))
        );
        vi.stubGlobal('fetch', fetchMock);

        await api.curves.forward({ product_id: 'product-1', delivery_point_id: 'port-123' });
        await api.curves.forward({ product_id: 'product-1', delivery_point_id: 'port-123' });
        vi.setSystemTime(new Date('2026-04-14T00:00:11Z'));
        await api.curves.forward({ product_id: 'product-1', delivery_point_id: 'port-123' });
        await api.curves.forward({ product_id: 'product-1', delivery_point_id: 'port-123' }, { force: true });

        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('invalidates curve reads after local order mutations and price reads after trade lifecycle mutations', async () => {
        fetchMock.mockImplementation(() =>
            Promise.resolve(jsonResponse({ curve: [], prices: [], generated_at: '2026-04-14T00:00:00Z' }))
        );
        vi.stubGlobal('fetch', fetchMock);

        await api.curves.forward({ product_id: 'product-1' });
        await api.curves.forward({ product_id: 'product-1' });
        await api.orderbook.create({
            side: 'ASK',
            product_id: 'product-1',
            quantity_mt: 100,
            price_per_mt_usd: 600,
            availability_window: 'SPOT',
        });
        await api.curves.forward({ product_id: 'product-1' });

        await api.prices.getReference({ market_product: 'BIO_METHANOL', visibility: 'internal' });
        await api.prices.getReference({ market_product: 'BIO_METHANOL', visibility: 'internal' });
        await api.trades.confirm('trade-1');
        await api.prices.getReference({ market_product: 'BIO_METHANOL', visibility: 'internal' });

        const urls = fetchMock.mock.calls.map(([url]) => String(url));
        expect(urls.filter((url) => url.includes('/curves/forward?'))).toHaveLength(2);
        expect(urls.filter((url) => url.includes('/orderbook'))).toHaveLength(1);
        expect(urls.filter((url) => url.includes('/prices/reference?'))).toHaveLength(2);
        expect(urls.filter((url) => url.includes('/trades/trade-1/confirm'))).toHaveLength(1);
    });
});
