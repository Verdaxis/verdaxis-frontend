import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    RefreshCw,
    Package,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    EyeOff,
} from 'lucide-react';
import { api } from '../services/api';
import { Trade } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../hooks/useSSE';
import { useToast } from './Toast';
import { useNamespace } from '../hooks/useNamespace';
import {
    isActiveTradeStatus,
    isCompletedTradeStatus,
    isConfirmedLikeTrade,
    normalizeTradeLifecycleStatus,
    tradeDisplayPricePerMt,
    tradeDisplayQuantityMt,
    tradeGrossNotionalUsd,
} from '../utils/tradeAnalytics';

type FilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED';

export const MyTrades: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const { addToast } = useToast();
    const { t, ready } = useNamespace('trading');
    const userRole = user?.role;
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const fetchTrades = useCallback(async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            else setIsRefreshing(true);
            setError(null);
            const data = await api.trades.myTrades();
            setTrades(data);
        } catch (err: any) {
            const message = err.message || '';
            if (message.toLowerCase().includes('not found') || message.includes('404')) {
                setTrades([]);
            } else if (!silent) {
                setError(message || 'Failed to load trades');
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    const handleTradeEvent = useCallback(() => {
        fetchTrades(true);
    }, [fetchTrades]);

    useSSE('trades', handleTradeEvent, isAuthenticated);

    const getUserSide = (trade: Trade): 'BUYER' | 'SELLER' | null => {
        if (!user) return null;
        if (trade.buyer_id === user.organization_id) return 'BUYER';
        if (trade.seller_id === user.organization_id) return 'SELLER';
        return null;
    };

    const handleConfirm = async (tradeId: string) => {
        setActionLoadingId(tradeId);
        try {
            await api.trades.confirm(tradeId);
            addToast({ type: 'success', title: t('myTrades.toast.confirmed.title'), message: t('myTrades.toast.confirmed.message') });
            fetchTrades(true);
        } catch (err: any) {
            addToast({ type: 'warning', title: t('myTrades.toast.confirmFailed.title'), message: err.message || t('myTrades.toast.confirmFailed.message') });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDecline = async (tradeId: string) => {
        setActionLoadingId(tradeId);
        try {
            await api.trades.decline(tradeId);
            addToast({ type: 'info', title: t('myTrades.toast.declined.title'), message: t('myTrades.toast.declined.message') });
            fetchTrades(true);
        } catch (err: any) {
            addToast({ type: 'warning', title: t('myTrades.toast.declineFailed.title'), message: err.message || t('myTrades.toast.declineFailed.message') });
        } finally {
            setActionLoadingId(null);
        }
    };

    const filteredTrades = trades.filter((trade) => {
        if (filterTab === 'ACTIVE') return isActiveTradeStatus(trade.status);
        if (filterTab === 'COMPLETED') return isCompletedTradeStatus(trade.status);
        return true;
    });

    const counts = {
        ALL: trades.length,
        ACTIVE: trades.filter((trade) => isActiveTradeStatus(trade.status)).length,
        COMPLETED: trades.filter((trade) => isCompletedTradeStatus(trade.status)).length,
    };

    if (!ready) return null;

    const STATUS_CONFIG = {
        PENDING_CONFIRMATION: {
            label: t('myTrades.status.pending'),
            tone: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
        },
        CONFIRMED: {
            label: t('myTrades.status.confirmed'),
            tone: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
        },
        CANCELLED: {
            label: t('myTrades.status.cancelled'),
            tone: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        },
        DECLINED: {
            label: t('myTrades.status.declined'),
            tone: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
        },
    } as const;

    const renderActions = (trade: Trade) => {
        const userSide = getUserSide(trade);
        const isLoadingThis = actionLoadingId === trade.id;

        if (trade.status === 'PENDING_CONFIRMATION') {
            const isCounterparty =
                (trade.initiated_by === 'BUYER' && userSide === 'SELLER') ||
                (trade.initiated_by === 'SELLER' && userSide === 'BUYER');

            if (!isCounterparty) {
                return (
                    <span className="text-xs text-amber-600 dark:text-amber-400 italic flex items-center gap-1">
                        <Clock size={12} />
                        Awaiting Confirmation
                    </span>
                );
            }

            return (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleConfirm(trade.id)}
                        disabled={isLoadingThis}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                        {isLoadingThis ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        {t('myTrades.btn.confirm')}
                    </button>
                    <button
                        onClick={() => handleDecline(trade.id)}
                        disabled={isLoadingThis}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                        {isLoadingThis ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                        {t('myTrades.btn.decline')}
                    </button>
                </div>
            );
        }

        if (isConfirmedLikeTrade(trade.status)) {
            return (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t('myTrades.note.offPlatform')}
                </span>
            );
        }

        return <span className="text-xs text-slate-400 dark:text-slate-500 italic">{t('myTrades.noActions')}</span>;
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl v-heading">{t('myTrades.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">{t('myTrades.subtitle')}</p>
                </div>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                    <span className="ml-3 text-slate-500 dark:text-slate-400">{t('myTrades.loading')}</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl v-heading">{t('myTrades.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">{t('myTrades.subtitle')}</p>
                </div>
                <div className="v-card p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <AlertTriangle size={28} className="text-red-500" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-700 dark:text-white mb-2">{t('myTrades.error.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{error}</p>
                    <button
                        onClick={() => fetchTrades()}
                        className="mt-4 px-4 py-2 bg-[#5DADE2] hover:bg-[#4A9BD9] text-white font-bold text-sm rounded-lg transition-colors"
                    >
                        {t('myTrades.btn.tryAgain')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
            <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl v-heading">{t('myTrades.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">{t('myTrades.subtitle.full')}</p>
                </div>
                <button
                    onClick={() => fetchTrades(true)}
                    disabled={isRefreshing}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#5DADE2] transition-colors"
                >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    {t('myTrades.btn.refresh')}
                </button>
            </div>

            <div className="flex items-center gap-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
                {(['ALL', 'ACTIVE', 'COMPLETED'] as FilterTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilterTab(tab)}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                            filterTab === tab
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        {tab === 'ALL' ? t('myTrades.tab.all') : tab === 'ACTIVE' ? t('myTrades.tab.active') : t('myTrades.tab.completed')}
                        <span className="ml-1.5 text-xs opacity-60">({counts[tab]})</span>
                    </button>
                ))}
            </div>

            {filteredTrades.length === 0 ? (
                <div className="v-card p-12 text-center border-dashed">
                    <Package className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">{t('myTrades.empty.title')}</h3>
                    <p className="text-slate-400 dark:text-slate-500 mt-1 text-sm">
                        {filterTab === 'ALL'
                            ? t('myTrades.empty.all')
                            : filterTab === 'ACTIVE'
                                ? t('myTrades.empty.active')
                                : t('myTrades.empty.completed')}
                    </p>
                </div>
            ) : (
                <div className="v-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                    <th className="px-4 lg:px-6 py-4">{t('myTrades.col.date')}</th>
                                    <th className="px-4 lg:px-6 py-4">{t('myTrades.col.fuel')}</th>
                                    <th className="px-4 lg:px-6 py-4">{t('myTrades.col.region')}</th>
                                    <th className="px-4 lg:px-6 py-4">{t('myTrades.col.side')}</th>
                                    <th className="px-4 lg:px-6 py-4 text-right">{t('myTrades.col.qty')}</th>
                                    {userRole !== 'BUYER' && (
                                        <>
                                            <th className="px-4 lg:px-6 py-4 text-right">{t('myTrades.col.price')}</th>
                                            <th className="px-4 lg:px-6 py-4 text-right">{t('myTrades.col.total')}</th>
                                        </>
                                    )}
                                    <th className="px-4 lg:px-6 py-4">{t('myTrades.col.counterparty')}</th>
                                    <th className="px-4 lg:px-6 py-4">{t('myTrades.col.status')}</th>
                                    <th className="px-4 lg:px-6 py-4">{t('myTrades.col.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                {filteredTrades.map((trade) => {
                                    const userSide = getUserSide(trade);
                                    const normalizedStatus = normalizeTradeLifecycleStatus(trade.status);
                                    const displaySide = userSide === 'BUYER' ? 'BUY' : userSide === 'SELLER' ? 'SELL' : '—';
                                    const quantity = tradeDisplayQuantityMt(trade);
                                    const price = tradeDisplayPricePerMt(trade);
                                    const total = tradeGrossNotionalUsd(trade);
                                    const statusCfg = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.CANCELLED;
                                    const counterpartyIsHidden = trade.is_anonymous && trade.status === 'PENDING_CONFIRMATION';
                                    const counterpartyName = userSide === 'BUYER' ? (trade.seller_name || 'Seller') : (trade.buyer_name || 'Buyer');

                                    return (
                                        <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-4 lg:px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {new Date(trade.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 lg:px-6 py-4">
                                                <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded border border-blue-100 dark:border-blue-800">
                                                    {trade.product_name || trade.fuel_type}
                                                </span>
                                            </td>
                                            <td className="px-4 lg:px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                                                {trade.delivery_point_name || trade.region}
                                            </td>
                                            <td className="px-4 lg:px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${displaySide === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                    {displaySide === 'BUY' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                    {displaySide}
                                                </span>
                                            </td>
                                            <td className="px-4 lg:px-6 py-4 text-right font-mono font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                {quantity.toLocaleString()}
                                            </td>
                                            {userRole !== 'BUYER' && (
                                                <>
                                                    <td className="px-4 lg:px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                        ${price.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-4 lg:px-6 py-4">
                                                {counterpartyIsHidden ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 italic">
                                                        <EyeOff size={12} />
                                                        Anonymous
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                        {counterpartyName}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 lg:px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.tone}`}>
                                                    {statusCfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 lg:px-6 py-4">
                                                {renderActions(trade)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
