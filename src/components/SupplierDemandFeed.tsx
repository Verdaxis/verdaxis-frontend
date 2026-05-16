import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, PackagePlus, Search, TrendingUp } from 'lucide-react';

import { DemandSignal, Page } from '../types';
import { api } from '../services/api';
import { formatAvailabilityWindow } from '../utils/availabilityWindow';
import { formatMarketProduct } from '../utils/marketProduct';

interface SupplierDemandFeedProps {
    onNavigate: (page: Page) => void;
    onPostAsk: () => void;
}

const URGENCY_CLASS: Record<DemandSignal['urgency'], string> = {
    HIGH: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/60',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/60',
    LOW: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
};

const formatNumber = (value: number | string): string => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'n/a';
    return numeric.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const openMarketplaceForSignal = (signal: DemandSignal, onNavigate: (page: Page) => void) => {
    if (signal.market_product_code) {
        localStorage.setItem('verdaxis_marketplace_product', String(signal.market_product_code));
    }
    if (signal.delivery_point_name) {
        localStorage.setItem('verdaxis_marketplace_port', signal.delivery_point_name);
    }
    if (signal.availability_window_code) {
        localStorage.setItem('verdaxis_marketplace_window', signal.availability_window_code);
    }
    onNavigate('MARKETPLACE');
};

export const SupplierDemandFeed: React.FC<SupplierDemandFeedProps> = ({ onNavigate, onPostAsk }) => {
    const [signals, setSignals] = useState<DemandSignal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSignals = useCallback(async () => {
        setError(null);
        try {
            const data = await api.demand.signals();
            setSignals(data.slice(0, 4));
        } catch (err: any) {
            setError(err?.message || 'Demand signals are unavailable right now.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSignals();
        const interval = window.setInterval(fetchSignals, 60_000);
        return () => window.clearInterval(interval);
    }, [fetchSignals]);

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                        <TrendingUp size={14} />
                        Buyer Demand
                    </div>
                    <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Where buyers are looking</h2>
                </div>
                <button
                    type="button"
                    onClick={onPostAsk}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
                >
                    <PackagePlus size={14} />
                    Post Ask
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <Loader2 size={18} className="animate-spin" />
                    Loading demand signals...
                </div>
            ) : error ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="flex items-center gap-2 font-bold">
                        <AlertCircle size={16} />
                        Demand signals unavailable
                    </div>
                    <p className="mt-1">{error}</p>
                    <button
                        type="button"
                        onClick={() => onNavigate('MARKETPLACE')}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline-offset-4 hover:underline dark:text-amber-100"
                    >
                        Browse live bids <ArrowRight size={12} />
                    </button>
                </div>
            ) : signals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No aggregated buyer demand is visible yet. Post an ask or open Marketplace to inspect live bids directly.
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={onPostAsk}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
                        >
                            <PackagePlus size={14} />
                            Post Ask
                        </button>
                        <button
                            type="button"
                            onClick={() => onNavigate('MARKETPLACE')}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-200"
                        >
                            <Search size={14} />
                            Browse bids
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {signals.map((signal) => (
                        <article
                            key={`${signal.fuel_type}-${signal.region}-${signal.earliest_delivery}`}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white">
                                        {signal.market_product_code ? formatMarketProduct(signal.market_product_code) : signal.fuel_type}
                                    </h3>
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {signal.delivery_point_name || signal.region || 'All regions'} · {signal.availability_window_code ? formatAvailabilityWindow(signal.availability_window_code) : signal.earliest_delivery}
                                    </div>
                                </div>
                                <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${URGENCY_CLASS[signal.urgency]}`}>
                                    {signal.urgency}
                                </span>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                                <div>
                                    <div className="font-semibold text-slate-400">Volume</div>
                                    <div className="mt-1 font-black text-slate-800 dark:text-slate-100">{formatNumber(signal.volume_mt)} MT</div>
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-400">Top bid</div>
                                    <div className="mt-1 font-black text-slate-800 dark:text-slate-100">${formatNumber(signal.max_price_per_mt)}</div>
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-400">Bids</div>
                                    <div className="mt-1 font-black text-slate-800 dark:text-slate-100">{signal.bid_count}</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => openMarketplaceForSignal(signal, onNavigate)}
                                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 transition-colors hover:text-emerald-600 dark:text-emerald-300"
                            >
                                View live bids <ArrowRight size={12} />
                            </button>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
};
