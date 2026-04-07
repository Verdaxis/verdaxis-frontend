import React, { useState, useEffect } from 'react';
import { Loader2, ShoppingCart, Search, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { Page, Trade } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';
import { OrderPlaceModal } from './OrderPlaceModal';
import { MatchSuggestions } from './MatchSuggestions';
import { NeedsAttentionFeed } from './NeedsAttentionFeed';
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

            {/* ─── Needs Attention ─── */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Needs Attention</h2>
                <NeedsAttentionFeed
                    trades={requests}
                    viewMode="BUYER"
                    onNavigate={onNavigate}
                    onConfirmTrade={handleConfirmTrade}
                    onPostOrder={() => setOrderModalOpen(true)}
                />
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
