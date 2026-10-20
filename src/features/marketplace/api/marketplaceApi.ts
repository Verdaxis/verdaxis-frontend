import type { OrderBookOrder } from '../../../types';
import { api, type PaginatedResult, type ReadCacheOptions } from '../../../services/api';
import { READ_CACHE_TTL_MS, primeReadCache } from '../../../services/readCache';

export interface MarketplaceReadSelection {
    side: 'ASK' | 'BID';
    region?: string | null;
    deliveryPointId?: string | null;
    product?: string | null;
    window?: string | null;
    sort?: 'price_asc' | 'price_desc' | 'quantity_desc' | 'newest' | null;
    skip?: number;
}
const queryRead = (signal?: AbortSignal): ReadCacheOptions => ({ cacheOwner: 'query', signal });
const scopeParams = (selection: MarketplaceReadSelection) => ({
    region: selection.deliveryPointId ? undefined : selection.region || undefined,
    delivery_point_id: selection.deliveryPointId || undefined,
    availability: selection.window || undefined,
});

export const marketplaceApi = {
    // Query owns these reads, but the order window still asks the shared cache
    // for the same references. Keep that cache warm so one read serves both.
    products: async (signal?: AbortSignal) => {
        const products = await api.catalog.products(queryRead(signal));
        primeReadCache('catalog:products', 'public', READ_CACHE_TTL_MS.reference, products);
        return products;
    },
    deliveryPoints: async (signal?: AbortSignal) => {
        const points = await api.catalog.deliveryPoints(queryRead(signal));
        primeReadCache('catalog:delivery-points', 'public', READ_CACHE_TTL_MS.reference, points);
        return points;
    },
    listings: (selection: MarketplaceReadSelection, signal?: AbortSignal): Promise<PaginatedResult<OrderBookOrder>> => {
        const params = { ...scopeParams(selection), market_product: selection.product || undefined,
            sort_by: selection.sort || undefined, skip: selection.skip ?? 0, limit: 8 };
        return selection.side === 'ASK'
            ? api.orderbook.listAsksPaged(params, queryRead(signal))
            : api.orderbook.listBidsPaged(params, queryRead(signal));
    },
    counts: (selection: MarketplaceReadSelection, signal?: AbortSignal) => api.orderbook.productCounts({
        region: selection.deliveryPointId ? undefined : selection.region || undefined,
        delivery_point_id: selection.deliveryPointId || undefined,
        availability_window: selection.window || undefined,
        side: selection.side, include_off_spec: false,
    }, queryRead(signal)),
    myOrders: (signal?: AbortSignal) => api.orderbook.myOrders(queryRead(signal)),
    pricingOverlay: (orderIds: string[], signal?: AbortSignal) => api.compliance.pricingOverlay(orderIds, queryRead(signal)),
};
