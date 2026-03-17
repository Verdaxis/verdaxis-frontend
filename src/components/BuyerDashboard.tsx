import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Anchor, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Page, Trade } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';
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

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">{t('buyerDashboard.title')}</h1>
            
            <div className="grid grid-cols-1 gap-6">
                {requests.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <Anchor className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('buyerDashboard.emptyState.heading')}</h3>
                        <p className="text-slate-500 mt-2">{t('buyerDashboard.emptyState.body')}</p>
                        <button 
                            onClick={() => onNavigate('MAP')}
                            className="mt-6 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                        >
                            {t('buyerDashboard.emptyState.cta')}
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
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{req.quantity_mt} MT</span>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">${req.price_per_mt_usd}/MT</span>
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
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{req.quantity_mt} MT</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">{t('buyerDashboard.order.price')}</div>
                                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${req.price_per_mt_usd}/MT</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">{t('buyerDashboard.order.total')}</div>
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            {req.final_total_usd ? `$${Number(req.final_total_usd).toLocaleString()}` : `$${(req.quantity_mt * req.price_per_mt_usd).toLocaleString()}`}
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
