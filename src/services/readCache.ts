import { getAuthGeneration } from './authToken';
import { getMarketSupportContextId } from './marketSupportContextStore';

export const READ_CACHE_TTL_MS = {
    reference: 5 * 60_000,
    market: 15_000,
    private: 10_000,
} as const;

const MAX_CACHE_ENTRIES = 64;

interface CachedValue {
    expiresAt: number;
    resourceKey: string;
    value: unknown;
}

interface PendingValue {
    promise: Promise<unknown>;
    resourceKey: string;
}

const values = new Map<string, CachedValue>();
const pending = new Map<string, PendingValue>();
let principal = { userId: '', organizationId: '' };

const privateScope = (): string => {
    const context = getMarketSupportContextId() ?? 'none';
    return `${getAuthGeneration()}|${principal.userId}|${principal.organizationId}|${context}`;
};

const scopedKey = (resourceKey: string, scope: 'public' | 'private') => (
    `${scope}|${scope === 'private' ? privateScope() : 'shared'}|${resourceKey}`
);

const removeOldestValue = () => {
    const oldestKey = values.keys().next().value;
    if (oldestKey !== undefined) values.delete(oldestKey);
};

export const invalidateReadCache = (...resourcePrefixes: string[]): void => {
    if (resourcePrefixes.length === 0) {
        values.clear();
        pending.clear();
        return;
    }

    const matches = (resourceKey: string) => resourcePrefixes.some(prefix => resourceKey.startsWith(prefix));
    for (const [key, entry] of values) {
        if (matches(entry.resourceKey)) {
            values.delete(key);
        }
    }
    for (const [key, entry] of pending) {
        if (matches(entry.resourceKey)) {
            pending.delete(key);
        }
    }
};

export const setReadCachePrincipal = (userId?: string | null, organizationId?: string | null): void => {
    const next = {
        userId: userId ?? '',
        organizationId: organizationId ?? '',
    };
    if (next.userId === principal.userId && next.organizationId === principal.organizationId) return;
    principal = next;
    invalidateReadCache();
};

export const invalidateReadsForEvent = (channel: 'prices' | 'orderbook' | 'trades'): void => {
    if (channel === 'prices') {
        invalidateReadCache('prices:', 'curves:');
        return;
    }
    if (channel === 'orderbook') {
        invalidateReadCache('orderbook:', 'prices:', 'curves:', 'watchlists:');
        return;
    }
    invalidateReadCache('trades:', 'orderbook:', 'prices:', 'curves:', 'watchlists:');
};

export const cachedRead = <T>(
    resourceKey: string,
    scope: 'public' | 'private',
    ttlMs: number,
    load: () => Promise<T>,
    refresh = false,
): Promise<T> => {
    if (refresh) invalidateReadCache(resourceKey);

    const requestScope = scope === 'private' ? privateScope() : 'shared';
    const key = scopedKey(resourceKey, scope);
    const cached = values.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        values.delete(key);
        values.set(key, cached);
        return Promise.resolve().then(() => {
            if (scope === 'private' && privateScope() !== requestScope) {
                throw new DOMException('Request scope changed', 'AbortError');
            }
            return cached.value as T;
        });
    }
    if (cached) values.delete(key);

    const existing = pending.get(key);
    if (existing) return existing.promise as Promise<T>;

    let request: Promise<T>;
    request = load().then((value) => {
        const sameScope = scope === 'public' || privateScope() === requestScope;
        if (!sameScope) throw new DOMException('Request scope changed', 'AbortError');
        if (sameScope && pending.get(key)?.promise === request) {
            values.set(key, { expiresAt: Date.now() + ttlMs, resourceKey, value });
            while (values.size > MAX_CACHE_ENTRIES) removeOldestValue();
        }
        return value;
    }).finally(() => {
        if (pending.get(key)?.promise === request) pending.delete(key);
    });
    pending.set(key, { promise: request, resourceKey });
    return request;
};

if (typeof window !== 'undefined') {
    window.addEventListener('verdaxis:auth-logout', () => invalidateReadCache());
    window.addEventListener('verdaxis:market-support-context-invalidated', () => invalidateReadCache());
}
