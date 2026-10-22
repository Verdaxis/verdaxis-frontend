import type { Query, QueryClient } from '@tanstack/react-query';
import { subscribeReadInvalidations } from '../../services/readCache';
import { subscribePublicMarketBatch } from '../../services/publicMarketSync';
import { createRefreshCoordinator } from './refreshCoordinator';
import { registeredRefresh } from './refreshRegistry';

export function clearPrivateQueries(client: QueryClient): void {
    // cancelQueries detaches the retryer synchronously; a late transport result
    // cannot apply to the removed query even when it ignores AbortSignal.
    void client.cancelQueries({ queryKey: ['private'] });
    client.removeQueries({ queryKey: ['private'] });
}

const isPricingOverlayQuery = (query: Query) => query.queryKey[0] === 'private'
    && query.queryKey[2] === 'compliance' && query.queryKey[3] === 'pricing-overlay';

// The pricing overlay is keyed by the settled ASK ids. A generic refresh starts
// a read for the old ids, then the listings answer changes the key and starts
// the read that was actually wanted. The marketplace hook owns that key.
const isFeatureQuery = (query: Query) => !isPricingOverlayQuery(query) && (
    (query.queryKey[0] === 'public' && query.queryKey[1] === 'orderbook')
    || (query.queryKey[0] === 'private' && ['orderbook', 'compliance'].includes(String(query.queryKey[2])))
);

export function attachQueryInvalidation(client: QueryClient, initiallyVisible = true) {
    const coordinator = createRefreshCoordinator(initiallyVisible);
    const subscriptions = new Map<string, () => void>();
    const waitingForBatch = new Map<string, Query>();
    const lastEventAt = new WeakMap<Query, number>();
    const readStartedAt = new WeakMap<Query, number>();
    const refresh = (query: Query) => {
        if (!query.isActive()) return Promise.resolve();
        const registered = registeredRefresh(client, query.queryHash);
        if (registered) return registered.flush();
        // Do not cancel an older read to service a newer freshness signal.
        // Completion is followed by the coordinator's single dirty rerun.
        const running = query.state.fetchStatus === 'fetching' ? query.promise : undefined;
        return Promise.resolve(running).catch(() => undefined).then(() => {
            readStartedAt.set(query, Date.now());
            return client.refetchQueries({ queryKey: query.queryKey, exact: true, type: 'active' }, { cancelRefetch: false });
        });
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
            registeredRefresh(client, query.queryHash)?.invalidate();
            void client.invalidateQueries({ queryKey: query.queryKey, exact: true, refetchType: 'none' });
            if (cause === 'event') {
                lastEventAt.set(query, Date.now());
                waitingForBatch.set(query.queryHash, query);
            } else if (cause !== 'mutation-start') coordinator.markDirty(query.queryHash);
        }
    });
    const detachBatch = subscribePublicMarketBatch(() => {
        for (const [key, query] of waitingForBatch) {
            // A read that started after the batch's last event was received
            // already includes that event's change: the server publishes after
            // commit. Every other case reads.
            const readStarted = readStartedAt.get(query);
            const lastEvent = lastEventAt.get(query);
            if (readStarted !== undefined && lastEvent !== undefined && readStarted > lastEvent) continue;
            coordinator.markDirty(key, 0);
        }
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
