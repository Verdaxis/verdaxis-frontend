import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Package, Search, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { Trade, Page } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';
import { useNamespace } from '../hooks/useNamespace';
import { useCopilotContext } from '../context/CopilotContext';
import { OrderPlaceModal } from './OrderPlaceModal';
import { MatchSuggestions } from './MatchSuggestions';
import { NeedsAttentionFeed } from './NeedsAttentionFeed';
import { SupplierDemandFeed } from './SupplierDemandFeed';

interface SupplierDashboardProps {
    onNavigate: (page: Page) => void;
    openOrderId?: string;
}

export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({ onNavigate, openOrderId }) => {
    const { t, ready } = useNamespace('dashboard');
    const { setPageContext } = useCopilotContext();
    const [orders, setOrders] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [matchCount, setMatchCount] = useState(0);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'ACCEPT' | 'ERROR' | 'SUCCESS' | null;
        title: string;
        message: string;
        id?: string;
        variant?: 'danger' | 'warning' | 'info' | 'success';
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
        const fetchOrders = async () => {
            try {
                const data = await api.trades.myTrades();
                setOrders(data);
            } catch (e) {
                console.error("Error fetching trades", e);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    useEffect(() => {
        if (!loading) {
            const pending = orders.filter(r => r.status === 'PENDING_CONFIRMATION').length;
            const active = orders.filter(r => r.status === 'CONFIRMED').length;
            const completed = orders.filter(r => r.status === 'DELIVERED' || r.status === 'PAID').length;
            setPageContext({
                view: 'Supplier Command Center',
                pending_requests: pending,
                active_orders: active,
                completed_trades: completed,
                summary: 'Overview of supply operations, matches, and buyer demand.'
            });
        }
    }, [orders, loading, setPageContext]);

    const handleConfirmTrade = useCallback((tradeId: string) => {
        setConfirmState({
            isOpen: true,
            type: 'ACCEPT',
            title: t('supplierDashboard.modal.acceptTitle'),
            message: t('supplierDashboard.modal.acceptMessage'),
            id: tradeId,
            variant: 'info'
        });
    }, [t]);

    const handleConfirmAction = async () => {
        if (confirmState.type === 'ACCEPT' && confirmState.id) {
            setProcessing(true);
            try {
                await api.trades.confirm(confirmState.id);
                const data = await api.trades.myTrades();
                setOrders(data);
                closeConfirm();
            } catch (error) {
                console.error("Failed to accept", error);
                setConfirmState({
                    isOpen: true,
                    type: 'ERROR',
                    title: t('supplierDashboard.modal.errorTitle'),
                    message: t('supplierDashboard.modal.errorMessage'),
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
                <Loader2 size={40} className="animate-spin text-verdaxis" />
            </div>
        );
    }

    const pendingCount = orders.filter(r => r.status === 'PENDING_CONFIRMATION').length;
    const activeCount = orders.filter(r => r.status === 'CONFIRMED').length;
    const completedCount = orders.filter(r => r.status === 'DELIVERED' || r.status === 'PAID').length;

    return (
        <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl v-heading">{t('supplierDashboard.title')}</h1>
                <p className="text-slate-500 mt-1">{t('supplierDashboard.subtitle')}</p>
            </div>

            {/* ─── Hero CTAs ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                    onClick={() => setOrderModalOpen(true)}
                    className="flex items-center gap-3 p-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
                >
                    <Package size={22} />
                    <div className="text-left">
                        <div className="font-bold text-sm">Post Supply</div>
                        <div className="text-xs text-emerald-100">List your fuel inventory</div>
                    </div>
                    <ArrowRight size={16} className="ml-auto opacity-70" />
                </button>
                <button
                    onClick={() => onNavigate('MARKETPLACE')}
                    className="flex items-center gap-3 p-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
                >
                    <Search size={22} />
                    <div className="text-left">
                        <div className="font-bold text-sm">View Demand</div>
                        <div className="text-xs text-blue-100">Browse buyer bids</div>
                    </div>
                    <ArrowRight size={16} className="ml-auto opacity-70" />
                </button>
                <button
                    onClick={() => onNavigate('TRADES')}
                    className="flex items-center gap-3 p-5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-colors shadow-sm"
                >
                    <FileText size={22} />
                    <div className="text-left">
                        <div className="font-bold text-sm">View My Deals</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Trade history & settlements</div>
                    </div>
                    <ArrowRight size={16} className="ml-auto opacity-50" />
                </button>
            </div>

            {/* ─── Activity Stats ─── */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Pending Actions</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{pendingCount}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                        <Sparkles size={12} className="text-amber-500" /> Matches Found
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{matchCount}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Deals Completed</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{completedCount}</div>
                </div>
            </div>

            {/* ─── Match Suggestions ─── */}
            <MatchSuggestions onCountChange={setMatchCount} />

            {/* ─── Buyer Demand Feed ─── */}
            <SupplierDemandFeed onNavigate={onNavigate} />

            {/* ─── Needs Attention ─── */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Needs Attention</h2>
                <NeedsAttentionFeed
                    trades={orders}
                    viewMode="SUPPLIER"
                    onNavigate={onNavigate}
                    onConfirmTrade={handleConfirmTrade}
                    onPostOrder={() => setOrderModalOpen(true)}
                />
            </div>

            {/* Modals */}
            <OrderPlaceModal
                isOpen={orderModalOpen}
                onClose={() => setOrderModalOpen(false)}
                side="ASK"
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
