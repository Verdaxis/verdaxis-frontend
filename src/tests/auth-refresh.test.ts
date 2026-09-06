import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

async function loadAuthTokenModule() {
    vi.resetModules();
    return import('../services/authToken');
}

describe('shared auth refresh', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        localStorage.clear();
        sessionStorage.clear();
    });

    it('shares one in-flight refresh request between concurrent callers', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ access_token: 'fresh-access-token' }));
        const { refreshAccessToken } = await loadAuthTokenModule();

        const [firstToken, secondToken] = await Promise.all([
            refreshAccessToken(),
            refreshAccessToken(),
        ]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/auth/refresh');
        expect(firstToken).toBe('fresh-access-token');
        expect(secondToken).toBe('fresh-access-token');
    });

    it('returns null and clears the token when refresh fails', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ detail: 'unauthorized' }, 401));
        const { getAccessToken, refreshAccessToken, setAccessToken } = await loadAuthTokenModule();
        setAccessToken('stale-access-token');

        const refreshedToken = await refreshAccessToken();

        expect(refreshedToken).toBeNull();
        expect(getAccessToken()).toBeNull();
    });

    it('keeps the in-memory token when the backend is transiently unavailable', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ detail: 'bad gateway' }, 503));
        const { getAccessToken, refreshSession, setAccessToken } = await loadAuthTokenModule();
        setAccessToken('still-valid-access-token');

        const outcome = await refreshSession();

        expect(outcome.status).toBe('unavailable');
        expect(getAccessToken()).toBe('still-valid-access-token');
    });

    it('keeps the in-memory token when the refresh request throws (network error)', async () => {
        fetchMock.mockRejectedValue(new TypeError('network down'));
        const { getAccessToken, refreshSession, setAccessToken } = await loadAuthTokenModule();
        setAccessToken('still-valid-access-token');

        const outcome = await refreshSession();

        expect(outcome.status).toBe('unavailable');
        expect(getAccessToken()).toBe('still-valid-access-token');
    });

    it('stores a successful refresh token in memory', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ access_token: 'fresh-access-token' }));
        const { getAccessToken, refreshAccessToken } = await loadAuthTokenModule();

        const refreshedToken = await refreshAccessToken();

        expect(refreshedToken).toBe('fresh-access-token');
        expect(getAccessToken()).toBe('fresh-access-token');
    });

    it.each(['logout', 'account switch'])('ignores a refresh completed after %s', async (change) => {
        let complete!: (response: Response) => void;
        fetchMock.mockReturnValue(new Promise<Response>(resolve => { complete = resolve; }));
        const { refreshSession, setAccessToken, clearAccessToken, getAccessToken } = await loadAuthTokenModule();
        setAccessToken('old-account');
        const pending = refreshSession();

        if (change === 'logout') clearAccessToken();
        else setAccessToken('new-account');
        complete(jsonResponse({ access_token: 'late-old-account' }));

        const result = await pending;
        expect(getAccessToken()).toBe(change === 'logout' ? null : 'new-account');
        expect(result).toEqual({ status: 'superseded' });
    });

    it('does not let an old refresh rejection clear a new account', async () => {
        let complete!: (response: Response) => void;
        fetchMock.mockReturnValue(new Promise<Response>(resolve => { complete = resolve; }));
        const { refreshSession, setAccessToken, getAccessToken } = await loadAuthTokenModule();
        setAccessToken('old-account');
        const pending = refreshSession();
        setAccessToken('new-account');
        complete(jsonResponse({ detail: 'revoked' }, 401));

        expect(await pending).toEqual({ status: 'superseded' });
        expect(getAccessToken()).toBe('new-account');
    });

    it('bounds a refresh request without discarding a valid token on timeout', async () => {
        const abort = new AbortController();
        const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(abort.signal);
        fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
            options.signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'TimeoutError')));
        }));
        try {
            const { refreshSession, setAccessToken, getAccessToken } = await loadAuthTokenModule();
            setAccessToken('still-valid');
            const pending = refreshSession();
            expect(timeout).toHaveBeenCalledWith(15000);
            abort.abort();
            expect(await pending).toEqual({ status: 'unavailable' });
            expect(getAccessToken()).toBe('still-valid');
        } finally {
            timeout.mockRestore();
        }
    });
});
