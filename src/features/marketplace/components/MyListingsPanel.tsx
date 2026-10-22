import { formatQuantity } from '../../../utils/numberFormat';
import { Loader2, RefreshCw, ClipboardList, Trash2 } from 'lucide-react';
import { OrderBookOrder, ViewMode } from '../../../types';
import { getStatusConfig, formatDeliveryWindow } from '../../../utils/fuel';
import { getOrderDisplayName } from '../../../utils/marketProduct';
import { FameOrderTermsDetails } from '../../../components/fame/FameOrderTermsDetails';


import type { TFunction } from 'i18next';

interface MyListingsPanelProps {
    isHistorySelected: boolean;
    marketTab: 'market' | 'orderbook' | 'my_orders';
    myOrdersError: string | null;
    myOrdersLoading: boolean;
    outstandingMyOrders: OrderBookOrder[];
    filteredMyOrders: OrderBookOrder[];
    role: ViewMode;
    setOrderModalSide: (side: 'ASK' | 'BID') => void;
    sliceSummary: string;
    hasActiveSliceFilters: boolean;
    clearMarketFilters: () => void;
    locale: string;
    t: TFunction;
    isMarketSupportActive: boolean;
    handleCancelOrder: (order: OrderBookOrder) => void;
    fetchMyOrders: (force?: boolean) => Promise<void>;
}

export function MyListingsPanel({ isHistorySelected, marketTab, myOrdersError, myOrdersLoading, outstandingMyOrders, filteredMyOrders, role, setOrderModalSide, sliceSummary, hasActiveSliceFilters, clearMarketFilters, locale, t, isMarketSupportActive, handleCancelOrder, fetchMyOrders }: MyListingsPanelProps) {
    return <>
            {/* My Listings tab: user's outstanding orders */}
            {!isHistorySelected && marketTab === 'my_orders' && (
                <div className="flex-1 min-h-0 px-4 lg:px-10 pb-4">
                    <div className="h-full min-h-0 max-w-7xl mx-auto flex flex-col">
                        {myOrdersError && <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{myOrdersError}</div>}
                        {myOrdersLoading ? (
                            <div className="flex items-center justify-center py-20 text-slate-400">
                                <Loader2 className="animate-spin mr-2" size={20} /> {t('marketplace.myOrders.loading')}
                            </div>
                        ) : outstandingMyOrders.length === 0 ? (
                            <div className="text-center py-20">
                                <ClipboardList size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">{t('marketplace.myOrders.empty.none.title')}</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                                    {role === 'SUPPLIER'
                                        ? t('marketplace.myOrders.empty.none.supplier')
                                        : t('marketplace.myOrders.empty.none.buyer')}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setOrderModalSide(role === 'SUPPLIER' ? 'ASK' : 'BID')}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors font-medium text-sm"
                                >
                                    {role === 'SUPPLIER' ? t('marketplace.btn.placeAsk') : t('marketplace.btn.placeBid')}
                                </button>
                            </div>
                        ) : filteredMyOrders.length === 0 ? (
                            <div className="text-center py-20">
                                <ClipboardList size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">{t('marketplace.myOrders.empty.filtered.title')}</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                                    {t('marketplace.myOrders.empty.filtered.body', { slice: sliceSummary })}
                                </p>
                                {hasActiveSliceFilters && (
                                    <button
                                        onClick={clearMarketFilters}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors font-medium text-sm"
                                    >
                                        {t('marketplace.btn.clear')}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="min-h-0 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-auto">
                                <table className="w-full min-w-[980px] border-collapse text-sm">
                                    <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800">
                                        <tr>
                                            <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('myTrades.col.side')}</th>
                                            <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.modal.product')}</th>
                                            <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.myOrders.delivery')}</th>
                                            <th className="text-right px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.modal.price')}</th>
                                            <th className="text-right px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.myOrders.quantity')}</th>
                                            <th className="text-right px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.myOrders.remaining')}</th>
                                            <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.col.window')}</th>
                                            <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.col.status')}</th>
                                            <th className="text-center px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.col.action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMyOrders.map((order) => {
                                            const isBid = order.side === 'BID';
                                            const filled = order.status === 'FILLED' || order.status === 'CANCELLED' || order.status === 'EXPIRED';
                                            return (
                                                <tr
                                                    key={order.id}
                                                    className={`border-t border-slate-100 dark:border-slate-700 ${filled ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                                >
                                                    <td className="px-3 py-2">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                                            isBid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                                        }`}>
                                                            {order.side}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                                                        {getOrderDisplayName(order, t('marketplace.unknownProduct'))}
                                                        {order.fame_terms && <details className="mt-2 max-w-xl whitespace-normal text-xs">
                                                            <summary className="cursor-pointer text-slate-500">{t('marketplace.b100.orderTerms')}</summary>
                                                            <div className="mt-3"><FameOrderTermsDetails terms={order.fame_terms} /></div>
                                                        </details>}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 text-xs">
                                                        {order.delivery_point_name || order.region}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                                        ${order.price_per_mt_usd.toLocaleString(locale)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400">
                                                        {formatQuantity(order.quantity_mt, locale)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400">
                                                        {formatQuantity(order.remaining_quantity_mt, locale)}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                                                        {formatDeliveryWindow(order, locale)}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                                                            order.status === 'OPEN' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                                            order.status === 'PARTIALLY_FILLED' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                                                            order.status === 'FILLED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                            'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                                                        }`}>
                                                            {getStatusConfig(order.status, t).label}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {(order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED') && (!isMarketSupportActive || order.creation_method === 'MARKET_SUPPORT') && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancelOrder(order)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                title={t('marketplace.cancel.order')}
                                                            >
                                                                <Trash2 size={12} />
                                                                {t('marketplace.btn.cancel')}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="flex-none flex justify-end pt-3">
                            <button
                                onClick={() => fetchMyOrders(true)}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <RefreshCw size={12} /> {t('marketplace.btn.refresh')}
                            </button>
                        </div>
                    </div>
                </div>
            )}


    </>;
}
