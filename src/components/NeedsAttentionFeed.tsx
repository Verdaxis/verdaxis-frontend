import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { Trade, ViewMode, Page } from '../types';
import { useTranslation } from 'react-i18next';
import { getMarketplaceProductLabel, getMarketplaceProductValue } from '../utils/marketProducts';

interface NeedsAttentionFeedProps {
    trades: Trade[];
    viewMode: ViewMode;
    onNavigate: (page: Page) => void;
    onConfirmTrade?: (tradeId: string) => void;
    onPostOrder?: () => void;
}

export const NeedsAttentionFeed: React.FC<NeedsAttentionFeedProps> = ({
    trades,
    viewMode,
    onNavigate,
    onConfirmTrade,
    onPostOrder,
}) => {
    const { t, i18n } = useTranslation('common');
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
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('attention.allCaughtUp')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('attention.none')}</p>
                {onPostOrder && (
                    <button
                        onClick={onPostOrder}
                        className="mt-3 px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-xs font-medium"
                    >
                        {t(viewMode === 'BUYER' ? 'attention.postBid' : 'attention.postSupply')}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {items.map(({ trade }) => {
                const counterparty = viewMode === 'BUYER' ? trade.seller_name : trade.buyer_name;
                const qty = Number(trade.quantity_mt).toLocaleString(i18n.language);
                const price = Number(trade.price_per_mt_usd).toLocaleString(i18n.language);
                const marketProduct = getMarketplaceProductValue(
                    typeof trade.market_product === 'string'
                        ? trade.market_product
                        : trade.market_product?.market_product || trade.market_product?.name || trade.product_name
                ) || getMarketplaceProductValue(trade.product_name);
                const fuelLabel = marketProduct
                    ? getMarketplaceProductLabel(marketProduct)
                    : trade.fuel_type === 'Methanol'
                        ? t('fuel.methanol')
                        : trade.fuel_type === 'Ethanol' ? t('fuel.ethanol') : trade.fuel_type;

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
                                    {fuelLabel}
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-sm text-slate-700 dark:text-slate-300">{qty} MT @ ${price}/MT</span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{counterparty}</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {t('attention.awaitingConfirmation')}
                            </div>
                        </div>

                        {onConfirmTrade && <button
                            onClick={() => onConfirmTrade(trade.id)}
                            className="flex-shrink-0 px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded hover:opacity-90 transition-opacity"
                        >
                            {t('attention.confirm')}
                        </button>}
                    </div>
                );
            })}
        </div>
    );
};
