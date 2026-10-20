import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { marketplaceQueries } from '../api/marketplaceQueries';
import type { MarketplaceReadSelection } from '../api/marketplaceApi';
import type { QueryScope } from '../../../lib/query/keys';
import { useVisibleDocument } from '../../../lib/query/useVisibleDocument';
import { isOrderbookMarketProduct } from '../../../utils/marketProduct';
import type { OrderBookOrder, OwnedOrderBookOrder } from '../../../types';

const EMPTY_ORDERS: OrderBookOrder[] = [];
const EMPTY_COUNTS: Record<string, number> = {};

export function useMarketplaceReferences(ready: boolean) {
    const products = useQuery({ ...marketplaceQueries.products(), enabled: ready, refetchOnMount: 'always' });
    const points = useQuery({ ...marketplaceQueries.deliveryPoints(), enabled: ready, refetchOnMount: 'always' });
    // A workspace entry must complete its own catalog check before execution.
    // Query retains the reusable value; presentation never revives a failed check.
    const catalogProducts = useMemo(() => products.isFetchedAfterMount && !products.isError ? products.data ?? [] : [],
        [products.data, products.isError, products.isFetchedAfterMount]);
    const deliveryPoints = useMemo(() => points.isFetchedAfterMount && !points.isError
        ? (points.data ?? []).filter(point => point.is_active !== false) : [],
    [points.data, points.isError, points.isFetchedAfterMount]);
    const loadCatalogProducts = useCallback(async (_force = false) => {
        await products.refetch({ cancelRefetch: false });
    }, [products.refetch]);
    return { catalogProducts, deliveryPoints,
        catalogError: products.isFetchedAfterMount && products.isError,
        deliveryPointsStatus: !points.isFetchedAfterMount ? 'loading' as const : points.isError ? 'failed' as const : 'ready' as const,
        loadCatalogProducts };
}

interface MarketplaceQueryOptions {
    ready: boolean;
    isHistorySelected: boolean;
    marketTab: 'market' | 'orderbook' | 'my_orders';
    isCatalogScopeResolving: boolean;
    selection: MarketplaceReadSelection;
    scope: QueryScope;
    hasUser: boolean;
}

export function useMarketplaceQueries({ ready, isHistorySelected, marketTab, isCatalogScopeResolving, selection, scope, hasUser }: MarketplaceQueryOptions) {
    const client = useQueryClient();
    const visible = useVisibleDocument();
    const marketEnabled = ready && !isHistorySelected && !isCatalogScopeResolving && visible;
    const listingsQuery = useQuery({ ...marketplaceQueries.listings(selection),
        enabled: marketEnabled && marketTab === 'market',
        refetchInterval: marketEnabled && marketTab === 'market' ? 60_000 : false });
    const countsQuery = useQuery({ ...marketplaceQueries.counts(selection), enabled: marketEnabled,
        refetchInterval: marketEnabled ? 60_000 : false });
    const myOptions = marketplaceQueries.myOrders(scope);
    const myQuery = useQuery({ ...myOptions, enabled: ready && hasUser && !isHistorySelected && marketTab === 'my_orders' && visible });
    const entryReadCompleted = useRef(false);
    if (listingsQuery.isFetchedAfterMount) entryReadCompleted.current = true;
    const hasLoadedListings = entryReadCompleted.current && listingsQuery.data !== undefined;
    // A workspace entry checks its listings even when Query still holds a fresh
    // value from the previous visit. The first render decides: cached data needs
    // one read, no data means the automatic fetch is that read. Returning to a
    // cached filter inside the same mount does not read again.
    const entryCheck = useRef<'pending' | 'done'>(listingsQuery.data !== undefined ? 'pending' : 'done');
    useEffect(() => {
        if (entryCheck.current === 'done' || !marketEnabled || marketTab !== 'market') return;
        if (listingsQuery.isFetching) {
            entryCheck.current = 'done';
            return;
        }
        entryCheck.current = 'done';
        void listingsQuery.refetch({ cancelRefetch: false });
    }, [marketEnabled, marketTab, listingsQuery.isFetching, listingsQuery.refetch]);
    const listings = useMemo(() => hasLoadedListings
        ? listingsQuery.data!.items.filter(order => isOrderbookMarketProduct(order.market_product)) : EMPTY_ORDERS,
    [hasLoadedListings, listingsQuery.data]);
    const askIds = useMemo(() => [...new Set(listings.filter(order => order.side === 'ASK').map(order => order.id))].sort(), [listings]);
    const overlay = useQuery({ ...marketplaceQueries.overlay(scope, askIds),
        // Read only from a settled listings answer. A listings refresh that
        // keeps the ids does not re-read the overlay; one that changes the ids
        // reads the new set once.
        enabled: ready && hasUser && visible && !isHistorySelected && askIds.length > 0
            && listingsQuery.isFetchedAfterMount && !listingsQuery.isFetching });

    // These signatures keep the controlled presentation and financial handlers
    // unchanged until Task 9. Refetch bypasses freshness, not the API policy.
    const fetchListings = useCallback(async (_silent = false, _skip = selection.skip ?? 0, _force = false) => {
        if (marketEnabled && marketTab === 'market') await listingsQuery.refetch({ cancelRefetch: false });
    }, [marketEnabled, marketTab, listingsQuery.refetch, selection.skip]);
    const fetchProductCounts = useCallback(async (_force = false) => {
        if (marketEnabled) await countsQuery.refetch({ cancelRefetch: false });
    }, [marketEnabled, countsQuery.refetch]);
    const fetchMyOrders = useCallback(async (_force = false) => {
        if (ready && hasUser && !isHistorySelected) await myQuery.refetch({ cancelRefetch: false });
    }, [ready, hasUser, isHistorySelected, myQuery.refetch]);
    const setMyOrders = useCallback((update: OwnedOrderBookOrder[] | ((orders: OwnedOrderBookOrder[]) => OwnedOrderBookOrder[])) => {
        client.setQueryData(myOptions.queryKey, (previous: OwnedOrderBookOrder[] | undefined) =>
            typeof update === 'function' ? update(previous ?? []) : update);
    }, [client, JSON.stringify(myOptions.queryKey)]);

    return { listings, totalCount: hasLoadedListings ? listingsQuery.data!.total : 0,
        acceptedSkip: hasLoadedListings ? listingsQuery.data!.skip : selection.skip ?? 0,
        loading: !entryReadCompleted.current || (listingsQuery.isFetching && !hasLoadedListings),
        refreshing: listingsQuery.isFetching && hasLoadedListings, hasLoadedListings,
        error: listingsQuery.isFetchedAfterMount && listingsQuery.isError ? (listingsQuery.error instanceof Error ? listingsQuery.error.message : '') : null,
        marketProductCounts: countsQuery.data?.counts ?? EMPTY_COUNTS,
        myOrders: myQuery.data ?? EMPTY_ORDERS, myOrdersLoading: myQuery.isFetching,
        myOrdersReadError: myQuery.isError ? myQuery.error : null,
        complianceOverlays: overlay.isError ? {} : overlay.data?.overlays ?? {},
        overlayAssumptions: overlay.isError ? null : overlay.data?.assumptions ?? null,
        fetchListings, fetchProductCounts, fetchMyOrders, setMyOrders };
}
