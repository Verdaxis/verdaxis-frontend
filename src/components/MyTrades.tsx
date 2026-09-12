import { LoadingScreen } from './LoadingScreen';
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useMarketSupport } from '../context/MarketSupportContext';
import { useSSE } from '../hooks/useSSE';
import { useToast } from './Toast';
import { useNamespace } from '../hooks/useNamespace';
import { useDashboardContentReady } from '../hooks/useDashboardContentReady';
import { Pagination } from './ui/Pagination';
import {
    isConfirmedLikeTrade,
    normalizeTradeLifecycleStatus,
    tradeDisplayPricePerMt,
    tradeDisplayQuantityMt,
    tradeGrossNotionalUsd,
} from '../utils/tradeAnalytics';
import i18n from '../i18n';
import { formatAvailabilityWindow } from '../utils/availabilityWindow';

type FilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED';
type StatusGroup = Lowercase<FilterTab>;

const PAGE_SIZE = 20;

export const MyTrades: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const { user, isAuthenticated } = useAuth();
    const { context: marketSupportContext, isActive: isMarketSupportActive } = useMarketSupport();
    const { addToast } = useToast();
    const { t, ready } = useNamespace('trading');
    const userRole = user?.role;
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
    const [currentSkip, setCurrentSkip] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    useDashboardContentReady('TRADES', ready && !isLoading && hasLoaded);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const requestGeneration = useRef(0);
    const requestScope = `${user?.id ?? ''}:${user?.organization_id ?? ''}`;

    const fetchTrades = useCallback(async (silent = false, force = false) => {
        if (!ready) return;
        const generation = ++requestGeneration.current;
        try {
            if (!silent) setIsLoading(true);
            else setIsRefreshing(true);
            setError(null);
            const statusGroup = filterTab.toLowerCase() as StatusGroup;
            const params = {
                skip: currentSkip,
                limit: PAGE_SIZE,
                status_group: statusGroup,
            };
            const data = force
                ? await api.trades.myTradesPaged(params, { force: true })
                : await api.trades.myTradesPaged(params);
            if (generation !== requestGeneration.current) return;
            setTrades(data.items as Trade[]);
            setTotalCount(Number(data.total ?? 0));
            setHasLoaded(true);
        } catch (err: any) {
            if (generation !== requestGeneration.current) return;
            const message = err.message || '';
            if (message.toLowerCase().includes('not found') || message.includes('404')) {
                setTrades([]);
                setTotalCount(0);
                setHasLoaded(true);
            } else {
                setError(i18n.language.startsWith('zh') ? t('myTrades.error.message') : message || t('myTrades.error.message'));
            }
        } finally {
            if (generation === requestGeneration.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [currentSkip, filterTab, ready, requestScope, t]);

    useEffect(() => {
        setHasLoaded(false);
    }, [currentSkip, filterTab, requestScope]);

    useEffect(() => {
        void fetchTrades();
        return () => {
            requestGeneration.current += 1;
        };
    }, [fetchTrades]);

    useEffect(() => {
        if (totalCount === 0 && currentSkip !== 0) {
            setCurrentSkip(0);
            return;
        }
        if (totalCount > 0 && currentSkip >= totalCount) {
            setCurrentSkip(Math.floor((totalCount - 1) / PAGE_SIZE) * PAGE_SIZE);
        }
    }, [currentSkip, totalCount]);

    const handleTradeEvent = useCallback(() => {
        fetchTrades(true, true);
    }, [fetchTrades]);

    const streamScope = `${user?.id ?? ''}:${user?.organization_id ?? ''}:${marketSupportContext?.id ?? ''}`;
    useSSE('trades', handleTradeEvent, isAuthenticated && ready && !isMarketSupportActive, streamScope);

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
            fetchTrades(true, true);
        } catch (err: any) {
            addToast({
                type: 'warning',
                title: t('myTrades.toast.confirmFailed.title'),
                message: i18n.language.startsWith('zh') ? t('myTrades.toast.confirmFailed.message') : err.message || t('myTrades.toast.confirmFailed.message'),
            });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDecline = async (tradeId: string) => {
        setActionLoadingId(tradeId);
        try {
            await api.trades.decline(tradeId);
            addToast({ type: 'info', title: t('myTrades.toast.declined.title'), message: t('myTrades.toast.declined.message') });
            fetchTrades(true, true);
        } catch (err: any) {
            addToast({
                type: 'warning',
                title: t('myTrades.toast.declineFailed.title'),
                message: i18n.language.startsWith('zh') ? t('myTrades.toast.declineFailed.message') : err.message || t('myTrades.toast.declineFailed.message'),
            });
        } finally {
            setActionLoadingId(null);
        }
    };

    // The API applies the selected status group before pagination. Keeping the
    // page intact here prevents a second, page-local filter from hiding rows.
    const filteredTrades = trades;

    if (!ready) return null;
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    const containerClass = embedded ? 'min-w-0' : 'max-w-7xl mx-auto p-4 lg:p-10 pb-24';
    const pageHeading = !embedded && (
        <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-3xl v-heading">{t('myTrades.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">{t('myTrades.subtitle')}</p>
        </div>
    );

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
                        {t('myTrades.awaiting.counterparty')}
                    </span>
                );
            }

            return (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleConfirm(trade.id)}
                        disabled={isLoadingThis}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                        {isLoadingThis ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        {t('myTrades.btn.confirm')}
                    </button>
                    <button
                        onClick={() => handleDecline(trade.id)}
                        disabled={isLoadingThis}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
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
            <div className={containerClass}>
                {pageHeading}
                <LoadingScreen label={t('myTrades.loading')} />
            </div>
        );
    }

    if (error && !hasLoaded) {
        return (
            <div className={containerClass}>
                {pageHeading}
                <div className="v-card p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <AlertTriangle size={28} className="text-red-500" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-700 dark:text-white mb-2">{t('myTrades.error.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{error}</p>
                    <button
                        onClick={() => fetchTrades(false, true)}
                        className="mt-4 px-4 py-2 bg-[#5DADE2] hover:bg-[#4A9BD9] text-white font-bold text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DADE2] focus-visible:ring-offset-2"
                    >
                        {t('myTrades.btn.tryAgain')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={containerClass}>
            <div className={embedded ? 'mb-3 flex justify-end' : 'mb-6 lg:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4'}>
                {!embedded && <div>
                    <h1 className="text-2xl lg:text-3xl v-heading">{t('myTrades.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">{t('myTrades.subtitle.full')}</p>
                </div>}
                <button
                    onClick={() => fetchTrades(true, true)}
                    disabled={isRefreshing}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#5DADE2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DADE2] focus-visible:ring-offset-2"
                >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    {t('myTrades.btn.refresh')}
                </button>
            </div>

            <div className="flex items-center gap-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
                {(['ALL', 'ACTIVE', 'COMPLETED'] as FilterTab[]).map((tab) => (
                    <button
                        key={tab}
                        aria-pressed={filterTab === tab}
                        onClick={() => {
                            setFilterTab(tab);
                            setCurrentSkip(0);
                        }}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DADE2] focus-visible:ring-offset-2 ${
                            filterTab === tab
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        {tab === 'ALL' ? t('myTrades.tab.all') : tab === 'ACTIVE' ? t('myTrades.tab.active') : t('myTrades.tab.completed')}
                    </button>
                ))}
            </div>

            {error && (
                <div role="alert" className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    <span className="flex items-center gap-2">
                        <AlertTriangle size={16} />
                        {error}
                    </span>
                    <button
                        type="button"
                        onClick={() => fetchTrades(true, true)}
                        className="font-bold underline underline-offset-2"
                    >
                        {t('myTrades.btn.tryAgain')}
                    </button>
                </div>
            )}

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
                                    const displaySide = userSide === 'BUYER'
                                        ? t('myTrades.side.buy')
                                        : userSide === 'SELLER'
                                            ? t('myTrades.side.sell')
                                            : '—';
                                    const quantity = tradeDisplayQuantityMt(trade);
                                    const price = tradeDisplayPricePerMt(trade);
                                    const total = tradeGrossNotionalUsd(trade);
                                    const statusCfg = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.CANCELLED;
                                    const counterpartyIsHidden = trade.is_anonymous && trade.status === 'PENDING_CONFIRMATION';
                                    const counterpartyName = userSide === 'BUYER'
                                        ? (trade.seller_name || t('myTrades.counterparty.seller'))
                                        : (trade.buyer_name || t('myTrades.counterparty.buyer'));

                                    return (
                                        <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-4 lg:px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {new Date(trade.created_at).toLocaleDateString(locale)}
                                            </td>
                                            <td className="px-4 lg:px-6 py-4">
                                                <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded border border-blue-100 dark:border-blue-800">
                                                    {trade.product_name || trade.fuel_type}
                                                </span>
                                                {trade.availability_window && (
                                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                        {formatAvailabilityWindow(trade.availability_window, locale)}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 lg:px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                                                {trade.delivery_point_name || trade.region}
                                            </td>
                                            <td className="px-4 lg:px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${userSide === 'BUYER' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                    {userSide === 'BUYER' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                    {displaySide}
                                                </span>
                                            </td>
                                            <td className="px-4 lg:px-6 py-4 text-right font-mono font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                {quantity.toLocaleString(locale)}
                                            </td>
                                            {userRole !== 'BUYER' && (
                                                <>
                                                    <td className="px-4 lg:px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                        ${price.toLocaleString(locale)}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        ${total.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-4 lg:px-6 py-4">
                                                {counterpartyIsHidden ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 italic">
                                                        <EyeOff size={12} />
                                                        {t('myTrades.anonymous')}
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
            {!isLoading && totalCount > 0 && (
                <div className="v-card border-t border-slate-200 dark:border-slate-700 px-4 bg-white dark:bg-slate-900">
                    <Pagination
                        total={totalCount}
                        skip={currentSkip}
                        limit={PAGE_SIZE}
                        onPageChange={setCurrentSkip}
                    />
                </div>
            )}
        </div>
    );
};
