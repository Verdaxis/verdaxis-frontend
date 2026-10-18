export type QueryScope = readonly [number, string, string | null, string | null];

interface MarketSelection {
    side: 'ASK' | 'BID';
    region?: string | null;
    deliveryPointId?: string | null;
    product?: string | null;
    window?: string | null;
    sort?: string | null;
    skip?: number;
}

const absent = (value?: string | null) => value || null;
const marketScope = (selection: MarketSelection) => ({
    region: absent(selection.region),
    deliveryPointId: absent(selection.deliveryPointId),
    window: absent(selection.window),
});

export const queryKeys = {
    products: () => ['public', 'catalog', 'products'] as const,
    deliveryPoints: () => ['public', 'catalog', 'delivery-points'] as const,
    listings: (selection: MarketSelection) => ['public', 'orderbook', 'listings', selection.side, {
        ...marketScope(selection), product: absent(selection.product), sort: absent(selection.sort),
        skip: selection.skip ?? 0, limit: 8,
    }] as const,
    counts: (selection: MarketSelection) => ['public', 'orderbook', 'counts', selection.side, {
        ...marketScope(selection), includeOffSpec: false,
    }] as const,
    snapshot: (product?: string | null, deliveryPointId?: string | null, window?: string | null) =>
        ['public', 'orderbook', 'snapshot', absent(product), absent(deliveryPointId), absent(window)] as const,
    myOrders: (scope: QueryScope) => ['private', scope, 'orderbook', 'my'] as const,
    overlay: (scope: QueryScope, askIds: readonly string[]) =>
        ['private', scope, 'compliance', 'pricing-overlay', [...new Set(askIds)].sort()] as const,
};
