import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';
import { setAccessToken } from '../services/authToken';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('auth API client', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
        setAccessToken('access-token-123');
    });

    afterEach(() => {
        setAccessToken(null);
        vi.unstubAllGlobals();
    });

    it('requests a fresh stream token with the auth header', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ stream_token: 'stream-token-456' }));

        const streamToken = await api.auth.getStreamToken();

        expect(streamToken).toBe('stream-token-456');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, options] = fetchMock.mock.calls[0] ?? [];
        expect(String(url)).toContain('/auth/stream-token');
        expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer access-token-123');
    });
});
