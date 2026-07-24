import { useCallback, useEffect, useMemo, useState } from 'react';

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
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (isMarketSupportActive) {
            setRadar(null);
            setEvents([]);
            setNextCursor(null);
            setError(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const summary = await api.watchlists.getRadar();
            setRadar(summary);
            const page = await api.watchlists.listEvents(summary.id, { limit: 25 });
            setEvents(page.items);
            setNextCursor(page.next_cursor ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load Watchlist');
        } finally {
            setLoading(false);
        }
    }, [isMarketSupportActive]);

    useEffect(() => {
        refresh();
    }, [refresh]);

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
        const page = await api.watchlists.listEvents(radar.id, { cursor: nextCursor, limit: 25 });
        setEvents((current) => [...current, ...page.items]);
        setNextCursor(page.next_cursor ?? null);
    }, [isMarketSupportActive, radar, nextCursor]);

    return {
        radar,
        events,
        loading,
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
