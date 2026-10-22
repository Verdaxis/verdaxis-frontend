import { hashKey, type QueryClient, type QueryKey } from '@tanstack/react-query';

// Feature hooks import this module directly. It must stay free of the
// invalidation bridge and the refresh coordinator, so a route that registers a
// key does not load them.

export interface RefreshReads<T> {
    /** Ordinary read, normally the Query function. Must start a new request. */
    ordinary: () => Promise<T>;
    /** Forced read, such as a visibility or network resume. Must start a new request. */
    forced: () => Promise<T>;
}

export interface RefreshLifecycle<T> {
    /** Ordinary read for Query. Joins any request already in flight. */
    ordinary(): Promise<T>;
    /** Forced read. Joins a forced request already in flight. */
    force(): Promise<T>;
    /** Records a freshness signal that a later read must cover. */
    invalidate(): void;
    /** Resolves when no signal remains uncovered, reading once per uncovered batch. */
    flush(): Promise<void>;
    /** Ends the lifecycle: pending signals are dropped and new reads are refused. */
    dispose(): void;
}

/**
 * Per-key request ownership. It holds no value cache, clock or scheduler.
 *
 * Every freshness signal advances `revision`. A read covers every signal that
 * arrived before it started, so one forced resume read satisfies all signals
 * received while the tab was hidden. A signal that arrives after a read started
 * is not covered by it and costs exactly one further read.
 */
export function createRefreshLifecycle<T>(reads: RefreshReads<T>, onDispose?: () => void): RefreshLifecycle<T> {
    let disposed = false;
    let revision = 0;
    let covered = 0;
    let ordinary: Promise<T> | undefined;
    let forced: Promise<T> | undefined;
    let flushing: Promise<void> | undefined;
    const ended = () => Promise.reject<T>(new DOMException('Refresh lifecycle ended', 'AbortError'));

    const start = (kind: 'ordinary' | 'forced'): Promise<T> => {
        if (disposed) return ended();
        // A forced read already answers an ordinary request. A signal that
        // arrived after it started is read once by flush(), not here.
        if (forced) return forced;
        if (kind === 'ordinary' && ordinary) return ordinary;
        covered = revision;
        let request: Promise<T>;
        try { request = Promise.resolve(reads[kind]()); }
        catch (error) { request = Promise.reject(error); }
        const tracked = request.finally(() => {
            if (kind === 'forced' && forced === tracked) forced = undefined;
            if (kind === 'ordinary' && ordinary === tracked) ordinary = undefined;
        });
        if (kind === 'forced') forced = tracked;
        else ordinary = tracked;
        return tracked;
    };

    const drain = async () => {
        // Always asynchronous, so `flushing` is assigned before it can be cleared.
        await undefined;
        try {
            while (!disposed) {
                const inFlight = [ordinary, forced].filter((request): request is Promise<T> => Boolean(request));
                if (inFlight.length) await Promise.allSettled(inFlight);
                if (disposed || covered >= revision) return;
                await start('ordinary').catch(() => undefined);
            }
        } finally { flushing = undefined; }
    };

    return {
        ordinary: () => start('ordinary'),
        force: () => start('forced'),
        invalidate() { if (!disposed) revision += 1; },
        flush() {
            if (disposed) return Promise.resolve();
            flushing ??= drain();
            return flushing;
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            covered = revision;
            onDispose?.();
        },
    };
}

const registeredRefreshes = new WeakMap<QueryClient, Map<string, RefreshLifecycle<unknown>>>();

/**
 * Registers the ordinary and forced reads of one feature query key, so the
 * shared bridge and the feature hook coordinate through one request owner.
 *
 * The hook must route its Query function through `ordinary` and every resume
 * or manual read through `force`. A freshness signal then costs one read in
 * total: a forced read covers every signal received before it started, and the
 * bridge reads again only for a signal that arrived after the last read began.
 * Without a registration the bridge refetches through Query as before.
 *
 * The registration ends when the hook calls `dispose` (unmount or scope
 * change) or when the query leaves the cache (client clear, removal or scope
 * clear). Registering the same key again replaces the earlier registration.
 */
export function registerQueryRefresh<T>(client: QueryClient, queryKey: QueryKey, reads: RefreshReads<T>): RefreshLifecycle<T> {
    let registrations = registeredRefreshes.get(client);
    if (!registrations) {
        registrations = new Map();
        registeredRefreshes.set(client, registrations);
    }
    const owned = registrations;
    const hash = hashKey(queryKey);
    owned.get(hash)?.dispose();
    const detachCache = client.getQueryCache().subscribe(event => {
        if (event.type === 'removed' && event.query.queryHash === hash) lifecycle.dispose();
    });
    const lifecycle = createRefreshLifecycle(reads, () => {
        detachCache();
        if (owned.get(hash) === lifecycle) owned.delete(hash);
    });
    owned.set(hash, lifecycle);
    return lifecycle;
}

/** The live registration for a query hash, for the invalidation bridge. */
export function registeredRefresh(client: QueryClient, queryHash: string): RefreshLifecycle<unknown> | undefined {
    return registeredRefreshes.get(client)?.get(queryHash);
}
