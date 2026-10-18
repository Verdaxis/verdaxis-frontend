import { queryOptions } from '@tanstack/react-query';
import type { QueryScope } from '../../../lib/query/keys';
import { marketplaceApi, type MarketplaceReadSelection } from './marketplaceApi';
import { marketplaceKeys } from './marketplaceKeys';

export const marketplaceQueries = {
    products: () => queryOptions({ queryKey: marketplaceKeys.products(),
        queryFn: ({ signal }) => marketplaceApi.products(signal), staleTime: 300_000, retry: false }),
    deliveryPoints: () => queryOptions({ queryKey: marketplaceKeys.deliveryPoints(),
        queryFn: ({ signal }) => marketplaceApi.deliveryPoints(signal), staleTime: 300_000, retry: false }),
    listings: (selection: MarketplaceReadSelection) => queryOptions({ queryKey: marketplaceKeys.listings(selection),
        queryFn: ({ signal }) => marketplaceApi.listings(selection, signal), staleTime: 15_000, retry: false }),
    counts: (selection: MarketplaceReadSelection) => queryOptions({ queryKey: marketplaceKeys.counts(selection),
        queryFn: ({ signal }) => marketplaceApi.counts(selection, signal), staleTime: 15_000, retry: false }),
    myOrders: (scope: QueryScope) => queryOptions({ queryKey: marketplaceKeys.myOrders(scope),
        queryFn: ({ signal }) => marketplaceApi.myOrders(signal), staleTime: 10_000, gcTime: 0, retry: false }),
    overlay: (scope: QueryScope, askIds: readonly string[]) => {
        const ids = [...new Set(askIds)].sort();
        return queryOptions({ queryKey: marketplaceKeys.overlay(scope, ids),
            queryFn: ({ signal }) => marketplaceApi.pricingOverlay(ids, signal), staleTime: 0, gcTime: 0,
            enabled: ids.length > 0, retry: false });
    },
};
