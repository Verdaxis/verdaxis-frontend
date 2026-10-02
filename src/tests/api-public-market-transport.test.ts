import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    ApiError,
    api,
    isPublicMarketReadRequest,
} from '../services/api';
import {
    clearAccessToken,
    refreshSession,
    setAccessToken,
} from '../services/authToken';
import {
    clearMarketSupportContextId,
    MARKET_SUPPORT_CONTEXT_HEADER,
    setMarketSupportContextId,
} from '../services/marketSupportContextStore';
import { invalidateReadCache } from '../services/readCache';

const ACCESS_TOKEN = 'public-read-regression-token';
const CONTEXT_ID = 'ctx-public-read-regression';

function successfulJson(body: unknown = {}): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

function expectPrivateHeaders(options: RequestInit | undefined, withContext = false): void {
    const headers = new Headers(options?.headers);
    expect(headers.get('Authorization')).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get(MARKET_SUPPORT_CONTEXT_HEADER)).toBe(withContext ? CONTEXT_ID : null);
    expect(options?.credentials).not.toBe('omit');
}

describe('public market API transport', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        invalidateReadCache();
        sessionStorage.clear();
        setAccessToken(ACCESS_TOKEN);
        setMarketSupportContextId(CONTEXT_ID);
    });

    afterEach(() => {
        clearMarketSupportContextId();
        clearAccessToken();
    });

    it('uses an explicit, method-sensitive public GET allowlist', () => {
        expect(isPublicMarketReadRequest('/orderbook/bids?limit=20')).toBe(true);
        expect(isPublicMarketReadRequest('/orderbook/asks')).toBe(true);
        expect(isPublicMarketReadRequest('/orderbook/product-counts')).toBe(true);
        expect(isPublicMarketReadRequest('/orderbook/map-summary')).toBe(true);
        expect(isPublicMarketReadRequest('/orderbook/map-summary/compact')).toBe(true);
        expect(isPublicMarketReadRequest('/curves/forward/table?windows=SPOT')).toBe(true);
        expect(isPublicMarketReadRequest('/curves/forward/slice?market_product=B30')).toBe(true);
        expect(isPublicMarketReadRequest('/catalog/products')).toBe(true);
        expect(isPublicMarketReadRequest('/catalog/delivery-points')).toBe(true);
        expect(isPublicMarketReadRequest('/ports')).toBe(true);

        expect(isPublicMarketReadRequest('/orderbook/my')).toBe(false);
        expect(isPublicMarketReadRequest('/orderbook/bids/history')).toBe(false);
        expect(isPublicMarketReadRequest('/orderbook/bids', 'POST')).toBe(false);
        expect(isPublicMarketReadRequest('/catalog/products/private')).toBe(false);
        expect(isPublicMarketReadRequest('/catalog/products', 'POST')).toBe(false);
        expect(isPublicMarketReadRequest('/ports/sg-sin')).toBe(false);
        expect(isPublicMarketReadRequest('/ports', 'POST')).toBe(false);
    });

    it('omits private headers and cookies from every public market read', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => (
            String(input).includes('/catalog/') || String(input).endsWith('/ports')
                ? successfulJson([])
                : successfulJson({ items: [] })
        ));

        await api.orderbook.listBids(undefined, { force: true });
        await api.orderbook.listAsks(undefined, { force: true });
        await api.orderbook.productCounts({ side: 'ASK' }, { force: true });
        await api.orderbook.mapSummary({ force: true });
        await api.orderbook.compactMapSummary({ force: true });
        await api.curves.table(undefined, { force: true });
        await api.curves.slice({
            market_product: 'B30',
            delivery_point_id: 'delivery-point-1',
            availability_window: 'SPOT',
        }, { force: true });
        await api.catalog.products({ force: true });
        await api.catalog.deliveryPoints({ force: true });
        await api.ports.list();

        expect(fetchMock).toHaveBeenCalledTimes(10);
        for (const [, options] of fetchMock.mock.calls) {
            expect([...new Headers(options?.headers).entries()]).toEqual([]);
            expect(options?.credentials).toBe('omit');
        }
    });

    it('does not refresh authentication after a public market 401', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
            JSON.stringify({ detail: 'Unauthorized' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
        ));

        const error = await api.orderbook.compactMapSummary({ force: true }).catch(caught => caught);

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status: 401, message: 'Unauthorized' });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/orderbook/map-summary/compact');
    });

    it('keeps private market, port detail, notification, and watchlist reads credentialed', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => successfulJson({ items: [] }));

        await api.orderbook.myOrders({ force: true });
        await api.ports.getById('sg-sin');
        await api.notifications.list();
        await api.watchlists.list({ force: true });

        expectPrivateHeaders(fetchMock.mock.calls[0]?.[1], true);
        expectPrivateHeaders(fetchMock.mock.calls[1]?.[1]);
        expectPrivateHeaders(fetchMock.mock.calls[2]?.[1]);
        expectPrivateHeaders(fetchMock.mock.calls[3]?.[1]);
    });

    it('keeps auth refresh cookie credentials', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));

        await refreshSession();

        const [url, options] = fetchMock.mock.calls[0] ?? [];
        expect(String(url)).toContain('/auth/refresh');
        expect(options?.credentials).toBe('include');
        expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json');
    });

    it('keeps authenticated order mutations scoped to the support context', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulJson({ id: 'order-1' }));

        await api.orderbook.create({
            side: 'BID',
            product_id: 'product-1',
            quantity_mt: 100,
            price_per_mt_usd: 500,
            availability_window: 'SPOT',
        });

        const [url, options] = fetchMock.mock.calls[0] ?? [];
        expect(String(url)).toContain('/orderbook');
        expect(options?.method).toBe('POST');
        expectPrivateHeaders(options, true);
    });
});
