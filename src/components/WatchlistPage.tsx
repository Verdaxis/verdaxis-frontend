import React, { useState, useEffect, useCallback } from 'react';
import {
    Star, Plus, Trash2, Loader2, X, ChevronDown, ChevronUp,
    Eye, AlertCircle, Package,
} from 'lucide-react';
import { api } from '../services/api';
import type { Watchlist, WatchlistEntry, Product, DeliveryPoint } from '../types';

export const WatchlistPage: React.FC = () => {
    const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddEntryModal, setShowAddEntryModal] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchWatchlists = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await api.watchlists.list();
            const items: Watchlist[] = data.items ?? data;
            setWatchlists(Array.isArray(items) ? items : []);
        } catch (err: any) {
            if (!silent) setError(err?.message || 'Failed to load watchlists');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchWatchlists(); }, [fetchWatchlists]);

    const handleDeleteWatchlist = async (id: string) => {
        if (!confirm('Delete this watchlist?')) return;
        setActionLoading(id);
        try {
            await api.watchlists.delete(id);
            await fetchWatchlists(true);
        } catch { /* ignore */ }
        setActionLoading(null);
    };

    const handleRemoveEntry = async (watchlistId: string, entryId: string) => {
        setActionLoading(entryId);
        try {
            await api.watchlists.removeEntry(watchlistId, entryId);
            await fetchWatchlists(true);
        } catch { /* ignore */ }
        setActionLoading(null);
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-400">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="font-medium">Loading watchlists...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-4 lg:px-10 pt-4 lg:pt-8 pb-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl lg:text-3xl v-heading flex items-center gap-3">
                                <Star size={28} className="text-amber-500" />
                                Watchlists
                            </h1>
                            <p className="text-slate-500 mt-1 text-sm">Track products and delivery points you're interested in.</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            New Watchlist
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 lg:px-10 pb-6">
                <div className="max-w-4xl mx-auto space-y-4">
                    {error && (
                        <div className="v-card p-4 text-center text-sm text-red-500 dark:text-red-400">
                            <AlertCircle size={16} className="inline mr-1" />{error}
                        </div>
                    )}

                    {watchlists.length === 0 ? (
                        <div className="v-card p-12 text-center">
                            <Star size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">No watchlists yet</h3>
                            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                                Create your first watchlist to track products you're interested in.
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-lg transition-colors"
                            >
                                <Plus size={16} />
                                Create Watchlist
                            </button>
                        </div>
                    ) : (
                        watchlists.map(wl => {
                            const isExpanded = expandedId === wl.id;
                            return (
                                <div key={wl.id} className="v-card overflow-hidden">
                                    {/* Watchlist header */}
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : wl.id)}
                                            className="flex items-center gap-3 min-w-0 flex-1 text-left"
                                        >
                                            <Star size={18} className="text-amber-500 flex-shrink-0" fill="currentColor" />
                                            <div className="min-w-0">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate block">
                                                    {wl.name}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {wl.entries?.length ?? 0} item{(wl.entries?.length ?? 0) !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                        </button>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                            <button
                                                onClick={() => setShowAddEntryModal(wl.id)}
                                                className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                                title="Add entry"
                                            >
                                                <Plus size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteWatchlist(wl.id)}
                                                disabled={actionLoading === wl.id}
                                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                                                title="Delete watchlist"
                                            >
                                                {actionLoading === wl.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded entries */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-200 dark:border-slate-700">
                                            {(!wl.entries || wl.entries.length === 0) ? (
                                                <div className="px-4 py-6 text-center text-xs text-slate-400">
                                                    <Package size={20} className="mx-auto mb-2 text-slate-300" />
                                                    No entries yet. Add products to track.
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                    {wl.entries.map(entry => (
                                                        <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <Eye size={12} className="text-slate-400 flex-shrink-0" />
                                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                                                        {entry.product_name || entry.product_id}
                                                                    </span>
                                                                </div>
                                                                {entry.delivery_point_name && (
                                                                    <span className="text-[10px] text-slate-400 ml-5">{entry.delivery_point_name}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                                {entry.best_bid != null && (
                                                                    <div className="text-right">
                                                                        <span className="text-[9px] text-slate-400 uppercase block">Bid</span>
                                                                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                                            ${entry.best_bid.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {entry.best_ask != null && (
                                                                    <div className="text-right">
                                                                        <span className="text-[9px] text-slate-400 uppercase block">Ask</span>
                                                                        <span className="text-xs font-mono font-bold text-red-500 dark:text-red-400">
                                                                            ${entry.best_ask.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {entry.best_bid == null && entry.best_ask == null && (
                                                                    <span className="text-xs text-slate-400">No quotes</span>
                                                                )}
                                                                <button
                                                                    onClick={() => handleRemoveEntry(wl.id, entry.id)}
                                                                    disabled={actionLoading === entry.id}
                                                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                                                                >
                                                                    {actionLoading === entry.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Create Watchlist Modal */}
            {showCreateModal && (
                <CreateWatchlistModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { setShowCreateModal(false); fetchWatchlists(true); }}
                />
            )}

            {/* Add Entry Modal */}
            {showAddEntryModal && (
                <AddEntryModal
                    watchlistId={showAddEntryModal}
                    onClose={() => setShowAddEntryModal(null)}
                    onAdded={() => { setShowAddEntryModal(null); fetchWatchlists(true); }}
                />
            )}
        </div>
    );
};

// ─── Create Watchlist Modal ───────────────────────────────────
const CreateWatchlistModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        setError('');
        try {
            await api.watchlists.create(name.trim());
            onCreated();
        } catch (err: any) {
            setError(err?.message || 'Failed to create watchlist');
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-['Montserrat'] font-bold text-slate-700 dark:text-white">New Watchlist</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="v-label">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="v-input"
                            placeholder="e.g. Green Methanol Watch"
                            autoFocus
                            maxLength={100}
                        />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button type="submit" disabled={submitting || !name.trim()} className="w-full v-btn-primary disabled:opacity-50">
                        {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                        Create
                    </button>
                </form>
            </div>
        </div>
    );
};

// ─── Add Entry Modal ──────────────────────────────────────────
const AddEntryModal: React.FC<{ watchlistId: string; onClose: () => void; onAdded: () => void }> = ({ watchlistId, onClose, onAdded }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [productId, setProductId] = useState('');
    const [deliveryPointId, setDeliveryPointId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

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
        if (!productId) return;
        setSubmitting(true);
        setError('');
        try {
            await api.watchlists.addEntry(watchlistId, {
                product_id: productId,
                delivery_point_id: deliveryPointId || undefined,
            });
            onAdded();
        } catch (err: any) {
            setError(err?.message || 'Failed to add entry');
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-['Montserrat'] font-bold text-slate-700 dark:text-white">Add to Watchlist</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {catalogLoading ? (
                        <div className="flex items-center justify-center py-6 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" />Loading catalog...</div>
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
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <button type="submit" disabled={submitting || !productId} className="w-full v-btn-primary disabled:opacity-50">
                                {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                                Add Entry
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};
