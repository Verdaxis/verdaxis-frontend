import React, { useMemo, useState } from 'react';
import { BellDot, Loader2, Pin, Star, Trash2 } from 'lucide-react';

import { useWatchlist } from '../hooks/useWatchlist';
import { formatWatchlistSliceLabel, describeWatchlistEvent, getLatestEventForSlice, getLatestEventForTarget, getWatchlistEventActivity } from '../utils/watchlist';
import { MarketActivityBadge } from './trading/MarketActivityBadge';

export const WatchlistPage: React.FC = () => {
    const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
    const {
        radar,
        events,
        loading,
        error,
        nextCursor,
        loadMoreEvents,
        markEventRead,
        removeTarget,
    } = useWatchlist();

    const targetLabels = useMemo(() => {
        const labels = new Map<string, string>();
        for (const slice of radar?.slices ?? []) {
            labels.set(slice.id, formatWatchlistSliceLabel(slice));
            for (const pin of slice.pins) {
                labels.set(pin.id, pin.snapshot_market_product || formatWatchlistSliceLabel(slice));
            }
        }
        return labels;
    }, [radar]);

    const handleRemoveTarget = async (targetId: string, label: string) => {
        if (!window.confirm(`Remove ${label} from Watchlist?`)) return;
        setPendingRemovalId(targetId);
        try {
            await removeTarget(targetId);
        } finally {
            setPendingRemovalId((current) => (current === targetId ? null : current));
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-3 text-slate-400">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="font-medium">Loading Watchlist...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-10 lg:pt-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
                        <Star size={14} />
                        Watchlist
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Everything you are watching, in one place.</h1>
                        <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                            Track a market slice or pin a specific live order from Marketplace. Your Watchlist keeps both together so you can monitor the market and the exact executable rows you care about in one view.
                        </p>
                    </div>
                    {radar && (
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Tracked slices</div>
                                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{radar.total_slice_count}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Unread events</div>
                                <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{radar.unread_event_count}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Pinned orders</div>
                                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{radar.slices.reduce((count, slice) => count + slice.pins.length, 0)}</div>
                            </div>
                        </div>
                    )}
                    {radar?.has_more_slices && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                            Showing the top {radar.slices.length} of {radar.total_slice_count} tracked slices. Refine the list if this grows further.
                        </div>
                    )}
                </header>

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                        {error}
                    </div>
                )}

                <section className="grid gap-4 lg:grid-cols-2">
                    {(radar?.slices ?? []).map((slice) => {
                        const latestEvent = getLatestEventForSlice(slice, events);
                        return (
                            <article key={slice.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{formatWatchlistSliceLabel(slice)}</h2>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{slice.active_order_count} live orders</span>
                                            <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{slice.pins.length} pins</span>
                                            {slice.unread_event_count > 0 && (
                                                <span className="rounded-full bg-emerald-500/10 px-2 py-1 font-bold text-emerald-700 dark:text-emerald-300">
                                                    {slice.unread_event_count} unread
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveTarget(slice.id, formatWatchlistSliceLabel(slice))}
                                        disabled={pendingRemovalId === slice.id}
                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400"
                                    >
                                        <Trash2 size={14} />
                                        {pendingRemovalId === slice.id ? "Removing..." : "Untrack"}
                                    </button>
                                </div>

                                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                                    {latestEvent ? (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span>{describeWatchlistEvent(latestEvent)}</span>
                                            <MarketActivityBadge activity={getWatchlistEventActivity(latestEvent)} />
                                        </div>
                                    ) : 'No Watchlist signals have landed for this slice yet.'}
                                </div>

                                <div className="mt-4 space-y-2">
                                    {slice.pins.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                            No pinned live orders in this slice yet.
                                        </div>
                                    ) : (
                                        slice.pins.map((pinTarget) => {
                                            const pinEvent = getLatestEventForTarget(pinTarget, events);
                                            return (
                                                <div key={pinTarget.id} className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                                                                <Pin size={14} className="text-emerald-500" />
                                                                {pinTarget.snapshot_market_product || 'Pinned order'}
                                                            </div>
                                                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                                {pinTarget.snapshot_delivery_point_name || slice.delivery_point_name} · {pinTarget.snapshot_availability_window || slice.availability_window_code}
                                                            </div>
                                                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                                                ${Number(pinTarget.snapshot_price_per_mt_usd ?? 0).toLocaleString()} / MT · {Number(pinTarget.snapshot_remaining_quantity_mt ?? 0).toLocaleString()} MT remaining
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveTarget(pinTarget.id, pinTarget.snapshot_market_product || "pinned order")}
                                                            disabled={pendingRemovalId === pinTarget.id}
                                                            className="text-xs font-semibold text-slate-500 transition-colors hover:text-red-600"
                                                        >
                                                            {pendingRemovalId === pinTarget.id ? "Removing..." : "Unpin"}
                                                        </button>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                        <span>{pinEvent ? describeWatchlistEvent(pinEvent) : 'No recent changes on this pinned order.'}</span>
                                                        {pinEvent && <MarketActivityBadge activity={getWatchlistEventActivity(pinEvent)} />}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                        <BellDot size={18} className="text-emerald-500" />
                        Event Feed
                    </div>
                    <div className="space-y-3">
                        {events.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                No Watchlist activity yet. Track a slice or pin an order from Marketplace to start the feed.
                            </div>
                        ) : (
                            events.map((event) => (
                                <div key={event.id} className={`rounded-xl border px-4 py-3 ${event.is_read ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40' : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20'}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                                                {targetLabels.get(event.watchlist_target_id) || event.target_type}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                                <span>{describeWatchlistEvent(event)}</span>
                                                <MarketActivityBadge activity={getWatchlistEventActivity(event)} />
                                            </div>
                                            <div className="mt-2 text-[11px] text-slate-400">{new Date(event.created_at).toLocaleString()}</div>
                                        </div>
                                        {!event.is_read && (
                                            <button
                                                onClick={() => markEventRead(event.id)}
                                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300"
                                            >
                                                Mark read
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {nextCursor && (
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={loadMoreEvents}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-200"
                            >
                                Load more events
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};
