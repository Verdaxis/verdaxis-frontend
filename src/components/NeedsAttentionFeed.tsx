import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { Trade, ViewMode, Page } from '../types';

interface NeedsAttentionFeedProps {
    trades: Trade[];
    viewMode: ViewMode;
    onNavigate: (page: Page) => void;
    onConfirmTrade: (tradeId: string) => void;
    onPostOrder?: () => void;
}

export const NeedsAttentionFeed: React.FC<NeedsAttentionFeedProps> = ({
    trades,
    viewMode,
    onNavigate,
    onConfirmTrade,
    onPostOrder,
}) => {
    // Only show trades the user CAN act on — pending trades where they are the confirming party
    const actionable = trades.filter(t => {
        if (t.status !== 'PENDING_CONFIRMATION') return false;
        // Only the non-initiating party can confirm
        if (viewMode === 'BUYER' && t.initiated_by === 'SELLER') return true;
        if (viewMode === 'SUPPLIER' && t.initiated_by === 'BUYER') return true;
        return false;
    });

    const items = actionable.map(t => ({ trade: t }));

    if (items.length === 0) {
        return (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">All caught up!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No items need your attention right now.</p>
                {onPostOrder && (
                    <button
                        onClick={onPostOrder}
                        className="mt-3 px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-xs font-medium"
                    >
                        {viewMode === 'BUYER' ? 'Post a Bid' : 'Post Supply'}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {items.map(({ trade }) => {
                const counterparty = viewMode === 'BUYER' ? trade.seller_name : trade.buyer_name;
                const qty = Number(trade.quantity_mt).toLocaleString();
                const price = Number(trade.price_per_mt_usd).toLocaleString();

                return (
                    <div
                        key={trade.id}
                        className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Clock size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${trade.fuel_type === 'Methanol' ? 'text-blue-600' : 'text-green-600'}`}>
                                    {trade.fuel_type}
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-sm text-slate-700 dark:text-slate-300">{qty} MT @ ${price}/MT</span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{counterparty}</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Awaiting your confirmation
                            </div>
                        </div>

                        <button
                            onClick={() => onConfirmTrade(trade.id)}
                            className="flex-shrink-0 px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded hover:opacity-90 transition-opacity"
                        >
                            Confirm
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
