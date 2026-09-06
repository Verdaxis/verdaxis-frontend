import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Trade, ViewMode, Page } from '../types';
import { useTranslation } from 'react-i18next';
import { getMarketplaceProductLabel, getMarketplaceProductValue } from '../utils/marketProducts';

interface NeedsAttentionFeedProps {
    trades: Trade[];
    viewMode: ViewMode;
    onNavigate: (page: Page) => void;
    onConfirmTrade?: (tradeId: string) => void;
    onPostOrder?: () => void;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    total?: number;
}

export const NeedsAttentionFeed: React.FC<NeedsAttentionFeedProps> = ({
    trades,
    viewMode,
    onNavigate,
    onConfirmTrade,
    onPostOrder,
    loading = false,
    error,
    onRetry,
    total,
}) => {
    const { t, i18n } = useTranslation('common');
    const actionable = trades.filter(trade => {
        if (trade.status !== 'PENDING_CONFIRMATION') return false;
        if (viewMode === 'BUYER' && trade.initiated_by === 'SELLER') return true;
        if (viewMode === 'SUPPLIER' && trade.initiated_by === 'BUYER') return true;
        return false;
    });
    const actionTotal = total ?? actionable.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('loading')}
            </div>
        );
    }

    if (error) {
        return (
            <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 px-4 py-4">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
                </div>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="shrink-0 rounded-md border border-amber-300 dark:border-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                    >
                        {t('error.boundary.retry')}
                    </button>
                )}
            </div>
        );
    }

    if (actionable.length === 0 && actionTotal === 0) {
        return (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('attention.allCaughtUp')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('attention.none')}</p>
                {onPostOrder && (
                    <button
                        onClick={onPostOrder}
                        className="mt-3 px-4 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 transition-colors text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                        {t(viewMode === 'BUYER' ? 'attention.postBid' : 'attention.postSupply')}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {actionable.map(trade => {
                const counterparty = viewMode === 'BUYER' ? trade.seller_name : trade.buyer_name;
                const qty = Number(trade.quantity_mt).toLocaleString(i18n.language);
                const price = Number(trade.price_per_mt_usd).toLocaleString(i18n.language);
                const marketProduct = getMarketplaceProductValue(
                    typeof trade.market_product === 'string'
                        ? trade.market_product
                        : trade.market_product?.market_product || trade.market_product?.name || trade.product_name,
                ) || getMarketplaceProductValue(trade.product_name);
                const fuelLabel = marketProduct
                    ? getMarketplaceProductLabel(marketProduct)
                    : trade.fuel_type === 'Methanol'
                        ? t('fuel.methanol')
                        : trade.fuel_type === 'Ethanol' ? t('fuel.ethanol') : trade.fuel_type;

                return (
                    <div
                        key={trade.id}
                        id={`order-${trade.id}`}
                        className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Clock size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-800 dark:text-white">{fuelLabel}</span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300">{qty} MT @ ${price}/MT</span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{counterparty}</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('attention.awaitingConfirmation')}</div>
                        </div>
                        {onConfirmTrade && (
                            <button
                                onClick={() => onConfirmTrade(trade.id)}
                                className="flex-shrink-0 px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                            >
                                {t('attention.confirm')}
                            </button>
                        )}
                    </div>
                );
            })}
            {actionTotal > actionable.length && (
                <button
                    onClick={() => onNavigate('TRADES')}
                    className="flex items-center gap-1 pt-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                    {t('attention.viewAll', { count: actionTotal })}
                    <ArrowRight className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
};
