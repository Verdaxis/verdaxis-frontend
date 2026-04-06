import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Plus, Loader2, X, ChevronDown, ChevronUp, Check, Ban,
    MessageSquare, Clock, Send, EyeOff, AlertCircle, ArrowLeftRight, XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { API_URL } from '../services/config';
import type { RFQ, RFQQuote, Product, DeliveryPoint } from '../types';

// ─── Status badge config ──────────────────────────────────────
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
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

interface RFQPanelProps {
    role: 'BUYER' | 'SUPPLIER';
}

export const RFQPanel: React.FC<RFQPanelProps> = ({ role }) => {
    const { user } = useAuth();
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [quoteTarget, setQuoteTarget] = useState<RFQ | null>(null);
    const [counterTarget, setCounterTarget] = useState<{ rfq: RFQ; quote: RFQQuote } | null>(null);

    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sseRef = useRef<EventSource | null>(null);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 4000);
    }, []);

    const fetchRFQs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await api.rfq.list({ limit: 50 });
            const items: RFQ[] = data.items ?? data;
            setRfqs(items);
        } catch (err: any) {
            if (!silent) setError(err?.message || 'Failed to load RFQs');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRFQs(); }, [fetchRFQs]);

    // 30s polling fallback
    useEffect(() => {
        const iv = setInterval(() => fetchRFQs(true), 30_000);
        return () => clearInterval(iv);
    }, [fetchRFQs]);

    // SSE: real-time updates for new quotes / counters
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const url = `${API_URL}/stream/activity?token=${encodeURIComponent(token)}`;
        const source = new EventSource(url);
        sseRef.current = source;

        const onQuoteReceived = (e: MessageEvent) => {
            fetchRFQs(true);
            showToast('New quote received on your RFQ');
        };
        const onCountered = (e: MessageEvent) => {
            fetchRFQs(true);
            showToast('Buyer sent a counter-offer on your quote');
        };

        source.addEventListener('rfq_quote_received', onQuoteReceived);
        source.addEventListener('rfq_countered', onCountered);

        return () => {
            source.removeEventListener('rfq_quote_received', onQuoteReceived);
            source.removeEventListener('rfq_countered', onCountered);
            source.close();
            sseRef.current = null;
        };
    }, [fetchRFQs, showToast]);

    useEffect(() => () => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    }, []);

    const handleCancel = async (rfqId: string) => {
        setActionLoading(rfqId);
        try {
            await api.rfq.cancel(rfqId);
            await fetchRFQs(true);
        } catch (err) { console.error('Action failed:', err); }
        setActionLoading(null);
    };

    const handleAcceptQuote = async (rfqId: string, quoteId: string) => {
        setActionLoading(quoteId);
        try {
            await api.rfq.accept(rfqId, quoteId);
            await fetchRFQs(true);
        } catch (err) { console.error('Action failed:', err); }
        setActionLoading(null);
    };

    const handleDeclineQuote = async (rfqId: string, quoteId: string) => {
        setActionLoading(quoteId);
        try {
            await api.rfq.decline(rfqId, quoteId);
            await fetchRFQs(true);
        } catch (err) { console.error('Action failed:', err); }
        setActionLoading(null);
    };

    if (loading) {
        return (
            <div className="v-card p-6 flex items-center justify-center gap-3 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-medium">Loading RFQs...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="v-card p-4 text-center text-sm text-red-500 dark:text-red-400">
                <AlertCircle size={16} className="inline mr-1" />{error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toast notification */}
            {toast && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                    <MessageSquare size={14} />
                    {toast}
                    <button onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100"><X size={14} /></button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                        Request for Quotes
                    </h3>
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                        {rfqs.length}
                    </span>
                </div>
                {role === 'BUYER' && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                        <Plus size={14} />
                        Create RFQ
                    </button>
                )}
            </div>

            {/* RFQ List */}
            {rfqs.length === 0 ? (
                <div className="v-card p-8 text-center">
                    <MessageSquare size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500">
                        {role === 'BUYER'
                            ? 'No RFQs yet. Create one to request quotes from suppliers.'
                            : 'No open RFQs available right now.'}
                    </p>
                </div>
            ) : (
                rfqs.map(rfq => {
                    const isExpanded = expandedId === rfq.id;
                    const statusStyle = RFQ_STATUS_STYLES[rfq.status] ?? RFQ_STATUS_STYLES.OPEN;
                    const isOwn = rfq.buyer_org_id === user?.organization_id;

                    return (
                        <div key={rfq.id} className="v-card overflow-hidden">
                            {/* RFQ header row */}
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : rfq.id)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="text-left min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                                {rfq.product_name || rfq.product_id}
                                            </span>
                                            {rfq.is_anonymous && (
                                                <EyeOff size={12} className="text-slate-400 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                            <span>{rfq.quantity_mt.toLocaleString()} MT</span>
                                            {rfq.target_price_per_mt && (
                                                <>
                                                    <span className="text-slate-300">|</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                                                        Target ${rfq.target_price_per_mt.toLocaleString()}/MT
                                                    </span>
                                                </>
                                            )}
                                            <span className="text-slate-300">|</span>
                                            <span>{rfq.availability_window}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    {rfq.quote_count > 0 && (
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                                            {rfq.quote_count} quote{rfq.quote_count !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyle.bg} ${statusStyle.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                        {rfq.status}
                                    </span>
                                    <Clock size={12} className="text-slate-400" />
                                    <span className="text-[10px] text-slate-400">{relativeTime(rfq.created_at)}</span>
                                    {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                </div>
                            </button>

                            {/* Expanded details */}
                            {isExpanded && (
                                <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                                    {/* Details */}
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                                        {rfq.delivery_point_name && (
                                            <div><span className="text-slate-400">Delivery:</span> <span className="text-slate-700 dark:text-slate-200 font-medium">{rfq.delivery_point_name}</span></div>
                                        )}
                                        <div><span className="text-slate-400">Expires:</span> <span className="text-slate-700 dark:text-slate-200 font-medium">{new Date(rfq.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</span></div>
                                        {!rfq.is_anonymous && rfq.buyer_org_name && (
                                            <div><span className="text-slate-400">Buyer:</span> <span className="text-slate-700 dark:text-slate-200 font-medium">{rfq.buyer_org_name}</span></div>
                                        )}
                                    </div>

                                    {/* Quotes section */}
                                    {rfq.quotes && rfq.quotes.length > 0 && (
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quotes</span>
                                            {rfq.quotes.map(q => {
                                                const qStyle = QUOTE_STATUS_STYLES[q.status] ?? QUOTE_STATUS_STYLES.PENDING;
                                                const canAct = isOwn && q.status === 'PENDING' && rfq.status !== 'CANCELLED';
                                                return (
                                                    <div key={q.id} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                                    ${q.price_per_mt_usd.toLocaleString()}/MT
                                                                </span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${qStyle.bg} ${qStyle.text}`}>
                                                                    {q.status}
                                                                </span>
                                                            </div>
                                                            {q.seller_org_name && (
                                                                <span className="text-[10px] text-slate-400">from {q.seller_org_name}</span>
                                                            )}
                                                        </div>
                                                        {canAct && (
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                {/* Accept */}
                                                                <button
                                                                    onClick={() => handleAcceptQuote(rfq.id, q.id)}
                                                                    disabled={!!actionLoading}
                                                                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-bold rounded-md transition-colors disabled:opacity-50"
                                                                >
                                                                    {actionLoading === q.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                                                    Accept
                                                                </button>
                                                                {/* Counter */}
                                                                <button
                                                                    onClick={() => setCounterTarget({ rfq, quote: q })}
                                                                    disabled={!!actionLoading}
                                                                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-bold rounded-md transition-colors disabled:opacity-50"
                                                                >
                                                                    <ArrowLeftRight size={10} />
                                                                    Counter
                                                                </button>
                                                                {/* Decline */}
                                                                <button
                                                                    onClick={() => handleDeclineQuote(rfq.id, q.id)}
                                                                    disabled={!!actionLoading}
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-red-500 hover:text-red-400 border border-red-200 dark:border-red-800 rounded-md transition-colors disabled:opacity-50"
                                                                >
                                                                    <XCircle size={10} />
                                                                    Decline
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-1">
                                        {isOwn && (rfq.status === 'OPEN' || rfq.status === 'QUOTED') && (
                                            <button
                                                onClick={() => handleCancel(rfq.id)}
                                                disabled={actionLoading === rfq.id}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:text-red-400 border border-red-200 dark:border-red-800 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading === rfq.id ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                                                Cancel RFQ
                                            </button>
                                        )}
                                        {!isOwn && (rfq.status === 'OPEN' || rfq.status === 'QUOTED') && role === 'SUPPLIER' && (
                                            <button
                                                onClick={() => setQuoteTarget(rfq)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors"
                                            >
                                                <Send size={12} />
                                                Submit Quote
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {/* Create RFQ Modal */}
            {showCreateModal && <CreateRFQModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); fetchRFQs(true); }} />}

            {/* Submit Quote Modal */}
            {quoteTarget && <SubmitQuoteModal rfq={quoteTarget} onClose={() => setQuoteTarget(null)} onSubmitted={() => { setQuoteTarget(null); fetchRFQs(true); }} />}

            {/* Counter Modal */}
            {counterTarget && (
                <CounterModal
                    rfq={counterTarget.rfq}
                    quote={counterTarget.quote}
                    onClose={() => setCounterTarget(null)}
                    onSubmitted={() => { setCounterTarget(null); fetchRFQs(true); showToast('Counter-offer sent'); }}
                />
            )}
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
    const [availabilityWindow, setAvailabilityWindow] = useState('Spot');
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [expiresInHours, setExpiresInHours] = useState(72);

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
        setSubmitting(true);
        setError('');
        try {
            await api.rfq.create({
                product_id: productId,
                delivery_point_id: deliveryPointId || undefined,
                quantity_mt: quantityMt,
                target_price_per_mt: targetPrice || undefined,
                availability_window: availabilityWindow,
                is_anonymous: isAnonymous,
                expires_in_hours: expiresInHours,
            });
            onCreated();
        } catch (err: any) {
            setError(err?.message || 'Failed to create RFQ');
        }
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
                    ) : (
                        <>
                            <div>
                                <label className="v-label">Product</label>
                                <select value={productId} onChange={e => setProductId(e.target.value)} className="v-input">
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.fuel_type})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="v-label">Delivery Point (optional)</label>
                                <select value={deliveryPointId} onChange={e => setDeliveryPointId(e.target.value)} className="v-input">
                                    <option value="">Any</option>
                                    {deliveryPoints.map(d => <option key={d.id} value={d.id}>{d.name} ({d.region})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="v-label">Quantity (MT)</label>
                                    <input type="number" min={1} value={quantityMt} onChange={e => setQuantityMt(Number(e.target.value))} className="v-input font-mono" />
                                </div>
                                <div>
                                    <label className="v-label">Target Price ($/MT)</label>
                                    <input type="number" min={0} step={0.01} value={targetPrice} onChange={e => setTargetPrice(e.target.value ? Number(e.target.value) : '')} className="v-input font-mono" placeholder="Optional" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="v-label">Availability Window</label>
                                    <select value={availabilityWindow} onChange={e => setAvailabilityWindow(e.target.value)} className="v-input">
                                        {['Spot', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Forward 2027', 'Forward 2028'].map(w => <option key={w} value={w}>{w}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="v-label">Expires In</label>
                                    <select value={expiresInHours} onChange={e => setExpiresInHours(Number(e.target.value))} className="v-input">
                                        <option value={24}>24 hours</option>
                                        <option value={48}>48 hours</option>
                                        <option value={72}>72 hours</option>
                                        <option value={168}>1 week</option>
                                    </select>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1"><EyeOff size={14} /> Anonymous RFQ</span>
                            </label>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <button type="submit" disabled={submitting || !productId} className="w-full v-btn-primary disabled:opacity-50">
                                {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                                Create RFQ
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

// ─── Submit Quote Modal ───────────────────────────────────────
const SubmitQuoteModal: React.FC<{ rfq: RFQ; onClose: () => void; onSubmitted: () => void }> = ({ rfq, onClose, onSubmitted }) => {
    const [price, setPrice] = useState<number>(rfq.target_price_per_mt ?? 0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (price <= 0) return;
        setSubmitting(true);
        setError('');
        try {
            await api.rfq.quote(rfq.id, { price_per_mt_usd: price });
            onSubmitted();
        } catch (err: any) {
            setError(err?.message || 'Failed to submit quote');
        }
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
                            Buyer's target price: <span className="font-mono font-bold">${rfq.target_price_per_mt.toLocaleString()}/MT</span>
                        </div>
                    )}
                    <div>
                        <label className="v-label">Your Price ($/MT)</label>
                        <input type="number" min={0.01} step={0.01} value={price} onChange={e => setPrice(Number(e.target.value))} className="v-input font-mono" required />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button type="submit" disabled={submitting || price <= 0} className="w-full v-btn-primary disabled:opacity-50">
                        {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={16} className="mr-2" />}
                        Submit Quote
                    </button>
                </form>
            </div>
        </div>
    );
};

// ─── Counter Modal ────────────────────────────────────────────
const CounterModal: React.FC<{ rfq: RFQ; quote: RFQQuote; onClose: () => void; onSubmitted: () => void }> = ({ rfq, quote, onClose, onSubmitted }) => {
    const [counterPrice, setCounterPrice] = useState<number>(rfq.target_price_per_mt ?? Math.round(Number(quote.price_per_mt_usd) * 0.97));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (counterPrice <= 0) return;
        setSubmitting(true);
        setError('');
        try {
            await api.rfq.counter(rfq.id, quote.id, { counter_price_per_mt: counterPrice });
            onSubmitted();
        } catch (err: any) {
            setError(err?.message || 'Failed to send counter-offer');
        }
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
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-600 text-xs">
                        <span className="text-slate-500">Supplier quoted:</span>{' '}
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">${Number(quote.price_per_mt_usd).toLocaleString()}/MT</span>
                    </div>
                    <div>
                        <label className="v-label">Your Counter Price ($/MT)</label>
                        <input
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={counterPrice}
                            onChange={e => setCounterPrice(Number(e.target.value))}
                            className="v-input font-mono"
                            required
                        />
                        <p className="text-[11px] text-slate-400 mt-1">This will update your RFQ target price and decline the current quote.</p>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button type="submit" disabled={submitting || counterPrice <= 0} className="w-full v-btn-primary disabled:opacity-50">
                        {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <ArrowLeftRight size={16} className="mr-2" />}
                        Send Counter Offer
                    </button>
                </form>
            </div>
        </div>
    );
};
