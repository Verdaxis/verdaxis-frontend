import { QueryCache, QueryClient } from '@tanstack/react-query';

const PUBLIC_VALUE_LIMIT = 64;

export function createQueryClient(): QueryClient {
    const cache = new QueryCache();
    const client = new QueryClient({
        queryCache: cache,
        defaultOptions: {
            queries: {
                retry: false,
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
                refetchIntervalInBackground: false,
                gcTime: 300_000,
            },
            mutations: { retry: false },
        },
    });
    client.setQueryDefaults(['private'], { gcTime: 0 });
    // This subscription belongs to the cache, not to a mounted provider.
    // It adds no external listener and dies with the isolated client.
    let pruning = false;
    cache.subscribe(() => {
        if (pruning) return;
        pruning = true;
        try {
            const values = cache.getAll().filter(query => query.queryKey[0] === 'public'
                && query.state.data !== undefined);
            const removable = values.filter(query => query.getObserversCount() === 0
                && query.state.fetchStatus === 'idle')
                .sort((left, right) => left.state.dataUpdatedAt - right.state.dataUpdatedAt);
            let excess = values.length - PUBLIC_VALUE_LIMIT;
            for (const query of removable) {
                if (excess <= 0) break;
                cache.remove(query);
                excess -= 1;
            }
        } finally {
            pruning = false;
        }
    });
    return client;
}
