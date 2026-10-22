import { describe, expect, it } from 'vitest';
import { QueryObserver } from '@tanstack/react-query';
import { createQueryClient } from '../lib/query/client';
import { queryKeys } from '../lib/query/keys';

describe('Query runtime policy', () => {
    it('uses explicit no-retry and no-browser-refetch defaults', () => {
        const client = createQueryClient();
        expect(client.getDefaultOptions().queries).toMatchObject({
            retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false,
            refetchIntervalInBackground: false, gcTime: 300_000,
        });
        expect(client.getDefaultOptions().mutations?.retry).toBe(false);
        expect(client.getQueryDefaults(['private']).gcTime).toBe(0);
        expect(createQueryClient()).not.toBe(client);
        client.clear();
    });

    it('normalizes absent public dimensions and keeps every selection dimension', () => {
        const base = { side: 'ASK' as const, skip: 0 };
        const key = queryKeys.listings(base);
        expect(key).toEqual(['public', 'orderbook', 'listings', 'ASK', {
            region: null, deliveryPointId: null, product: null, window: null,
            sort: null, skip: 0, limit: 8,
        }]);
        expect(queryKeys.listings({ ...base, region: '' })).toEqual(key);
        for (const change of [{ side: 'BID' as const }, { skip: 8 }, { sort: 'newest' },
            { region: 'Singapore' }, { deliveryPointId: 'sg' }, { product: 'B30' }, { window: 'SPOT' }]) {
            expect(queryKeys.listings({ ...base, ...change })).not.toEqual(key);
        }
        expect(queryKeys.counts({ ...base, product: 'B30' })).toEqual(queryKeys.counts({ ...base, product: 'B100' }));
        expect(queryKeys.snapshot('B30', 'sg', 'SPOT')).toEqual(['public', 'orderbook', 'snapshot', 'B30', 'sg', 'SPOT']);
    });

    it('keys private data by all scope dimensions and canonical ask ids', () => {
        const scope = [1, 'user', 'org', null] as const;
        expect(queryKeys.overlay(scope, ['b', 'a', 'a'])).toEqual(queryKeys.overlay(scope, ['a', 'b']));
        for (const next of [[2, 'user', 'org', null], [1, 'other', 'org', null],
            [1, 'user', 'other', null], [1, 'user', 'org', 'support']] as const) {
            expect(queryKeys.myOrders(next)).not.toEqual(queryKeys.myOrders(scope));
        }
    });

    it('bounds inactive feature values to 64 without evicting an observed query', () => {
        const client = createQueryClient();
        const activeKey = queryKeys.listings({ side: 'ASK', skip: 0 });
        client.setQueryData(activeKey, ['active']);
        const observer = new QueryObserver(client, { queryKey: activeKey, enabled: false });
        const unsubscribe = observer.subscribe(() => {});
        for (let skip = 1; skip <= 70; skip += 1) {
            client.setQueryData(queryKeys.listings({ side: 'ASK', skip }), [skip]);
        }
        expect(client.getQueryCache().getAll().length).toBeLessThanOrEqual(64);
        expect(client.getQueryData(activeKey)).toEqual(['active']);
        unsubscribe();
        client.clear();
    });
});
