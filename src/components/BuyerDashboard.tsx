import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, AlertCircle, CheckCircle, Clock, ShoppingCart, Search, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { Page, Trade } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';
import { OrderPlaceModal } from './OrderPlaceModal';
import { MatchSuggestions } from './MatchSuggestions';
import { useNamespace } from '../hooks/useNamespace';

interface BuyerDashboardProps {
    onNavigate: (page: Page) => void;
    openOrderId?: string;
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ onNavigate, openOrderId }) => {
    const { t, ready } = useNamespace('dashboard');
    const [requests, setRequests] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [matchCount, setMatchCount] = useState<number>(0);

    // Scroll to order when loaded
    useEffect(() => {
        if (!loading && openOrderId) {
            const element = document.getElementById(`order-${openOrderId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
                setTimeout(() => {
                     element.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2');
                }, 3000);
            }
        }
    }, [loading, openOrderId]);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'CONFIRM_TRADE' | 'ERROR' | 'SUCCESS' | null;
        title: string;
        message: string;
        tradeId?: string;
        variant?: 'info' | 'success' | 'danger' | 'warning';
    }>({
        isOpen: false,
        type: null,
        title: '',
        message: ''
    });

    const closeConfirm = () => {
        if (processing) return;
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const data = await api.trades.myTrades();
                setRequests(data);
            } catch (e) {
                console.error("Error fetching trades", e);
            } finally {
                setLoading(false);
            }
        };
        fetchTrades();
    }, []);

    const handleConfirmTrade = (tradeId: string) => {
        setConfirmState({
            isOpen: true,
            type: 'CONFIRM_TRADE',
            title: t('buyerDashboard.modal.confirmTitle'),
            message: t('buyerDashboard.modal.confirmMessage'),
            tradeId,
            variant: 'info'
        });
    };

    const handleConfirmAction = async () => {
        if (confirmState.type === 'CONFIRM_TRADE' && confirmState.tradeId) {
            setProcessing(true);
            try {
                await api.trades.confirm(confirmState.tradeId);
                setRequests(prev => prev.map(r =>
                    r.id === confirmState.tradeId ? { ...r, status: 'CONFIRMED' as const } : r
                ));
                 setConfirmState({
                    isOpen: true,
                    type: 'SUCCESS',
                    title: t('buyerDashboard.modal.successTitle'),
                    message: t('buyerDashboard.modal.successMessage'),
                    variant: 'success'
                });
            } catch (e: any) {
                 setConfirmState({
                    isOpen: true,
                    type: 'ERROR',
                    title: t('buyerDashboard.modal.errorTitle'),
                    message: t('buyerDashboard.modal.errorMessagePrefix') + e.message,
                    variant: 'danger'
                });
            } finally {
                setProcessing(false);
            }
        } else {
            closeConfirm();
        }
    };

    if (!ready || loading) {
        return (
            <div className="p-10 flex justify-center">
                <Loader2 size={40} className="animate-spin text-emerald-500" />
            </div>
        );
    }

    // Compute activity stats
    const openBids = requests.filter(r => r.status === 'PENDING_CONFIRMATION').length;
    const confirmedDeals = requests.filter(r => r.status === 'CONFIRMED' || r.status === 'DELIVERED' || r.status === 'PAID').length;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* ─── Hero CTAs ─── */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">What would you like to do?</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => setOrderModalOpen(true)}
                        className="group relative overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-6 text-left transition-all hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-700"
                    >
                        <ShoppingCart className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-3" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Post a Bid</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Request green fuel at your price</p>
                        <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                        onClick={() => onNavigate('MARKETPLACE')}
                        className="group relative overflow-hidden rounded-xl border border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 text-left transition-all hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:border-blue-700"
                    >
                        <Search className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-3" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Browse Supply</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Explore available fuel listings</p>
                        <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                        onClick={() => onNavigate('TRADES')}
                        className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-800/20 p-6 text-left transition-all hover:shadow-lg hover:shadow-slate-500/10 hover:border-slate-300 dark:hover:border-slate-600"
                    >
                        <FileText className="h-8 w-8 text-slate-600 dark:text-slate-400 mb-3" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">View My Deals</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track trades and confirmations</p>
                        <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </div>

            {/* ─── Activity Stats Bar ─── */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Open Trades</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{openBids}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Matches Found</div>
                    <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{matchCount}</div>
                        {matchCount > 0 && <Sparkles size={16} className="text-emerald-500" />}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Deals</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{confirmedDeals}</div>
                </div>
            </div>

            {/* ─── Match Suggestions ─── */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Recommended Matches</h2>
                <MatchSuggestions onViewTrade={(orderId) => onNavigate('MARKETPLACE')} onCountChange={setMatchCount} />
            </div>

            {/* ─── Recent Trades ─── */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Your Trades</h2>
                <div className="grid grid-cols-1 gap-4">
                    {requests.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <ShoppingCart className="mx-auto h-10 w-10 text-slate-400 mb-3" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No trades yet</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Post your first bid to attract suppliers</p>
                            <button
                                onClick={() => setOrderModalOpen(true)}
                                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors font-medium"
                            >
                                Post a Bid
                            </button>
                        </div>
                    ) : (
                        requests.map(req => (
                            <div key={req.id} id={`order-${req.id}`} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-500">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-bold uppercase ${req.fuel_type === 'Methanol' ? 'text-blue-600' : 'text-green-600'}`}>
                                                {req.fuel_type}
                                            </span>
                                            <span className="text-slate-400">•</span>
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{Number(req.quantity_mt).toLocaleString()} MT</span>
                                            <span className="text-slate-400">•</span>
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">${Number(req.price_per_mt_usd).toLocaleString()}/MT</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{t('buyerDashboard.order.idLabel')}: {req.id.slice(0, 8)} • {new Date(req.created_at).toLocaleDateString()} • {t('buyerDashboard.order.sellerLabel')}: {req.seller_name}</div>
                                    </div>
                                    <div>
                                        {req.status === 'PENDING_CONFIRMATION' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                                <Clock size={14} /> {t('buyerDashboard.order.status.pendingConfirmation')}
                                            </span>
                                        )}
                                        {req.status === 'CONFIRMED' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                <CheckCircle size={14} /> {t('buyerDashboard.order.status.confirmed')}
                                            </span>
                                        )}
                                        {req.status === 'DELIVERED' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                <TrendingUp size={14} /> {t('buyerDashboard.order.status.delivered')}
                                            </span>
                                        )}
                                        {req.status === 'PAID' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                <CheckCircle size={14} /> {t('buyerDashboard.order.status.paid')}
                                            </span>
                                        )}
                                        {req.status === 'CANCELLED' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                                <AlertCircle size={14} /> {t('buyerDashboard.order.status.cancelled')}
                                            </span>
                                        )}
                                        {req.status === 'DECLINED' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                <AlertCircle size={14} /> {t('buyerDashboard.order.status.declined')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Trade Details */}
                                <div className="p-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">{t('buyerDashboard.order.region')}</div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{req.region}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">{t('buyerDashboard.order.quantity')}</div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{Number(req.quantity_mt).toLocaleString()} MT</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">{t('buyerDashboard.order.price')}</div>
                                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${Number(req.price_per_mt_usd).toLocaleString()}/MT</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">{t('buyerDashboard.order.total')}</div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                {req.final_total_usd ? `$${Number(req.final_total_usd).toLocaleString()}` : `$${(Number(req.quantity_mt) * Number(req.price_per_mt_usd)).toLocaleString()}`}
                                            </div>
                                        </div>
                                    </div>
                                    {req.status === 'PENDING_CONFIRMATION' && (
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => handleConfirmTrade(req.id)}
                                                disabled={processing}
                                                className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded hover:opacity-90 transition-opacity"
                                            >
                                                {t('buyerDashboard.order.confirmTrade')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ─── Order Placement Modal ─── */}
            <OrderPlaceModal
                isOpen={orderModalOpen}
                onClose={() => setOrderModalOpen(false)}
                side="BID"
            />

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={closeConfirm}
                onConfirm={handleConfirmAction}
                title={confirmState.title}
                message={confirmState.message}
                variant={confirmState.variant}
                isLoading={processing}
                cancelText={confirmState.type === 'ERROR' || confirmState.type === 'SUCCESS' ? undefined : 'Cancel'}
                confirmText={confirmState.type === 'ERROR' || confirmState.type === 'SUCCESS' ? 'Close' : 'Confirm'}
            />
        </div>
    );
};
