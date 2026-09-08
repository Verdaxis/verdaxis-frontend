import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, FileText, Gavel, HandCoins, Loader2, Search } from 'lucide-react';
import { Trade, Page, ViewMode } from '../types';
import { api } from '../services/api';
import type { TradeSummary } from '../services/api';
import type { MarketSlice } from '../utils/sliceUrl';
import { ConfirmModal } from './ui/ConfirmModal';
import { OrderPlaceModal } from './OrderPlaceModal';
import { NeedsAttentionFeed } from './NeedsAttentionFeed';
import { useNamespace } from '../hooks/useNamespace';
import { useDashboardContentReady } from '../hooks/useDashboardContentReady';
import { useWatchlist } from '../hooks/useWatchlist';
import { MarketRadarPanel } from './watchlist/MarketRadarPanel';
import { SupplierDemandFeed } from './SupplierDemandFeed';
import { useMarketSupport } from '../context/MarketSupportContext';

interface CommandCenterProps {
    viewMode: ViewMode;
    onNavigate: (page: Page) => void;
    onOpenSlice?: (slice: MarketSlice) => void;
    openOrderId?: string;
}

const ACTIONABLE_LIMIT = 8;
const EMPTY_SUMMARY: TradeSummary = {
    total_count: 0,
    action_required_count: 0,
    awaiting_counterparty_count: 0,
    confirmed_count: 0,
};

const CTA_CONFIG = {
    BUYER: {
        primary: { icon: Gavel, labelKey: 'common:commandCenter.actions.postBid', descKey: 'common:commandCenter.actions.postBidDescription', side: 'BID' as const },
        secondary: { icon: Search, labelKey: 'common:commandCenter.actions.browseSupply', descKey: 'common:commandCenter.actions.browseSupplyDescription' },
    },
    SUPPLIER: {
        primary: { icon: HandCoins, labelKey: 'common:commandCenter.actions.postSupply', descKey: 'common:commandCenter.actions.postSupplyDescription', side: 'ASK' as const },
        secondary: { icon: Search, labelKey: 'common:commandCenter.actions.browseDemand', descKey: 'common:commandCenter.actions.browseDemandDescription' },
    },
};

export const CommandCenter: React.FC<CommandCenterProps> = ({ viewMode, onNavigate, onOpenSlice, openOrderId }) => {
    const { t, ready } = useNamespace('dashboard');
    const [trades, setTrades] = useState<Trade[]>([]);
    const [summary, setSummary] = useState<TradeSummary>(EMPTY_SUMMARY);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const { radar, events, loading: radarLoading, error: radarError } = useWatchlist();
    const { context, isActive: isMarketSupportActive } = useMarketSupport();
    const loadGeneration = useRef(0);
    const scopeKey = context?.id ?? 'real-account';

    useDashboardContentReady('DASHBOARD', ready && !loading && !loadError
        && (isMarketSupportActive || (!radarLoading && !radarError)));

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

    const loadDashboardData = useCallback(async () => {
        const generation = ++loadGeneration.current;
        setLoading(true);
        setLoadError(false);
        try {
            const summaryRequest = api.trades.summary();
            const actionableRequest = api.trades.myTradesPaged({
                skip: 0,
                limit: ACTIONABLE_LIMIT,
                action_required: true,
            });
            const [nextSummary, actionable] = await Promise.all([summaryRequest, actionableRequest]);
            if (generation !== loadGeneration.current) return;
            setSummary({
                total_count: Number(nextSummary.total_count ?? 0),
                action_required_count: Number(nextSummary.action_required_count ?? 0),
                awaiting_counterparty_count: Number(nextSummary.awaiting_counterparty_count ?? 0),
                confirmed_count: Number(nextSummary.confirmed_count ?? 0),
            });
            setTrades((actionable.items ?? []) as Trade[]);
        } catch (error) {
            if (generation !== loadGeneration.current) return;
            console.error('Error loading Command Center trade data', error);
            setSummary(EMPTY_SUMMARY);
            setTrades([]);
            setLoadError(true);
        } finally {
            if (generation === loadGeneration.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadDashboardData();
        return () => {
            loadGeneration.current += 1;
        };
    }, [loadDashboardData, scopeKey]);

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
                await loadDashboardData();
                setConfirmState({
                    isOpen: true,
                    type: 'SUCCESS',
                    title: viewMode === 'BUYER'
                        ? t('buyerDashboard.modal.successTitle')
                        : t('common:commandCenter.supplier.acceptOrder.successTitle'),
                    message: viewMode === 'BUYER'
                        ? t('buyerDashboard.modal.successMessage')
                        : t('common:commandCenter.supplier.acceptOrder.successMessage'),
                    variant: 'success',
                });
            } catch (error) {
                console.error('Failed to confirm trade', error);
                setConfirmState({
                    isOpen: true,
                    type: 'ERROR',
                    title: t(`${prefix}.modal.errorTitle`),
                    message: viewMode === 'BUYER'
                        ? t('common:commandCenter.buyer.confirmTrade.errorMessage')
                        : t('supplierDashboard.modal.errorMessage'),
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

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t('commandCenter.title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-4">{t('commandCenter.subtitle')}</p>
                <div className="flex flex-col md:flex-row md:items-stretch gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
                    <button
                        data-tour="command-center-primary-action"
                        onClick={() => setOrderModalOpen(true)}
                        className="flex flex-1 items-center gap-3 rounded-md bg-emerald-600 px-4 py-3 text-left text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                        <cta.primary.icon className="h-5 w-5 shrink-0" />
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold">{t(cta.primary.labelKey)}</span>
                            <span className="block text-xs text-emerald-50">{t(cta.primary.descKey)}</span>
                        </span>
                        <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
                    </button>
                    <button
                        onClick={() => onNavigate('MARKETPLACE')}
                        className="flex flex-1 items-center gap-3 rounded-md border border-slate-200 dark:border-slate-700 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                    >
                        <cta.secondary.icon className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-800 dark:text-white">{t(cta.secondary.labelKey)}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{t(cta.secondary.descKey)}</span>
                        </span>
                        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                    {!isMarketSupportActive && <button
                        onClick={() => onNavigate('TRADES')}
                        className="flex flex-1 items-center gap-3 rounded-md border border-slate-200 dark:border-slate-700 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                    >
                        <FileText className="h-5 w-5 shrink-0 text-slate-500" />
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-800 dark:text-white">{t('common:commandCenter.actions.viewDeals')}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{t('common:commandCenter.actions.viewDealsDescription')}</span>
                        </span>
                        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                    </button>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" aria-label={t('commandCenter.metrics.scope', { count: summary.total_count })}>
                {[
                    ['commandCenter.metrics.awaitingYourConfirmation', summary.action_required_count, 'text-amber-600 dark:text-amber-400'],
                    ['commandCenter.metrics.awaitingCounterparty', summary.awaiting_counterparty_count, 'text-sky-600 dark:text-sky-400'],
                    ['commandCenter.metrics.confirmedTrades', summary.confirmed_count, 'text-emerald-600 dark:text-emerald-400'],
                ].map(([labelKey, value, color]) => (
                    <div key={labelKey} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t(String(labelKey))}</div>
                        <div className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</div>
                        <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('commandCenter.metrics.scope', { count: summary.total_count })}</div>
                    </div>
                ))}
            </div>

            <div>
                <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('supplierDashboard.table.actionRequired')}</h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('commandCenter.metrics.queueScope', { limit: ACTIONABLE_LIMIT })}</p>
                    </div>
                    <button onClick={() => onNavigate('TRADES')} className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
                        {t('commandCenter.metrics.viewAll')}
                    </button>
                </div>
                <NeedsAttentionFeed
                    trades={trades}
                    viewMode={viewMode}
                    onNavigate={onNavigate}
                    onConfirmTrade={isMarketSupportActive ? undefined : handleConfirmTrade}
                    onPostOrder={() => setOrderModalOpen(true)}
                    loading={loading}
                    error={loadError ? t('commandCenter.metrics.loadError') : undefined}
                    onRetry={() => void loadDashboardData()}
                    total={summary.action_required_count}
                />
            </div>

            {!isMarketSupportActive && (
                <MarketRadarPanel
                    radar={radar}
                    events={events}
                    loading={radarLoading}
                    error={radarError}
                    onOpenRadar={() => onNavigate('WATCHLISTS')}
                />
            )}

            {viewMode === 'SUPPLIER' && (
                <SupplierDemandFeed onNavigate={onNavigate} onOpenSlice={onOpenSlice} />
            )}

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
                cancelText={confirmState.type === 'ERROR' || confirmState.type === 'SUCCESS' ? '' : t('common:btn.cancel')}
                confirmText={confirmState.type === 'ERROR' || confirmState.type === 'SUCCESS' ? t('common:btn.close') : t('common:btn.confirm')}
            />
        </div>
    );
};

export const BuyerDashboard: React.FC<Omit<CommandCenterProps, 'viewMode'>> = (props) => (
    <CommandCenter viewMode="BUYER" {...props} />
);

export const SupplierDashboard: React.FC<Omit<CommandCenterProps, 'viewMode'>> = (props) => (
    <CommandCenter viewMode="SUPPLIER" {...props} />
);
