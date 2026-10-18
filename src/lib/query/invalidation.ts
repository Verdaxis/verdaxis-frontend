import type { Query, QueryClient } from '@tanstack/react-query';
import { subscribeReadInvalidations } from '../../services/readCache';
import { subscribePublicMarketBatch } from '../../services/publicMarketSync';
import { createRefreshCoordinator } from './refreshCoordinator';

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
