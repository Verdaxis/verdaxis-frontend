import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import type { Watchlist, WatchlistEntry } from '../types';

const DEFAULT_WATCHLIST_NAME = 'Default';

interface UseWatchlistResult {
    /** All user watchlists */
    watchlists: Watchlist[];
    /** ID of the default watchlist (auto-created if missing) */
    defaultWatchlistId: string | null;
    /** All entries across all watchlists, keyed by "product_id::delivery_point_id" */
    watchedKeys: Set<string>;
    /** Map from watchedKey to { watchlistId, entryId } for removal */
    watchedEntryMap: Map<string, { watchlistId: string; entryId: string }>;
    /** Loading state for initial fetch */
    loading: boolean;
    /** Toggle an item in/out of the default watchlist. Returns true if added, false if removed. */
    toggleWatch: (productId: string, deliveryPointId?: string) => Promise<boolean>;
    /** Check if a product+deliveryPoint combo is watched */
    isWatched: (productId: string, deliveryPointId?: string) => boolean;
    /** Re-fetch watchlists from the API */
    refresh: () => Promise<void>;
}

/** Stable key for a watchlist entry */
function entryKey(productId: string, deliveryPointId?: string | null): string {
    return `${productId}::${deliveryPointId ?? ''}`;
}

export function useWatchlist(): UseWatchlistResult {
    const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
    const [defaultWatchlistId, setDefaultWatchlistId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const initDone = useRef(false);

    const fetchWatchlists = useCallback(async () => {
        try {
            const data = await api.watchlists.list();
            const items: Watchlist[] = data.items ?? data;
            const arr = Array.isArray(items) ? items : [];
            setWatchlists(arr);

            const defaultWl = arr.find(wl => wl.name === DEFAULT_WATCHLIST_NAME);
            if (defaultWl) setDefaultWatchlistId(defaultWl.id);
            return arr;
        } catch {
            return [];
        }
    }, []);

    // Init: fetch + ensure default watchlist exists
    useEffect(() => {
        if (initDone.current) return;
        initDone.current = true;
        let cancelled = false;

        const init = async () => {
            setLoading(true);
            const arr = await fetchWatchlists();
            if (cancelled) return;

            if (arr.length === 0 || !arr.find(wl => wl.name === DEFAULT_WATCHLIST_NAME)) {
                try {
                    const created = await api.watchlists.create(DEFAULT_WATCHLIST_NAME);
                    if (!cancelled) {
                        setDefaultWatchlistId(created.id);
                        await fetchWatchlists();
                    }
                } catch { /* user may not be authenticated */ }
            }
            if (!cancelled) setLoading(false);
        };
        init();
        return () => { cancelled = true; };
    }, [fetchWatchlists]);

    // Derived: build lookup structures
    const { watchedKeys, watchedEntryMap } = (() => {
        const keys = new Set<string>();
        const map = new Map<string, { watchlistId: string; entryId: string }>();
        for (const wl of watchlists) {
            for (const entry of wl.entries ?? []) {
                const key = entryKey(entry.product_id, entry.delivery_point_id);
                keys.add(key);
                map.set(key, { watchlistId: wl.id, entryId: entry.id });
            }
        }
        return { watchedKeys: keys, watchedEntryMap: map };
    })();

    const isWatched = useCallback(
        (productId: string, deliveryPointId?: string) => watchedKeys.has(entryKey(productId, deliveryPointId)),
        [watchedKeys],
    );

    const toggleWatch = useCallback(async (productId: string, deliveryPointId?: string): Promise<boolean> => {
        const key = entryKey(productId, deliveryPointId);
        const existing = watchedEntryMap.get(key);

        if (existing) {
            // Remove
            await api.watchlists.removeEntry(existing.watchlistId, existing.entryId);
            await fetchWatchlists();
            return false;
        }

        // Add to default watchlist
        let targetId = defaultWatchlistId;
        if (!targetId) {
            // Create default watchlist on-the-fly
            const created = await api.watchlists.create(DEFAULT_WATCHLIST_NAME);
            targetId = created.id;
            setDefaultWatchlistId(created.id);
        }
        await api.watchlists.addEntry(targetId, {
            product_id: productId,
            delivery_point_id: deliveryPointId || undefined,
        });
        await fetchWatchlists();
        return true;
    }, [defaultWatchlistId, watchedEntryMap, fetchWatchlists]);

    const refresh = useCallback(async () => {
        await fetchWatchlists();
    }, [fetchWatchlists]);

    return {
        watchlists,
        defaultWatchlistId,
        watchedKeys,
        watchedEntryMap,
        loading,
        toggleWatch,
        isWatched,
        refresh,
    };
}
