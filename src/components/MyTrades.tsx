import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    RefreshCw,
    Package,
    CheckCircle2,
    XCircle,
    Truck,
    DollarSign,
    Clock,
    Filter,
    X,
    AlertTriangle,
    EyeOff,
    FileText,
    ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';
import { Trade, TradeStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../hooks/useSSE';
import { useToast } from './Toast';
import { useNamespace } from '../hooks/useNamespace';

type FilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED';

const ACTIVE_STATUSES: TradeStatus[] = ['PENDING_CONFIRMATION', 'CONFIRMED', 'DELIVERED'];
const COMPLETED_STATUSES: TradeStatus[] = ['PAID', 'CANCELLED', 'DECLINED'];

export const MyTrades: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const { addToast } = useToast();
    const { t, ready } = useNamespace('trading');
    const userRole = user?.role; // 'BUYER' | 'SUPPLIER' | 'ADMIN'
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Delivery form state
    const [deliverTradeId, setDeliverTradeId] = useState<string | null>(null);
    const [deliverQuantity, setDeliverQuantity] = useState<number>(0);
    const [deliverPrice, setDeliverPrice] = useState<number>(0);

    // Action loading states
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
            } else {
                if (!silent) setError(message || 'Failed to load trades');
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    // SSE real-time updates
    const handleTradeEvent = useCallback((_event: string, _data: any) => {
        // Refetch trades on any trade event
        fetchTrades(true);
    }, [fetchTrades]);

    useSSE('trades', handleTradeEvent, isAuthenticated);

    // Determine user's side in a trade
    const getUserSide = (trade: Trade): 'BUYER' | 'SELLER' | null => {
        if (!user) return null;
        if (trade.buyer_id === user.organization_id) return 'BUYER';
        if (trade.seller_id === user.organization_id) return 'SELLER';
        // Fallback: check by name
        return null;
    };

    // Actions
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

    const handleDeliverSubmit = async () => {
        if (!deliverTradeId || deliverQuantity <= 0 || deliverPrice <= 0) return;
        setActionLoadingId(deliverTradeId);
        try {
            await api.trades.deliver(deliverTradeId, {
                final_quantity_mt: deliverQuantity,
                final_price_per_mt: deliverPrice,
            });
            addToast({ type: 'success', title: t('myTrades.toast.delivered.title'), message: t('myTrades.toast.delivered.message') });
            setDeliverTradeId(null);
            fetchTrades(true);
        } catch (err: any) {
            addToast({ type: 'warning', title: t('myTrades.toast.deliveryFailed.title'), message: err.message || t('myTrades.toast.deliveryFailed.message') });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handlePay = async (tradeId: string) => {
        setActionLoadingId(tradeId);
        try {
            await api.trades.pay(tradeId);
            addToast({ type: 'success', title: t('myTrades.toast.paid.title'), message: t('myTrades.toast.paid.message') });
            fetchTrades(true);
        } catch (err: any) {
            addToast({ type: 'warning', title: t('myTrades.toast.payFailed.title'), message: err.message || t('myTrades.toast.payFailed.message') });
        } finally {
            setActionLoadingId(null);
        }
    };

    // Filtering
    const filteredTrades = trades.filter(tr => {
        if (filterTab === 'ACTIVE') return ACTIVE_STATUSES.includes(tr.status);
        if (filterTab === 'COMPLETED') return COMPLETED_STATUSES.includes(tr.status);
        return true;
    });

    const activeCounts = {
        ALL: trades.length,
        ACTIVE: trades.filter(tr => ACTIVE_STATUSES.includes(tr.status)).length,
        COMPLETED: trades.filter(tr => COMPLETED_STATUSES.includes(tr.status)).length,
    };

    if (!ready) return null;

    // STATUS_CONFIG lives inside the component to access t()
    const STATUS_CONFIG: Record<TradeStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
        PENDING_CONFIRMATION: { label: t('myTrades.status.pending'), color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', borderColor: 'border-amber-200 dark:border-amber-800' },
        CONFIRMED: { label: t('myTrades.status.confirmed'), color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', borderColor: 'border-blue-200 dark:border-blue-800' },
        DELIVERED: { label: t('myTrades.status.delivered'), color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30', borderColor: 'border-green-200 dark:border-green-800' },
        PAID: { label: t('myTrades.status.paid'), color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', borderColor: 'border-emerald-200 dark:border-emerald-800' },
        CANCELLED: { label: t('myTrades.status.cancelled'), color: 'text-slate-500 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800', borderColor: 'border-slate-200 dark:border-slate-700' },
        DECLINED: { label: t('myTrades.status.declined'), color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', borderColor: 'border-red-200 dark:border-red-800' },
    };

    // Render actions based on trade status and user role (E1/E2/E4)
    const renderActions = (trade: Trade) => {
        const userSide = getUserSide(trade);
        const isLoadingThis = actionLoadingId === trade.id;

        // --- E1: PENDING_CONFIRMATION — "Awaiting Confirmation" with clock ---
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

        // --- E1/E2/E4: CONFIRMED ---
        if (trade.status === 'CONFIRMED') {
            // E2: BUYER sees "Confirm Delivery" button
            if (userSide === 'BUYER') {
                return (
                    <button
                        onClick={() => {
                            setDeliverTradeId(trade.id);
                            setDeliverQuantity(trade.quantity_mt);
                            setDeliverPrice(trade.price_per_mt_usd);
                        }}
                        disabled={isLoadingThis}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                        {isLoadingThis ? <Loader2 size={12} className="animate-spin" /> : <Truck size={12} />}
                        Confirm Delivery
                    </button>
                );
            }

            // E1+E4: SELLER sees "Confirmed — Commission Due" label + commission notice
            const commissionAmt = trade.commission_amount_usd
                ? `$${Number(trade.commission_amount_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${Number(trade.commission_rate_pct)}%`;
            return (
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                        <Clock size={12} />
                        Confirmed &mdash; Commission Due
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
                        <ShieldAlert size={11} />
                        Commission due ({commissionAmt}) &mdash; counterparty revealed after payment
                    </span>
                </div>
            );
        }

        // --- E1: DELIVERED ---
        if (trade.status === 'DELIVERED') {
            // E1: Seller sees "Mark as Paid" button
            if (userSide === 'SELLER') {
                return (
                    <button
                        onClick={() => handlePay(trade.id)}
                        disabled={isLoadingThis}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                        {isLoadingThis ? <Loader2 size={12} className="animate-spin" /> : <DollarSign size={12} />}
                        Mark as Paid
                    </button>
                );
            }

            // E1: Buyer sees "Delivered" label
            return (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                    <Truck size={12} />
                    Delivered
                </span>
            );
        }

        // --- E1: PAID — "Completed" with check ---
        if (trade.status === 'PAID') {
            return (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Completed
                </span>
            );
        }

        // DECLINED, CANCELLED — no actions
        return <span className="text-xs text-slate-400 dark:text-slate-500 italic">{t('myTrades.noActions')}</span>;
    };

    // Loading state
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

    // Error state
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
            {/* Header */}
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

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
                {(['ALL', 'ACTIVE', 'COMPLETED'] as FilterTab[]).map(tab => (
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
                        <span className="ml-1.5 text-xs opacity-60">({activeCounts[tab]})</span>
                    </button>
                ))}
            </div>

            {/* Empty state */}
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
                /* Trades Table */
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
                                    {/* E3: Hide price/total for buyers */}
                                    {userRole !== 'BUYER' && (
                                        <>
                                            <th className="px-4 lg:px-6 py-4 text-right">{t('myTrades.col.price')}</th>
                                            <th className="px-4 lg:px-6 py-4 text-right">{t('myTrades.col.total')}</th>
                                        </>
                                    )}
                                    <th className="px-4 lg:px-6 py-4">Counterparty</th>
                                    <th className="px-4 lg:px-6 py-4">{t('myTrades.col.status')}</th>
                                    <th className="px-4 lg:px-6 py-4">{t('myTrades.col.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                {filteredTrades.map((trade) => {
                                    const userSide = getUserSide(trade);
                                    const displaySide = userSide === 'BUYER' ? 'BUY' : userSide === 'SELLER' ? 'SELL' : '—';
                                    const quantity = trade.final_quantity_mt || trade.quantity_mt;
                                    const price = trade.final_price_per_mt || trade.price_per_mt_usd;
                                    const total = trade.final_total_usd || (quantity * price);
                                    const statusCfg = STATUS_CONFIG[trade.status] || STATUS_CONFIG.CANCELLED;
                                    const isSeller = userSide === 'SELLER';

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
                                                <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                                                    displaySide === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : displaySide === 'SELL' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'
                                                }`}>
                                                    {displaySide === 'BUY' ? <ArrowDownRight size={12} /> : displaySide === 'SELL' ? <ArrowUpRight size={12} /> : null}
                                                    {displaySide}
                                                </span>
                                            </td>
                                            <td className="px-4 lg:px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                {quantity.toLocaleString()}
                                            </td>
                                            {/* E3: Hide price/total columns for buyers */}
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
                                            {/* Counterparty — E4: sellers see gated identity */}
                                            <td className="px-4 lg:px-6 py-4">
                                                {trade.status === 'PENDING_CONFIRMATION' || trade.is_anonymous ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 italic">
                                                        <EyeOff size={12} />
                                                        Anonymous
                                                    </span>
                                                ) : isSeller && trade.status === 'CONFIRMED' ? (
                                                    /* E4: Seller sees gated message until commission is paid */
                                                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 italic">
                                                        <EyeOff size={12} />
                                                        Revealed after payment
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                        {userSide === 'BUYER' ? (trade.seller_name || 'Seller') : (trade.buyer_name || 'Buyer')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 lg:px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.borderColor}`}>
                                                        {statusCfg.label}
                                                    </span>
                                                    {/* E5: Invoice Sent badge for confirmed+ trades (seller only) */}
                                                    {isSeller && ['CONFIRMED', 'DELIVERED', 'PAID'].includes(trade.status) && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                                                            <FileText size={10} />
                                                            Invoice Sent
                                                        </span>
                                                    )}
                                                </div>
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

            {/* Deliver Modal */}
            {deliverTradeId && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Montserrat']">{t('myTrades.deliver.title')}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('myTrades.deliver.subtitle')}</p>
                            </div>
                            <button onClick={() => setDeliverTradeId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('myTrades.deliver.finalQty')}</label>
                                <input
                                    type="number"
                                    value={deliverQuantity || ''}
                                    onChange={(e) => setDeliverQuantity(parseFloat(e.target.value) || 0)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2] focus:ring-1 focus:ring-[#5DADE2]"
                                    min={0}
                                    step={1}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('myTrades.deliver.finalPrice')}</label>
                                <input
                                    type="number"
                                    value={deliverPrice || ''}
                                    onChange={(e) => setDeliverPrice(parseFloat(e.target.value) || 0)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2] focus:ring-1 focus:ring-[#5DADE2]"
                                    min={0}
                                    step={0.01}
                                />
                            </div>
                            {deliverQuantity > 0 && deliverPrice > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">{t('myTrades.deliver.finalTotal')}</span>
                                        <span className="font-bold text-slate-800 dark:text-white">
                                            ${(deliverQuantity * deliverPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 bg-slate-50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setDeliverTradeId(null)}
                                className="flex-1 py-2.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold rounded-lg transition-colors text-sm"
                            >
                                {t('myTrades.btn.cancel')}
                            </button>
                            <button
                                onClick={handleDeliverSubmit}
                                disabled={deliverQuantity <= 0 || deliverPrice <= 0 || actionLoadingId === deliverTradeId}
                                className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoadingId === deliverTradeId ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Truck size={16} />
                                )}
                                {t('myTrades.btn.confirmDelivery')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
