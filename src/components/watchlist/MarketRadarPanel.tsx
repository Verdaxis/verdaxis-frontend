import React from 'react';
import { ArrowRight, BellRing, Pin, RadioTower } from 'lucide-react';

import type { WatchlistEvent, WatchlistSummary } from '../../types';
import { describeWatchlistEvent, formatWatchlistSliceLabel, getLatestEventForSlice } from '../../utils/watchlist';

interface MarketRadarPanelProps {
    radar: WatchlistSummary | null;
    events: WatchlistEvent[];
    loading?: boolean;
    error?: string | null;
    onOpenRadar: () => void;
}

export const MarketRadarPanel: React.FC<MarketRadarPanelProps> = ({ radar, events, loading = false, error = null, onOpenRadar }) => {
    const allSlices = radar?.slices ?? [];
    const slices = allSlices.slice(0, 3);
    const hiddenCount = Math.max(allSlices.length - slices.length, 0);

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        <RadioTower size={14} className="text-emerald-500" />
                        Market Radar
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Tracked slices</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Monitor the market pockets that matter and keep tactical pins on live orders.
                    </p>
                </div>
                <button
                    onClick={onOpenRadar}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-200"
                >
                    Open Radar
                    <ArrowRight size={15} />
                </button>
            </div>

            {loading ? (
                <div className="grid gap-3 md:grid-cols-3">
                    {[0, 1, 2].map((index) => (
                        <div key={index} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800" />
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    Market Radar is unavailable right now. Open the full radar view to retry.
                </div>
            ) : slices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Track a slice from Marketplace to start seeing market signals here.
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                    {slices.map((slice) => {
                        const latestEvent = getLatestEventForSlice(slice, events);
                        return (
                            <div key={slice.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">{formatWatchlistSliceLabel(slice)}</div>
                                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {slice.active_order_count} live orders
                                        </div>
                                    </div>
                                    {slice.unread_event_count > 0 && (
                                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                            {slice.unread_event_count} new
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="inline-flex items-center gap-1"><BellRing size={12} /> {slice.active_order_count}</span>
                                    <span className="inline-flex items-center gap-1"><Pin size={12} /> {slice.pins.length}</span>
                                </div>
                                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                    {latestEvent ? describeWatchlistEvent(latestEvent) : 'No recent radar events for this slice.'}
                                </div>
                            </div>
                        );
                    })}
                    </div>
                    {hiddenCount > 0 && (
                        <button
                            onClick={onOpenRadar}
                            className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300"
                        >
                            +{hiddenCount} more tracked slice{hiddenCount === 1 ? '' : 's'}
                            <ArrowRight size={13} />
                        </button>
                    )}
                </div>
            )}
        </section>
    );
};
