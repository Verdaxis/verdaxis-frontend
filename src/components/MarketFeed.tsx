import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, TrendingUp, ArrowRight } from 'lucide-react';
import { OrderBookOrder, Page, ViewMode } from '../types';
import { api } from '../services/api';

interface MarketFeedProps {
    viewMode: ViewMode;
    onNavigate: (page: Page) => void;
}

const CONFIG = {
    BUYER: { label: 'Available Supply', fetchFn: () => api.orderbook.listAsks(), emptyText: 'No supply listings yet. Check back soon or browse the marketplace.' },
    SUPPLIER: { label: 'Buyer Demand', fetchFn: () => api.orderbook.listBids(), emptyText: 'No buyer demand yet. Post supply to attract buyers.' },
};

export const MarketFeed: React.FC<MarketFeedProps> = ({ viewMode, onNavigate }) => {
    const [orders, setOrders] = useState<OrderBookOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const config = CONFIG[viewMode];

    const fetchOrders = useCallback(async () => {
        try {
            const data = await config.fetchFn();
            const open = (Array.isArray(data) ? data : []).filter(
                (o: OrderBookOrder) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'
            );
            setOrders(open.slice(0, 5));
        } catch {
            // Non-critical feed — fail silently
        } finally {
            setLoading(false);
        }
    }, [config]);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30_000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">{config.label}</h2>
                {!loading && orders.length > 0 && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <TrendingUp size={12} />
                        {orders.length} active {viewMode === 'BUYER' ? 'listing' : 'bid'}{orders.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-6">
                    <Loader2 size={20} className="animate-spin text-emerald-500" />
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{config.emptyText}</p>
                    <button
                        onClick={() => onNavigate('MARKETPLACE')}
                        className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-xs font-medium"
                    >
                        Browse Marketplace
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {orders.map(order => (
                        <div
                            key={order.id}
                            className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                        >
                            {/* Color dot for fuel type */}
                            <div className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${order.fuel_type === 'Methanol' ? 'bg-blue-500' : 'bg-green-500'}`} />

                            {/* Order info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${order.fuel_type === 'Methanol' ? 'text-blue-600' : 'text-green-600'}`}>
                                        {order.fuel_type}
                                    </span>
                                    {order.fuel_grade && order.fuel_grade !== 'Conventional' && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                                            {order.fuel_grade}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400">•</span>
                                    <span className="text-sm text-slate-700 dark:text-slate-300">
                                        {Number(order.quantity_mt).toLocaleString()} MT @ <span className="font-bold text-emerald-600 dark:text-emerald-400">${Number(order.price_per_mt_usd).toFixed(0)}/MT</span>
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {order.region} • {order.availability_window}
                                </div>
                            </div>

                            {/* CTA */}
                            <button
                                onClick={() => onNavigate('MARKETPLACE')}
                                className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            >
                                View <ArrowRight size={12} />
                            </button>
                        </div>
                    ))}
                    {orders.length >= 5 && (
                        <button
                            onClick={() => onNavigate('MARKETPLACE')}
                            className="w-full text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium py-2 hover:underline"
                        >
                            View all in Orderbook
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
