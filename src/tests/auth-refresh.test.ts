import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

function jwt(subject: string): string {
    const payload = btoa(JSON.stringify({ sub: subject }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return `header.${payload}.signature`;
}

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

    it.each([true, false])('retries a rotation conflict once and retains the session (success=%s)', async (succeeds) => {
        const { refreshSession, setAccessToken, getAccessToken } = await loadAuthTokenModule();
        const original = jwt('buyer');
        const rotated = jwt('buyer');
        const conflict = () => jsonResponse({ detail: {
            code: 'REFRESH_ROTATION_IN_PROGRESS', retry_after_seconds: 2,
        } }, 409);
        fetchMock.mockResolvedValueOnce(conflict()).mockResolvedValueOnce(
            succeeds ? jsonResponse({ access_token: rotated }) : conflict(),
        );
        setAccessToken(original);
        vi.useFakeTimers();
        try {
            const pending = refreshSession();
            expect(refreshSession()).toBe(pending);
            await vi.advanceTimersByTimeAsync(1999);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(getAccessToken()).toBe(original);
            await vi.advanceTimersByTimeAsync(1);
            expect(await pending).toEqual(succeeds
                ? { status: 'success', token: rotated }
                : { status: 'unavailable' });
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(getAccessToken()).toBe(succeeds ? rotated : original);
        } finally {
            vi.useRealTimers();
        }
    });

    it('does not retry a rotation conflict after logout', async () => {
        const { refreshSession, setAccessToken, clearAccessToken, getAccessToken } = await loadAuthTokenModule();
        fetchMock.mockResolvedValue(jsonResponse({ detail: {
            code: 'REFRESH_ROTATION_IN_PROGRESS', retry_after_seconds: 1,
        } }, 409));
        setAccessToken(jwt('buyer'));
        vi.useFakeTimers();
        try {
            const pending = refreshSession();
            await vi.advanceTimersByTimeAsync(0);
            clearAccessToken();
            await vi.advanceTimersByTimeAsync(1000);
            expect(await pending).toEqual({ status: 'superseded' });
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(getAccessToken()).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('keeps other conflicts terminal', async () => {
        const { refreshSession, setAccessToken, getAccessToken } = await loadAuthTokenModule();
        setAccessToken(jwt('buyer'));
        fetchMock.mockResolvedValue(jsonResponse({ detail: { code: 'OTHER_CONFLICT' } }, 409));
        expect(await refreshSession()).toEqual({ status: 'denied' });
        expect(getAccessToken()).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('stores a successful refresh token in memory', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ access_token: 'fresh-access-token' }));
        const { getAccessToken, refreshAccessToken } = await loadAuthTokenModule();

        const refreshedToken = await refreshAccessToken();

        expect(refreshedToken).toBe('fresh-access-token');
        expect(getAccessToken()).toBe('fresh-access-token');
    });

    it('invalidates an existing session when the refresh cookie belongs to another account', async () => {
        const oldAccountToken = jwt('user-a');
        const newAccountToken = jwt('user-b');
        fetchMock.mockImplementation(() => Promise.resolve(
            jsonResponse({ access_token: newAccountToken }),
        ));
        const {
            AUTH_IDENTITY_CHANGED_EVENT,
            getAccessToken,
            getAuthGeneration,
            refreshAccessToken,
            refreshSession,
            setAccessToken,
        } = await loadAuthTokenModule();
        setAccessToken(oldAccountToken);
        const generation = getAuthGeneration();
        const identityChanged = vi.fn();
        window.addEventListener(AUTH_IDENTITY_CHANGED_EVENT, identityChanged);

        try {
            await expect(refreshSession()).resolves.toEqual({ status: 'identity_changed' });
            expect(getAccessToken()).toBeNull();
            expect(getAuthGeneration()).toBeGreaterThan(generation);
            expect(identityChanged).toHaveBeenCalledTimes(1);

            // Generic API/SSE callers cannot immediately adopt the replacement
            // cookie while the old account UI is being cleared.
            await expect(refreshAccessToken()).resolves.toBeNull();
            expect(fetchMock).toHaveBeenCalledTimes(1);

            // AuthProvider may explicitly restore, then verifies /auth/me before
            // rendering the replacement account.
            await expect(refreshSession({ allowIdentityRestore: true })).resolves.toEqual({
                status: 'success',
                token: newAccountToken,
            });
            expect(getAccessToken()).toBe(newAccountToken);
            expect(fetchMock).toHaveBeenCalledTimes(2);
        } finally {
            window.removeEventListener(AUTH_IDENTITY_CHANGED_EVENT, identityChanged);
        }
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

    it('starts a new refresh independently after an account replacement', async () => {
        let completeOld!: (response: Response) => void;
        let completeNew!: (response: Response) => void;
        fetchMock
            .mockImplementationOnce(() => new Promise<Response>(resolve => { completeOld = resolve; }))
            .mockImplementationOnce(() => new Promise<Response>(resolve => { completeNew = resolve; }));
        const { refreshSession, setAccessToken, getAccessToken } = await loadAuthTokenModule();
        setAccessToken(jwt('old-account'));
        const oldRefresh = refreshSession();
        setAccessToken(jwt('new-account'));
        const newRefresh = refreshSession();

        expect(fetchMock).toHaveBeenCalledTimes(2);
        const refreshedNewAccount = jwt('new-account');
        completeNew(jsonResponse({ access_token: refreshedNewAccount }));
        expect(await newRefresh).toEqual({ status: 'success', token: refreshedNewAccount });
        completeOld(jsonResponse({ access_token: jwt('old-account') }));
        expect(await oldRefresh).toEqual({ status: 'superseded' });
        expect(getAccessToken()).toBe(refreshedNewAccount);
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
