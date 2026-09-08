import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api } from '../services/api';
import type { MarketProduct, WatchlistEvent, WatchlistSummary } from '../types';
import { getWatchlistSliceKey, getWatchlistSliceKeyFromParts } from '../utils/watchlist';
import { useMarketSupport } from '../context/MarketSupportContext';

interface SliceToggleInput {
    marketProductCode: MarketProduct;
    deliveryPointId: string;
    availabilityWindowCode: string;
}

interface UseWatchlistResult {
    radar: WatchlistSummary | null;
    events: WatchlistEvent[];
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    trackedSliceKeys: Set<string>;
    pinnedOrderIds: Set<string>;
    nextCursor: string | null;
    refresh: () => Promise<void>;
    loadMoreEvents: () => Promise<void>;
    toggleSlice: (input: SliceToggleInput) => Promise<boolean>;
    togglePin: (orderId: string) => Promise<boolean>;
    removeTarget: (targetId: string) => Promise<void>;
    markEventRead: (eventId: string) => Promise<void>;
}

export function useWatchlist(): UseWatchlistResult {
    const { isActive: isMarketSupportActive } = useMarketSupport();
    const [radar, setRadar] = useState<WatchlistSummary | null>(null);
    const [events, setEvents] = useState<WatchlistEvent[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);
    const requestIdRef = useRef(0);
    const loadMoreRequestIdRef = useRef(0);
    const radarRef = useRef(radar);
    const nextCursorRef = useRef(nextCursor);
    radarRef.current = radar;
    nextCursorRef.current = nextCursor;

    const load = useCallback(async (forceRefresh = false) => {
        const requestId = ++requestIdRef.current;
        loadMoreRequestIdRef.current += 1;
        if (isMarketSupportActive) {
            setRadar(null);
            setEvents([]);
            setNextCursor(null);
            setError(null);
            setLoading(false);
            setRefreshing(false);
            hasLoadedRef.current = true;
            return;
        }
        if (hasLoadedRef.current) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const cacheOptions = forceRefresh ? { force: true } : undefined;
            const summary = await api.watchlists.getRadar(cacheOptions);
            if (requestId !== requestIdRef.current) return;
            setRadar(summary);
            const page = await api.watchlists.listEvents(summary.id, { limit: 25 }, cacheOptions);
            if (requestId !== requestIdRef.current) return;
            setEvents(page.items);
            setNextCursor(page.next_cursor ?? null);
            hasLoadedRef.current = true;
        } catch (err) {
            if (requestId !== requestIdRef.current) return;
            setError(err instanceof Error ? err.message : 'Failed to load Watchlist');
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [isMarketSupportActive]);

    useEffect(() => {
        void load();
        return () => {
            requestIdRef.current += 1;
        };
    }, [load]);

    const refresh = useCallback(() => load(true), [load]);

    const trackedSliceKeys = useMemo(() => new Set(
        (radar?.slices ?? []).map((slice) => getWatchlistSliceKey(slice)),
    ), [radar]);

    const pinnedOrderIds = useMemo(() => {
        const ids = new Set<string>();
        for (const slice of radar?.slices ?? []) {
            for (const pin of slice.pins) {
                if (pin.order_id) ids.add(pin.order_id);
            }
        }
        return ids;
    }, [radar]);

    const toggleSlice = useCallback(async (input: SliceToggleInput) => {
        if (isMarketSupportActive || !radar) return false;
        const sliceKey = getWatchlistSliceKeyFromParts(
            input.marketProductCode,
            input.deliveryPointId,
            input.availabilityWindowCode,
        );
        const existing = radar.slices.find((slice) => getWatchlistSliceKey(slice) === sliceKey);
        if (existing) {
            await api.watchlists.removeTarget(radar.id, existing.id);
            await refresh();
            return false;
        }
        await api.watchlists.createSliceTarget(radar.id, {
            market_product_code: input.marketProductCode,
            delivery_point_id: input.deliveryPointId,
            availability_window_code: input.availabilityWindowCode,
        });
        await refresh();
        return true;
    }, [isMarketSupportActive, radar, refresh]);

    const togglePin = useCallback(async (orderId: string) => {
        if (isMarketSupportActive || !radar) return false;
        const existing = radar.slices.flatMap((slice) => slice.pins).find((pin) => pin.order_id === orderId);
        if (existing) {
            await api.watchlists.removeTarget(radar.id, existing.id);
            await refresh();
            return false;
        }
        await api.watchlists.createPinTarget(radar.id, orderId);
        await refresh();
        return true;
    }, [isMarketSupportActive, radar, refresh]);

    const removeTarget = useCallback(async (targetId: string) => {
        if (isMarketSupportActive || !radar) return;
        await api.watchlists.removeTarget(radar.id, targetId);
        await refresh();
    }, [isMarketSupportActive, radar, refresh]);

    const markEventRead = useCallback(async (eventId: string) => {
        if (isMarketSupportActive || !radar) return;
        await api.watchlists.markEventRead(radar.id, eventId);
        await refresh();
    }, [isMarketSupportActive, radar, refresh]);

    const loadMoreEvents = useCallback(async () => {
        if (isMarketSupportActive || !radar || !nextCursor) return;
        const requestId = requestIdRef.current;
        const loadMoreRequestId = ++loadMoreRequestIdRef.current;
        const radarId = radar.id;
        const cursor = nextCursor;
        const page = await api.watchlists.listEvents(radarId, { cursor, limit: 25 });
        if (
            requestId !== requestIdRef.current
            || loadMoreRequestId !== loadMoreRequestIdRef.current
            || radarRef.current?.id !== radarId
            || nextCursorRef.current !== cursor
        ) return;
        setEvents((current) => [...current, ...page.items]);
        setNextCursor(page.next_cursor ?? null);
    }, [isMarketSupportActive, radar, nextCursor]);

    return {
        radar,
        events,
        loading,
        refreshing,
        error,
        trackedSliceKeys,
        pinnedOrderIds,
        nextCursor,
        refresh,
        loadMoreEvents,
        toggleSlice,
        togglePin,
        removeTarget,
        markEventRead,
    };
}
