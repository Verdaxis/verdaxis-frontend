import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ShoppingCart, ArrowRight, TrendingUp } from 'lucide-react';
import { OrderBookOrder, Page } from '../types';
import { api } from '../services/api';

interface SupplierDemandFeedProps {
    onNavigate: (page: Page) => void;
}

export const SupplierDemandFeed: React.FC<SupplierDemandFeedProps> = ({ onNavigate }) => {
    const [bids, setBids] = useState<OrderBookOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBids = useCallback(async () => {
        try {
            const data = await api.orderbook.listBids();
            const openBids = (Array.isArray(data) ? data : []).filter(
                (b: OrderBookOrder) => b.status === 'OPEN' || b.status === 'PARTIALLY_FILLED'
            );
            setBids(openBids.slice(0, 5));
        } catch {
            // Silently fail — demand feed is non-critical
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBids();
        const interval = setInterval(fetchBids, 30_000);
        return () => clearInterval(interval);
    }, [fetchBids]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Buyer Demand</h3>
                <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-emerald-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Buyer Demand</h3>
                {bids.length > 0 && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <TrendingUp size={12} />
                        {bids.length} active bid{bids.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {bids.length === 0 ? (
                <div className="text-center py-6">
                    <ShoppingCart className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                        No buyer demand matching your profile yet. Post supply to attract buyers.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {bids.map(bid => (
                        <button
                            key={bid.id}
                            onClick={() => onNavigate('MARKETPLACE')}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 border border-slate-100 dark:border-slate-700/50 transition-colors group text-left"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">{bid.fuel_type}</span>
                                    {bid.fuel_grade && bid.fuel_grade !== 'Conventional' && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                                            {bid.fuel_grade}
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-slate-700 dark:text-slate-300">
                                    <span className="font-medium">{Number(bid.quantity_mt).toLocaleString()} MT</span>
                                    <span className="text-slate-400 mx-1.5">at</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">${Number(bid.price_per_mt_usd).toFixed(0)}/MT</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">{bid.region} • {bid.availability_window}</div>
                            </div>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0 ml-2" />
                        </button>
                    ))}
                    {bids.length >= 5 && (
                        <button
                            onClick={() => onNavigate('MARKETPLACE')}
                            className="w-full text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium py-2 hover:underline"
                        >
                            View all demand in Orderbook
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
