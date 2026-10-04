import { afterEach, describe, expect, it, vi } from 'vitest';

import { reliability } from '../services/analytics';
import { ApiOutcomeUnknownError, api } from '../services/api';
import { clearAccessToken, setAccessToken } from '../services/authToken';

const sessionToken = (subject: string, version: number): string =>
    'header.' + btoa(JSON.stringify({ sub: subject, version })) + '.signature';

const tradeRequest = {
    order_id: 'order-1',
    quantity_mt: 100,
    expected_terms_digest: 'digest-1',
    idempotency_key: 'request-1',
};

describe('mutation outcome classification', () => {
    afterEach(() => {
        clearAccessToken();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('preserves a lock-busy HTTP 503 response as an unknown mutation outcome', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ detail: 'Idempotency key is busy; retry the same request' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } },
        )));

        await expect(api.trades.initiate(tradeRequest)).rejects.toBeInstanceOf(ApiOutcomeUnknownError);
    });

    it('reports backend unavailability when a refreshed mutation retry returns 503', async () => {
        setAccessToken(sessionToken('user-1', 1));
        const reportBackendUnavailable = vi
            .spyOn(reliability, 'reportBackendUnavailable')
            .mockImplementation(() => undefined);
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(
                JSON.stringify({ detail: 'Access token expired' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } },
            ))
            .mockResolvedValueOnce(new Response(
                JSON.stringify({ access_token: sessionToken('user-1', 2) }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            ))
            .mockResolvedValueOnce(new Response(
                JSON.stringify({ detail: 'Service unavailable' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } },
            ));
        vi.stubGlobal('fetch', fetchMock);

        await expect(api.trades.initiate(tradeRequest)).rejects.toBeInstanceOf(ApiOutcomeUnknownError);

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
            expect.stringMatching(/\/trades\/$/),
            expect.stringMatching(/\/auth\/refresh$/),
            expect.stringMatching(/\/trades\/$/),
        ]);
        expect(reportBackendUnavailable).toHaveBeenCalledTimes(1);
    });

    it('keeps an HTTP 422 response as an authoritative rejection', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ detail: { code: 'INVALID_TRADE', message: 'Quantity is invalid.' } }),
            { status: 422, headers: { 'Content-Type': 'application/json' } },
        )));

        await expect(api.trades.initiate(tradeRequest)).rejects.toMatchObject({
            name: 'ApiError',
            status: 422,
            code: 'INVALID_TRADE',
        });
    });

    it('sends an idempotency key for every named command adapter', async () => {
        const jsonResponse = () => new Response(JSON.stringify({ id: 'result-1' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
        const fetchMock = vi.fn()
            .mockImplementationOnce(async () => jsonResponse())
            .mockImplementationOnce(async () => jsonResponse())
            .mockImplementationOnce(async () => jsonResponse())
            .mockImplementationOnce(async () => jsonResponse())
            .mockImplementationOnce(async () => jsonResponse())
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        vi.stubGlobal('fetch', fetchMock);

        await api.trades.confirm('trade-1', 'confirm-key');
        await api.trades.decline('trade-2', 'decline-key');
        await api.trades.deliver('trade-3', { final_quantity_mt: 12.5, final_price_per_mt: 701.25 }, 'deliver-key');
        await api.trades.pay('trade-4', 'pay-key');
        await api.orderbook.update('order-1', { price_per_mt_usd: 700 }, 'amend-key');
        await api.orderbook.cancel('order-2', { reason: 'No longer needed', etag: '"v3"', idempotencyKey: 'cancel-key' });

        expect(fetchMock.mock.calls.map(([, options]) => new Headers(options?.headers).get('Idempotency-Key'))).toEqual([
            'confirm-key',
            'decline-key',
            'deliver-key',
            'pay-key',
            'amend-key',
            'cancel-key',
        ]);
        const cancelOptions = fetchMock.mock.calls[5][1];
        expect(new Headers(cancelOptions?.headers).get('If-Match')).toBe('"v3"');
        expect(JSON.parse(String(cancelOptions?.body))).toEqual({ reason: 'No longer needed' });
    });
});
