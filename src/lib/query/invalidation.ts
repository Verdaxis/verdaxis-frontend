import { hashKey, type Query, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { subscribeReadInvalidations } from '../../services/readCache';
import { subscribePublicMarketBatch } from '../../services/publicMarketSync';
import {
    createRefreshCoordinator, createRefreshLifecycle, type RefreshLifecycle, type RefreshReads,
} from './refreshCoordinator';

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

export function clearPrivateQueries(client: QueryClient): void {
    // cancelQueries detaches the retryer synchronously; a late transport result
    // cannot apply to the removed query even when it ignores AbortSignal.
    void client.cancelQueries({ queryKey: ['private'] });
    client.removeQueries({ queryKey: ['private'] });
}

const isFeatureQuery = (query: Query) => (
    query.queryKey[0] === 'public' && query.queryKey[1] === 'orderbook'
) || (
    query.queryKey[0] === 'private' && ['orderbook', 'compliance'].includes(String(query.queryKey[2]))
);

export function attachQueryInvalidation(client: QueryClient, initiallyVisible = true) {
    const coordinator = createRefreshCoordinator(initiallyVisible);
    const subscriptions = new Map<string, () => void>();
    const waitingForBatch = new Set<string>();
    const refresh = (query: Query) => {
        if (!query.isActive()) return Promise.resolve();
        const registered = registeredRefreshes.get(client)?.get(query.queryHash);
        if (registered) return registered.flush();
        // Do not cancel an older read to service a newer freshness signal.
        // Completion is followed by the coordinator's single dirty rerun.
        const running = query.state.fetchStatus === 'fetching' ? query.promise : undefined;
        return Promise.resolve(running).catch(() => undefined).then(() =>
            client.refetchQueries({ queryKey: query.queryKey, exact: true, type: 'active' }, { cancelRefetch: false }));
    };
    const observe = (query: Query) => {
        if (!isFeatureQuery(query) || subscriptions.has(query.queryHash)) return;
        subscriptions.set(query.queryHash, coordinator.subscribe(query.queryHash, () => refresh(query)));
    };
    client.getQueryCache().getAll().forEach(observe);
    const detachCache = client.getQueryCache().subscribe(event => {
        if (event.type === 'removed') {
            subscriptions.get(event.query.queryHash)?.();
            subscriptions.delete(event.query.queryHash);
            waitingForBatch.delete(event.query.queryHash);
        } else observe(event.query);
    });
    const detachInvalidation = subscribeReadInvalidations(({ prefixes, cause }) => {
        if (cause === 'scope-clear') { clearPrivateQueries(client); return; }
        if (!prefixes.some(prefix => prefix.startsWith('orderbook:'))) return;
        for (const query of client.getQueryCache().getAll().filter(isFeatureQuery)) {
            registeredRefreshes.get(client)?.get(query.queryHash)?.invalidate();
            void client.invalidateQueries({ queryKey: query.queryKey, exact: true, refetchType: 'none' });
            if (cause === 'event') waitingForBatch.add(query.queryHash);
            else if (cause !== 'mutation-start') coordinator.markDirty(query.queryHash);
        }
    });
    const detachBatch = subscribePublicMarketBatch(() => {
        for (const key of waitingForBatch) coordinator.markDirty(key, 0);
        waitingForBatch.clear();
    });
    return {
        setVisible: coordinator.setVisible,
        dispose() {
            detachInvalidation(); detachBatch(); detachCache();
            subscriptions.forEach(detach => detach());
            subscriptions.clear(); waitingForBatch.clear(); coordinator.dispose();
        },
    };
}
