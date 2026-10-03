import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiOutcomeUnknownError, api } from '../services/api';

const tradeRequest = {
    order_id: 'order-1',
    quantity_mt: 100,
    expected_terms_digest: 'digest-1',
    idempotency_key: 'request-1',
};

describe('mutation outcome classification', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('classifies an HTTP 5xx response as an unknown mutation outcome', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ detail: 'upstream timeout' }),
            { status: 504, headers: { 'Content-Type': 'application/json' } },
        )));

        await expect(api.trades.initiate(tradeRequest)).rejects.toBeInstanceOf(ApiOutcomeUnknownError);
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
});
