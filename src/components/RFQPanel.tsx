import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Plus, Loader2, X, ChevronDown, ChevronUp, Check, Ban,
    MessageSquare, Clock, Send, EyeOff, AlertCircle, ArrowLeftRight,
    XCircle, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { API_URL } from '../services/config';
import type { RFQ, RFQQuote, Product, DeliveryPoint } from '../types';
import { VerdaxisSelect } from './ui/VerdaxisSelect';
import {
    SPOT_WINDOW,
    formatAvailabilityWindow,
    getAvailabilityWindowOptions,
} from '../utils/availabilityWindow';

// ─── Status styles ────────────────────────────────────────────
const RFQ_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    OPEN:      { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    QUOTED:    { bg: 'bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400',       dot: 'bg-blue-500' },
    ACCEPTED:  { bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500' },
    EXPIRED:   { bg: 'bg-slate-500/10',   text: 'text-slate-500 dark:text-slate-400',     dot: 'bg-slate-500' },
    CANCELLED: { bg: 'bg-red-500/10',     text: 'text-red-600 dark:text-red-400',         dot: 'bg-red-500' },
};
const QUOTE_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    PENDING:   { bg: 'bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400' },
    ACCEPTED:  { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
    DECLINED:  { bg: 'bg-red-500/10',     text: 'text-red-600 dark:text-red-400' },
    WITHDRAWN: { bg: 'bg-slate-500/10',   text: 'text-slate-500 dark:text-slate-400' },
};

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Main Panel ───────────────────────────────────────────────
interface RFQPanelProps {
    role: 'BUYER' | 'SUPPLIER';
    sortBy?: 'price_asc' | 'price_desc' | 'quantity_desc' | 'newest';
    onSortChange?: (sort: 'price_asc' | 'price_desc' | 'quantity_desc' | 'newest') => void;
    region?: string;
    fuelType?: string;
    availability?: string;
}

export const RFQPanel: React.FC<RFQPanelProps> = ({ role, sortBy = 'price_asc', region, fuelType, availability }) => {
    const { user } = useAuth();
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [quoteTarget, setQuoteTarget] = useState<RFQ | null>(null);
    const [counterTarget, setCounterTarget] = useState<{ rfq: RFQ; quote: RFQQuote } | null>(null);
    const [reviseTarget, setReviseTarget] = useState<{ rfq: RFQ; quote: RFQQuote } | null>(null);

    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 4000);
    }, []);

    const fetchRFQs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await api.rfq.list({
                limit: 50,
                region: region || undefined,
                fuel_type: fuelType && fuelType !== 'All' ? fuelType : undefined,
                availability_window: availability || undefined,
            });
            setRfqs(data.items ?? data);
        } catch (err: any) {
            if (!silent) setError(err?.message || 'Failed to load RFQs');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [region, fuelType, availability]);

    useEffect(() => { fetchRFQs(); }, [fetchRFQs]);

    // 10s polling fallback
    useEffect(() => {
        const iv = setInterval(() => fetchRFQs(true), 10_000);
        return () => clearInterval(iv);
    }, [fetchRFQs]);

    // SSE real-time (<2s)
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const url = `${API_URL}/stream/activity?token=${encodeURIComponent(token)}`;
        const source = new EventSource(url);

        source.addEventListener('rfq_quote_received', () => { fetchRFQs(true); showToast('New quote activity on your RFQ'); });
        source.addEventListener('rfq_countered', () => { fetchRFQs(true); showToast('Counter-offer received'); });
        source.addEventListener('seller_revised', () => { fetchRFQs(true); showToast('Seller revised their quote'); });
        source.addEventListener('trade_confirmed', () => { fetchRFQs(true); showToast('Trade confirmed!'); });
        source.addEventListener('quote_declined', () => { fetchRFQs(true); showToast('Quote was declined'); });
        source.addEventListener('quote_withdrawn', () => { fetchRFQs(true); showToast('Quote was withdrawn'); });
        source.addEventListener('quote_superseded', () => { fetchRFQs(true); });

        return () => source.close();
    }, [fetchRFQs, showToast]);

    useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

    // ─── Action handlers ──────────────────────────────────────
    const withAction = async (id: string, fn: () => Promise<void>) => {
        setActionLoading(id);
        try { await fn(); await fetchRFQs(true); } catch (err: any) { console.error(err); showToast(err?.message || 'Action failed. Please try again.'); }
        setActionLoading(null);
    };

    const handleBuyerAccept = (rfqId: string, qId: string) =>
        withAction(qId, () => api.rfq.accept(rfqId, qId));

    const handleBuyerDecline = (rfqId: string, qId: string) =>
        withAction(qId, () => api.rfq.decline(rfqId, qId));

    const handleSellerAccept = (rfqId: string, qId: string) =>
        withAction(qId, async () => { await api.rfq.sellerAccept(rfqId, qId); showToast('Deal closed at buyer\'s target price'); });

    const handleSellerWithdraw = (rfqId: string, qId: string) =>
        withAction(qId, () => api.rfq.withdraw(rfqId, qId));

    const handleCancel = (rfqId: string) =>
        withAction(rfqId, () => api.rfq.cancel(rfqId));

    // ─── Render ───────────────────────────────────────────────
    if (loading) return (
        <div className="v-card p-6 flex items-center justify-center gap-3 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-medium">Loading RFQs...</span>
        </div>
    );

    if (error) return (
        <div className="v-card p-4 text-center text-sm text-red-500 dark:text-red-400">
            <AlertCircle size={16} className="inline mr-1" />{error}
        </div>
    );

    return (
        <div className="space-y-4">
            {toast && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                    <MessageSquare size={14} />{toast}
                    <button onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100"><X size={14} /></button>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Request for Quotes</h3>
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-medium">{rfqs.length}</span>
                </div>
                {role === 'BUYER' && (
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-lg transition-colors">
                        <Plus size={14} />Create RFQ
                    </button>
                )}
            </div>

            {/* Status filter tabs */}
            {(() => {
                const LABELS: Record<string, string> = { ALL: 'All', OPEN: 'Open', QUOTED: 'Negotiating', ACCEPTED: 'Accepted', CANCELLED: 'Cancelled', EXPIRED: 'Expired' };
                const counts: Record<string, number> = { ALL: rfqs.length, OPEN: 0, QUOTED: 0, ACCEPTED: 0, CANCELLED: 0, EXPIRED: 0 };
                rfqs.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
                const tabs = ['ALL', 'OPEN', 'QUOTED', 'ACCEPTED', 'CANCELLED', 'EXPIRED'];
                return (
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mb-1">
                        {tabs.map(tab => (
                            <button key={tab} onClick={() => setStatusFilter(tab)}
                                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors whitespace-nowrap ${
                                    statusFilter === tab
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}>
                                {LABELS[tab] || tab} <span className="ml-0.5 opacity-70">{counts[tab]}</span>
                            </button>
                        ))}
                    </div>
                );
            })()}

            {(() => {
                let filtered = statusFilter === 'ALL' ? rfqs : rfqs.filter(r => r.status === statusFilter);
                if (sortBy === 'price_asc') {
                    filtered = [...filtered].sort((a, b) => (a.target_price_per_mt || 0) - (b.target_price_per_mt || 0));
                } else if (sortBy === 'price_desc') {
                    filtered = [...filtered].sort((a, b) => (b.target_price_per_mt || 0) - (a.target_price_per_mt || 0));
                } else if (sortBy === 'quantity_desc') {
                    filtered = [...filtered].sort((a, b) => b.quantity_mt - a.quantity_mt);
                } else if (sortBy === 'newest') {
                    filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                }
                return filtered.length === 0 ? (
                <div className="v-card p-8 text-center">
                    <MessageSquare size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500">{rfqs.length === 0
                        ? (role === 'BUYER' ? 'No RFQs yet. Create one to request quotes from suppliers.' : 'No open RFQs available right now.')
                        : `No ${statusFilter.toLowerCase()} RFQs.`}</p>
                </div>
            ) : (
                filtered.map(rfq => {
                    const isExpanded = expandedId === rfq.id;
                    const statusStyle = RFQ_STATUS_STYLES[rfq.status] ?? RFQ_STATUS_STYLES.OPEN;
                    const isOwn = rfq.buyer_org_id === user?.organization_id;

                    return (
                        <div key={rfq.id} className="v-card overflow-hidden">
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : rfq.id)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                            >
                                <div className="text-left min-w-0">
                                    <div className="flex items-center gap-2">
                                        {rfq.reference_number && <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{rfq.reference_number}</span>}
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{rfq.product_name || rfq.product_id}</span>
                                        {rfq.is_anonymous && <EyeOff size={12} className="text-slate-400 flex-shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                                        <span>{rfq.quantity_mt.toLocaleString()} MT</span>
                                        {rfq.target_price_per_mt && (
                                            <><span className="text-slate-300 dark:text-slate-600">|</span><span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">Target ${rfq.target_price_per_mt.toLocaleString()}/MT</span></>
                                        )}
                                        {rfq.delivery_point_name && (
                                            <><span className="text-slate-300 dark:text-slate-600">|</span><span>{rfq.delivery_point_name}</span></>
                                        )}
                                        <span className="text-slate-300 dark:text-slate-600">|</span>
                                        <span>{formatAvailabilityWindow(rfq.availability_window)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    {rfq.quote_count > 0 && (
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">{rfq.quote_count} quote{rfq.quote_count !== 1 ? 's' : ''}</span>
                                    )}
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyle.bg} ${statusStyle.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />{rfq.status}
                                    </span>
                                    <Clock size={12} className="text-slate-400" />
                                    <span className="text-[10px] text-slate-400">{relativeTime(rfq.created_at)}</span>
                                    {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                                        {rfq.delivery_point_name && (
                                            <div><span className="text-slate-400">Delivery:</span> <span className="text-slate-700 dark:text-slate-200 font-medium">{rfq.delivery_point_name}</span></div>
                                        )}
                                        <div><span className="text-slate-400">Created:</span> <span className="text-slate-700 dark:text-slate-200 font-medium">{new Date(rfq.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })} {new Date(rfq.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</span></div>
                                        {rfq.status !== 'ACCEPTED' && rfq.status !== 'CANCELLED' && (
                                            <div><span className="text-slate-400">Expires:</span> <span className="text-slate-700 dark:text-slate-200 font-medium">{new Date(rfq.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })} {new Date(rfq.expires_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</span></div>
                                        )}
                                        {!rfq.is_anonymous && rfq.buyer_org_name && (
                                            <div><span className="text-slate-400">Buyer:</span> <span className="text-slate-700 dark:text-slate-200 font-medium">{rfq.buyer_org_name}</span></div>
                                        )}
                                    </div>

                                    {rfq.quotes && rfq.quotes.length > 0 && (
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quotes</span>
                                            {rfq.quotes.map(q => {
                                                const qStyle = QUOTE_STATUS_STYLES[q.status] ?? QUOTE_STATUS_STYLES.PENDING;
                                                const target = rfq.target_price_per_mt ? Number(rfq.target_price_per_mt) : null;
                                                const ask = Number(q.price_per_mt_usd);
                                                const isPending = q.status === 'PENDING';
                                                const rfqActive = rfq.status === 'OPEN' || rfq.status === 'QUOTED';
                                                const hasGap = target !== null && target < ask;
                                                const lastBy = q.last_counter_by;

                                                // Turn logic: seller submitted → buyer's turn. Buyer countered → seller's turn.
                                                const isBuyerTurn = lastBy === null || lastBy === undefined || lastBy === 'seller';
                                                const isSellerTurn = lastBy === 'buyer';

                                                // "Your turn" — full action buttons enabled
                                                const buyerCanAct = isOwn && isPending && rfqActive && role === 'BUYER' && isBuyerTurn;
                                                const sellerCanAct = !isOwn && isPending && rfqActive && role === 'SUPPLIER' && isSellerTurn;

                                                // "Waiting" — you made the last move
                                                const buyerWaiting = isOwn && isPending && rfqActive && role === 'BUYER' && lastBy === 'buyer';
                                                const sellerWaiting = !isOwn && isPending && rfqActive && role === 'SUPPLIER' && !isSellerTurn;

                                                // Is this quote relevant to the current user?
                                                const isMyQuote = (isOwn && role === 'BUYER') || (!isOwn && role === 'SUPPLIER');
                                                const isYourTurn = buyerCanAct || sellerCanAct;
                                                const isWaiting = buyerWaiting || sellerWaiting;

                                                return (
                                                    <div key={q.id} className={`rounded-lg border overflow-hidden transition-all ${
                                                        isYourTurn
                                                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800'
                                                            : isWaiting
                                                                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-75'
                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                                    }`}>
                                                        {/* Turn indicator banner */}
                                                        {isMyQuote && isPending && rfqActive && (
                                                            <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                                isYourTurn
                                                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                                                    : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                                                            }`}>
                                                                {isYourTurn ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                                                        Your turn to respond
                                                                    </span>
                                                                ) : isWaiting ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <Loader2 size={10} className="animate-spin" />
                                                                        Waiting for counterparty
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        )}
                                                        {/* Quote header: price + status */}
                                                        <div className="flex items-center justify-between px-3 py-2">
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">${ask.toLocaleString()}/MT</span>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${qStyle.bg} ${qStyle.text}`}>{q.status}</span>
                                                                    {hasGap && isPending && (
                                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                                                            (target: ${target!.toLocaleString()})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {q.seller_org_name && <span className="text-[10px] text-slate-400">from {q.seller_org_name}</span>}
                                                            </div>

                                                            {/* Action buttons — always show all 3 for both states, but disabled when waiting */}
                                                            {isMyQuote && isPending && rfqActive && (
                                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                    {/* Accept */}
                                                                    <button
                                                                        onClick={() => buyerCanAct ? handleBuyerAccept(rfq.id, q.id) : handleSellerAccept(rfq.id, q.id)}
                                                                        disabled={!!actionLoading || isWaiting || ((sellerCanAct) && !target)}
                                                                        title={role === 'SUPPLIER' ? `Accept buyer's target ($${target}/MT)` : `Accept at $${ask}/MT`}
                                                                        className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                                                            isYourTurn ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-emerald-500/50 text-white/70'
                                                                        }`}
                                                                    >
                                                                        {actionLoading === q.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                                                        Accept
                                                                    </button>
                                                                    {/* Counter */}
                                                                    {hasGap && (
                                                                        <button
                                                                            onClick={() => buyerCanAct
                                                                                ? setCounterTarget({ rfq, quote: q })
                                                                                : setReviseTarget({ rfq, quote: q })}
                                                                            disabled={!!actionLoading || isWaiting}
                                                                            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                                                                isYourTurn ? 'bg-amber-500 hover:bg-amber-400 text-white' : 'bg-amber-500/50 text-white/70'
                                                                            }`}
                                                                        >
                                                                            <ArrowLeftRight size={10} />
                                                                            Counter
                                                                        </button>
                                                                    )}
                                                                    {/* Decline */}
                                                                    <button
                                                                        onClick={() => buyerCanAct ? handleBuyerDecline(rfq.id, q.id) : handleSellerWithdraw(rfq.id, q.id)}
                                                                        disabled={!!actionLoading || isWaiting}
                                                                        className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                                                            isYourTurn
                                                                                ? 'text-red-500 hover:text-red-400 border border-red-200 dark:border-red-800'
                                                                                : 'text-red-400/50 border border-red-200/50 dark:border-red-800/50'
                                                                        }`}
                                                                    >
                                                                        <XCircle size={10} />
                                                                        Decline
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-1">
                                        {/* Cancel RFQ: buyer only, hidden during active negotiation */}
                                        {isOwn && (rfq.status === 'OPEN' || rfq.status === 'QUOTED') && !rfq.quotes?.some(q => q.status === 'PENDING') && (
                                            <button onClick={() => handleCancel(rfq.id)}
                                                disabled={actionLoading === rfq.id}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:text-red-400 border border-red-200 dark:border-red-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                                {actionLoading === rfq.id ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                                                Cancel RFQ
                                            </button>
                                        )}
                                        {/* Submit Quote: seller only, hidden if already has a PENDING quote on this RFQ */}
                                        {!isOwn && (rfq.status === 'OPEN' || rfq.status === 'QUOTED') && role === 'SUPPLIER'
                                            && !rfq.quotes?.some(q => q.status === 'PENDING') && (
                                            <button onClick={() => setQuoteTarget(rfq)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors">
                                                <Send size={12} />Submit Quote
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            );
            })()}

            {showCreateModal && <CreateRFQModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); fetchRFQs(true); }} />}
            {quoteTarget && <SubmitQuoteModal rfq={quoteTarget} onClose={() => setQuoteTarget(null)} onSubmitted={() => { setQuoteTarget(null); fetchRFQs(true); }} />}
            {counterTarget && <CounterModal rfq={counterTarget.rfq} quote={counterTarget.quote} onClose={() => setCounterTarget(null)} onSubmitted={() => { setCounterTarget(null); fetchRFQs(true); showToast('Counter-offer sent'); }} />}
            {reviseTarget && <ReviseModal rfq={reviseTarget.rfq} quote={reviseTarget.quote} onClose={() => setReviseTarget(null)} onSubmitted={() => { setReviseTarget(null); fetchRFQs(true); showToast('Revised quote submitted'); }} />}
        </div>
    );
};

// ─── Create RFQ Modal ─────────────────────────────────────────
const CreateRFQModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [productId, setProductId] = useState('');
    const [deliveryPointId, setDeliveryPointId] = useState('');
    const [quantityMt, setQuantityMt] = useState(500);
    const [targetPrice, setTargetPrice] = useState<number | ''>('');
    const [availabilityWindow, setAvailabilityWindow] = useState(SPOT_WINDOW);
    const availabilityOptions = getAvailabilityWindowOptions();
    const [expiresInHours, setExpiresInHours] = useState(72);
    const [isAnonymous, setIsAnonymous] = useState(true);

    useEffect(() => {
        Promise.all([
            api.catalog.products().catch(() => [] as Product[]),
            api.catalog.deliveryPoints().catch(() => [] as DeliveryPoint[]),
        ]).then(([prods, dps]) => {
            const active = prods.filter(p => p.is_active);
            setProducts(active);
            setDeliveryPoints(dps.filter(d => d.is_active));
            if (active.length > 0) setProductId(active[0].id);
            setCatalogLoading(false);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || quantityMt <= 0) return;
        setSubmitting(true); setError('');
        try {
            await api.rfq.create({ product_id: productId, delivery_point_id: deliveryPointId || undefined, quantity_mt: quantityMt, target_price_per_mt: targetPrice || undefined, availability_window: availabilityWindow, is_anonymous: isAnonymous, expires_in_hours: expiresInHours });
            onCreated();
        } catch (err: any) { setError(err?.message || 'Failed to create RFQ'); }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-['Montserrat'] font-bold text-slate-700 dark:text-white">Create RFQ</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {catalogLoading ? (
                        <div className="flex items-center justify-center py-8 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" />Loading catalog...</div>
                    ) : (<>
                        <div><label className="v-label">Product</label><VerdaxisSelect ariaLabel="RFQ product" value={productId} onChange={setProductId} options={products.map(p => ({ value: p.id, label: p.name, description: p.fuel_type }))} /></div>
                        <div><label className="v-label">Delivery Point (optional)</label><VerdaxisSelect ariaLabel="RFQ delivery point" value={deliveryPointId} onChange={setDeliveryPointId} options={[{ value: '', label: 'Any' }, ...deliveryPoints.map(d => ({ value: d.id, label: d.name, description: d.region }))]} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="v-label">Quantity (MT)</label><input type="number" min={1} value={quantityMt} onChange={e => setQuantityMt(Number(e.target.value))} className="v-input font-mono" /></div>
                            <div><label className="v-label">Target Price ($/MT)</label><input type="number" min={0} step={0.01} value={targetPrice} onChange={e => setTargetPrice(e.target.value ? Number(e.target.value) : '')} className="v-input font-mono" placeholder="Optional" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="v-label">Availability Window</label><VerdaxisSelect ariaLabel="RFQ availability window" value={availabilityWindow} onChange={setAvailabilityWindow} options={availabilityOptions.map(option => ({ value: option.value, label: option.label }))} /></div>
                            <div><label className="v-label">Expires In</label><VerdaxisSelect ariaLabel="RFQ expiry" value={String(expiresInHours)} onChange={(value) => setExpiresInHours(Number(value))} options={[{ value: '24', label: '24 hours' }, { value: '48', label: '48 hours' }, { value: '72', label: '72 hours' }, { value: '168', label: '1 week' }]} /></div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                            <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1"><EyeOff size={14} /> Anonymous RFQ</span>
                        </label>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <button type="submit" disabled={submitting || !productId} className="w-full v-btn-primary disabled:opacity-50">{submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}Create RFQ</button>
                    </>)}
                </form>
            </div>
        </div>
    );
};

// ─── Submit Quote Modal ───────────────────────────────────────
const SubmitQuoteModal: React.FC<{ rfq: RFQ; onClose: () => void; onSubmitted: () => void }> = ({ rfq, onClose, onSubmitted }) => {
    const [price, setPrice] = useState<number>(rfq.target_price_per_mt ? Number(rfq.target_price_per_mt) + 50 : 0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (price <= 0) return;
        setSubmitting(true); setError('');
        try { await api.rfq.quote(rfq.id, { price_per_mt_usd: price }); onSubmitted(); }
        catch (err: any) { setError(err?.message || 'Failed to submit quote'); }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-['Montserrat'] font-bold text-slate-700 dark:text-white">Submit Quote</h3>
                        <p className="text-xs text-slate-500">{rfq.product_name || rfq.product_id} · {rfq.quantity_mt.toLocaleString()} MT</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {rfq.target_price_per_mt && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
                            Buyer's target: <span className="font-mono font-bold">${Number(rfq.target_price_per_mt).toLocaleString()}/MT</span>
                        </div>
                    )}
                    <div><label className="v-label">Your Ask Price ($/MT)</label><input type="number" min={0.01} step={0.01} value={price} onChange={e => setPrice(Number(e.target.value))} className="v-input font-mono" required /></div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button type="submit" disabled={submitting || price <= 0} className="w-full v-btn-primary disabled:opacity-50">{submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={16} className="mr-2" />}Submit Quote</button>
                </form>
            </div>
        </div>
    );
};

// ─── Counter Modal (buyer raises their bid) ───────────────────
const CounterModal: React.FC<{ rfq: RFQ; quote: RFQQuote; onClose: () => void; onSubmitted: () => void }> = ({ rfq, quote, onClose, onSubmitted }) => {
    const currentTarget = rfq.target_price_per_mt ? Number(rfq.target_price_per_mt) : 0;
    const quotePrice = Number(quote.price_per_mt_usd);
    const defaultCounter = currentTarget > 0 ? Math.round((currentTarget + quotePrice) / 2 * 100) / 100 : Math.round(quotePrice * 0.97 * 100) / 100;

    const [counterPrice, setCounterPrice] = useState<number>(defaultCounter);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isValid = counterPrice > currentTarget && counterPrice < quotePrice;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        setSubmitting(true); setError('');
        try { await api.rfq.counter(rfq.id, quote.id, { counter_price_per_mt: counterPrice }); onSubmitted(); }
        catch (err: any) { setError(err?.message || 'Failed to send counter-offer'); }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-['Montserrat'] font-bold text-slate-700 dark:text-white">Counter Offer</h3>
                        <p className="text-xs text-slate-500">{rfq.product_name || rfq.product_id} · {rfq.quantity_mt.toLocaleString()} MT</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="flex-1 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900 text-center">
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase mb-0.5">Your target</p>
                            <p className="font-mono font-bold text-emerald-700 dark:text-emerald-300">${currentTarget > 0 ? currentTarget.toLocaleString() : '—'}/MT</p>
                        </div>
                        <ArrowLeftRight size={14} className="text-slate-400 flex-shrink-0" />
                        <div className="flex-1 p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900 text-center">
                            <p className="text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase mb-0.5">Supplier ask</p>
                            <p className="font-mono font-bold text-blue-700 dark:text-blue-300">${quotePrice.toLocaleString()}/MT</p>
                        </div>
                    </div>
                    <div>
                        <label className="v-label">Your Counter ($/MT)</label>
                        <input type="number" min={currentTarget + 0.01} max={quotePrice - 0.01} step={0.01} value={counterPrice} onChange={e => setCounterPrice(Number(e.target.value))} className="v-input font-mono" required />
                        <p className="text-[11px] text-slate-400 mt-1">Must be between ${(currentTarget + 0.01).toFixed(2)} and ${(quotePrice - 0.01).toFixed(2)}</p>
                        {!isValid && counterPrice > 0 && <p className="text-[11px] text-amber-600 mt-1">{counterPrice <= currentTarget ? 'Must be above your current target' : 'Must be below the supplier\'s ask'}</p>}
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button type="submit" disabled={submitting || !isValid} className="w-full v-btn-primary disabled:opacity-50">{submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <ArrowLeftRight size={16} className="mr-2" />}Send Counter</button>
                </form>
            </div>
        </div>
    );
};

// ─── Revise Modal (seller lowers their ask) ───────────────────
const ReviseModal: React.FC<{ rfq: RFQ; quote: RFQQuote; onClose: () => void; onSubmitted: () => void }> = ({ rfq, quote, onClose, onSubmitted }) => {
    const buyerTarget = rfq.target_price_per_mt ? Number(rfq.target_price_per_mt) : 0;
    const currentPrice = Number(quote.price_per_mt_usd);
    const defaultRevise = buyerTarget > 0 ? Math.round((buyerTarget + currentPrice) / 2 * 100) / 100 : Math.round(currentPrice * 0.98 * 100) / 100;

    const [revisedPrice, setRevisedPrice] = useState<number>(defaultRevise);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isValid = revisedPrice >= buyerTarget && revisedPrice < currentPrice;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        setSubmitting(true); setError('');
        try { await api.rfq.revise(rfq.id, quote.id, { price_per_mt_usd: revisedPrice }); onSubmitted(); }
        catch (err: any) { setError(err?.message || 'Failed to revise quote'); }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-['Montserrat'] font-bold text-slate-700 dark:text-white">Counter Offer</h3>
                        <p className="text-xs text-slate-500">{rfq.product_name || rfq.product_id} · {rfq.quantity_mt.toLocaleString()} MT</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="flex-1 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900 text-center">
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase mb-0.5">Buyer wants</p>
                            <p className="font-mono font-bold text-emerald-700 dark:text-emerald-300">${buyerTarget > 0 ? buyerTarget.toLocaleString() : '—'}/MT</p>
                        </div>
                        <ArrowLeftRight size={14} className="text-slate-400 flex-shrink-0" />
                        <div className="flex-1 p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900 text-center">
                            <p className="text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase mb-0.5">Your current ask</p>
                            <p className="font-mono font-bold text-blue-700 dark:text-blue-300">${currentPrice.toLocaleString()}/MT</p>
                        </div>
                    </div>
                    <div>
                        <label className="v-label">Your Counter ($/MT)</label>
                        <input type="number" min={buyerTarget} max={currentPrice - 0.01} step={0.01} value={revisedPrice} onChange={e => setRevisedPrice(Number(e.target.value))} className="v-input font-mono" required />
                        <p className="text-[11px] text-slate-400 mt-1">Must be between ${buyerTarget.toFixed(2)} and ${(currentPrice - 0.01).toFixed(2)}</p>
                        {!isValid && revisedPrice > 0 && <p className="text-[11px] text-amber-600 mt-1">{revisedPrice < buyerTarget ? `Can't go below buyer's target` : 'Must be lower than your current ask'}</p>}
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button type="submit" disabled={submitting || !isValid} className="w-full v-btn-primary disabled:opacity-50">{submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <ArrowLeftRight size={16} className="mr-2" />}Send Counter</button>
                </form>
            </div>
        </div>
    );
};
