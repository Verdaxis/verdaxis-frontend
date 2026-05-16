import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Gavel, Package, Search, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { Trade, Page, ViewMode } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';
import { OrderPlaceModal } from './OrderPlaceModal';
// import { MatchSuggestions } from './MatchSuggestions';
import { NeedsAttentionFeed } from './NeedsAttentionFeed';
// MarketFeed removed — redundant with Marketplace
import { useNamespace } from '../hooks/useNamespace';
import { useCopilotContext } from '../context/CopilotContext';
import { useWatchlist } from '../hooks/useWatchlist';
import { MarketRadarPanel } from './watchlist/MarketRadarPanel';

interface CommandCenterProps {
    viewMode: ViewMode;
    onNavigate: (page: Page) => void;
    openOrderId?: string;
}

const CTA_CONFIG = {
    BUYER: {
        primary: { icon: Gavel, label: 'Post a Bid', desc: 'Request green fuel at your price', side: 'BID' as const },
        secondary: { icon: Search, label: 'Browse Supply', desc: 'Explore available fuel listings' },
    },
    SUPPLIER: {
        primary: { icon: Package, label: 'Post Supply', desc: 'List your fuel inventory', side: 'ASK' as const },
        secondary: { icon: Search, label: 'Browse Demand', desc: 'Explore active buyer bids' },
    },
};

export const CommandCenter: React.FC<CommandCenterProps> = ({ viewMode, onNavigate, openOrderId }) => {
    const { t, ready } = useNamespace('dashboard');
    const { setPageContext } = useCopilotContext();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [matchCount, setMatchCount] = useState(0);
    const { radar, events, loading: radarLoading, error: radarError } = useWatchlist();

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'CONFIRM' | 'ERROR' | 'SUCCESS' | null;
        title: string;
        message: string;
        tradeId?: string;
        variant?: 'info' | 'success' | 'danger' | 'warning';
    }>({ isOpen: false, type: null, title: '', message: '' });

    const closeConfirm = () => {
        if (processing) return;
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                setTrades(await api.trades.myTrades());
            } catch (e) {
                console.error('Error fetching trades', e);
            } finally {
                setLoading(false);
            }
        };
        fetchTrades();
    }, []);

    // Scroll to highlighted order
    useEffect(() => {
        if (!loading && openOrderId) {
            const el = document.getElementById(`order-${openOrderId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
                setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2'), 3000);
            }
        }
    }, [loading, openOrderId]);

    // Copilot context
    useEffect(() => {
        if (!loading) {
            const pending = trades.filter(r => r.status === 'PENDING_CONFIRMATION').length;
            const active = trades.filter(r => r.status === 'CONFIRMED').length;
            const completed = trades.filter(r => r.status === 'DELIVERED' || r.status === 'PAID').length;
            setPageContext({
                view: `${viewMode === 'BUYER' ? 'Buyer' : 'Supplier'} Command Center`,
                pending_requests: pending,
                active_orders: active,
                completed_trades: completed,
                summary: `Overview of ${viewMode === 'BUYER' ? 'procurement' : 'supply'} operations, matches, and market activity.`,
            });
        }
    }, [trades, loading, setPageContext, viewMode]);

    const handleConfirmTrade = useCallback((tradeId: string) => {
        const prefix = viewMode === 'BUYER' ? 'buyerDashboard' : 'supplierDashboard';
        setConfirmState({
            isOpen: true,
            type: 'CONFIRM',
            title: t(`${prefix}.modal.${viewMode === 'BUYER' ? 'confirmTitle' : 'acceptTitle'}`),
            message: t(`${prefix}.modal.${viewMode === 'BUYER' ? 'confirmMessage' : 'acceptMessage'}`),
            tradeId,
            variant: 'info',
        });
    }, [t, viewMode]);

    const handleConfirmAction = async () => {
        if (confirmState.type === 'CONFIRM' && confirmState.tradeId) {
            setProcessing(true);
            const prefix = viewMode === 'BUYER' ? 'buyerDashboard' : 'supplierDashboard';
            try {
                await api.trades.confirm(confirmState.tradeId);
                setTrades(await api.trades.myTrades());
                setConfirmState({
                    isOpen: true,
                    type: 'SUCCESS',
                    title: t(`${prefix}.modal.successTitle`),
                    message: t(`${prefix}.modal.successMessage`),
                    variant: 'success',
                });
            } catch (e: any) {
                setConfirmState({
                    isOpen: true,
                    type: 'ERROR',
                    title: t(`${prefix}.modal.errorTitle`),
                    message: t(`${prefix}.modal.errorMessage`) + (e.message || ''),
                    variant: 'danger',
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

    const cta = CTA_CONFIG[viewMode];
    const pendingCount = trades.filter(r => r.status === 'PENDING_CONFIRMATION').length;
    const completedCount = trades.filter(r => r.status === 'DELIVERED' || r.status === 'PAID').length;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* ─── Header + Hero CTAs ─── */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t('commandCenter.title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{t('commandCenter.subtitle')}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => setOrderModalOpen(true)}
                        className="group relative overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-6 text-left transition-all hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-700"
                    >
                        <cta.primary.icon className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-3" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{cta.primary.label}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cta.primary.desc}</p>
                        <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                        onClick={() => onNavigate('MARKETPLACE')}
                        className="group relative overflow-hidden rounded-xl border border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 text-left transition-all hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:border-blue-700"
                    >
                        <cta.secondary.icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-3" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{cta.secondary.label}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cta.secondary.desc}</p>
                        <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                        onClick={() => onNavigate('TRADES')}
                        className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-800/20 p-6 text-left transition-all hover:shadow-lg hover:shadow-slate-500/10 hover:border-slate-300 dark:hover:border-slate-600"
                    >
                        <FileText className="h-8 w-8 text-slate-600 dark:text-slate-400 mb-3" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">View My Deals</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Trade history & settlements</p>
                        <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </div>

            {/* ─── Activity Stats ─── */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pending Actions</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{pendingCount}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Matches Found</div>
                    <div className="flex items-center gap-2">
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{matchCount}</div>
                        {matchCount > 0 && <Sparkles size={16} className="text-emerald-500" />}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Deals</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{completedCount}</div>
                </div>
            </div>

            {/* ─── Match Suggestions (hidden until matching algorithm is solidified) ─── */}
            {/* <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Recommended Matches</h2>
                <MatchSuggestions onViewTrade={() => onNavigate('MARKETPLACE')} onCountChange={setMatchCount} onNavigate={onNavigate} />
            </div> */}

            <MarketRadarPanel radar={radar} events={events} loading={radarLoading} error={radarError} onOpenRadar={() => onNavigate('WATCHLISTS')} />

            {/* ─── Needs Attention ─── */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Needs Attention</h2>
                <NeedsAttentionFeed
                    trades={trades}
                    viewMode={viewMode}
                    onNavigate={onNavigate}
                    onConfirmTrade={handleConfirmTrade}
                    onPostOrder={() => setOrderModalOpen(true)}
                />
            </div>

            {/* Market Feed removed — redundant with Marketplace */}

            {/* ─── Modals ─── */}
            <OrderPlaceModal
                isOpen={orderModalOpen}
                onClose={() => setOrderModalOpen(false)}
                side={cta.primary.side}
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

// Re-exports for backward compatibility — App.tsx imports these names
export const BuyerDashboard: React.FC<Omit<CommandCenterProps, 'viewMode'>> = (props) => (
    <CommandCenter viewMode="BUYER" {...props} />
);

export const SupplierDashboard: React.FC<Omit<CommandCenterProps, 'viewMode'>> = (props) => (
    <CommandCenter viewMode="SUPPLIER" {...props} />
);
