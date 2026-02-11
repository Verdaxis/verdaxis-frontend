import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    TrendingUp,
    Package,
    FileText,
    Shield,
    X,
    BarChart3
} from 'lucide-react';
import { CreateListingModal, ListingFormData } from './supplier/CreateListingModal';
import { api } from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';

import { OrderBookOrder, OrderBookStatus, AggregatedOrderbook } from '../types';

export interface AggregatedMarketEntry {
    region: string;
    fuel_type: string;
    side?: string;
    min_price: number;
    max_price: number;
    avg_price: number;
    total_quantity: number;
    listing_count: number;
    order_count?: number;
}

type SupplierListing = OrderBookOrder;

export const SupplierListingConsole: React.FC = () => {
    const [listings, setListings] = useState<SupplierListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [marketData, setMarketData] = useState<AggregatedMarketEntry[]>([]);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'DELETE' | 'ERROR' | 'SUCCESS' | null;
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

    const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

    // Edit modal state
    const [editingListing, setEditingListing] = useState<SupplierListing | null>(null);
    const [editForm, setEditForm] = useState<{
        quantity_mt: number;
        price_per_mt_usd: number;
        availability_window: string;
        certifications: string[];
        status: OrderBookStatus;
    }>({
        quantity_mt: 0,
        price_per_mt_usd: 0,
        availability_window: '',
        certifications: [],
        status: 'OPEN',
    });
    const [isUpdating, setIsUpdating] = useState(false);

    // Fetch Listings & Market Data
    useEffect(() => {
        fetchListings();
        fetchMarketData();
    }, []);

    const fetchListings = async () => {
        try {
            setIsLoading(true);
            const data = await api.orderbook.myOrders();
            // Filter to only show ASK orders (supplier listings)
            const askOrders = data.filter((o: OrderBookOrder) => o.side === 'ASK');
            setListings(askOrders);
        } catch (error) {
            console.error("Failed to fetch listings:", error);
            // Fallback to empty or handled error state
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMarketData = async () => {
        try {
            const data = await api.orderbook.aggregated();
            setMarketData(data);
        } catch (error) {
            console.error("Failed to fetch market data:", error);
        }
    };

    // Stats
    const totalVolume = listings.reduce((sum, l) => sum + (l.quantity_mt || 0), 0);
    const activeListings = listings.filter(l => l.status === 'OPEN').length;
    const totalMatches = listings.reduce((sum, l) => sum + (l.trade_count || 0), 0);

    const handleCreateListing = async (data: ListingFormData) => {
        setIsSubmitting(true);
        try {
            await api.orderbook.create({ side: 'ASK', ...data });
            await fetchListings(); // Refresh list
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error("Failed to create listing:", error);
            setConfirmState({
                isOpen: true,
                type: 'ERROR',
                title: 'Creation Failed',
                message: 'Failed to create listing. Please try again.',
                variant: 'danger'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleListingStatus = async (id: string, currentStatus: string) => {
        if (currentStatus === 'OPEN') {
            // Cancel the order (OPEN -> CANCELLED)
            const newStatus = 'CANCELLED' as OrderBookStatus;
            setListings(prev => prev.map(l =>
                l.id === id ? { ...l, status: newStatus } : l
            ));
            try {
                await api.orderbook.cancel(id);
            } catch (error) {
                setListings(prev => prev.map(l =>
                    l.id === id ? { ...l, status: currentStatus as OrderBookStatus } : l
                ));
                setConfirmState({
                    isOpen: true,
                    type: 'ERROR',
                    title: 'Update Failed',
                    message: error instanceof Error ? error.message : 'Failed to update listing status. Please try again.',
                    variant: 'danger'
                });
            }
        } else {
            // Re-activate by updating status to OPEN
            const newStatus = 'OPEN' as OrderBookStatus;
            setListings(prev => prev.map(l =>
                l.id === id ? { ...l, status: newStatus } : l
            ));
            try {
                await api.orderbook.update(id, { status: newStatus });
            } catch (error) {
                setListings(prev => prev.map(l =>
                    l.id === id ? { ...l, status: currentStatus as OrderBookStatus } : l
                ));
                setConfirmState({
                    isOpen: true,
                    type: 'ERROR',
                    title: 'Update Failed',
                    message: error instanceof Error ? error.message : 'Failed to update listing status. Please try again.',
                    variant: 'danger'
                });
            }
        }
    };

    const deleteListing = (id: string) => {
        setConfirmState({
            isOpen: true,
            type: 'DELETE',
            title: 'Delete Listing',
            message: 'Are you sure you want to delete this listing?',
            id,
            variant: 'danger'
        });
    };

    const handleConfirmAction = async () => {
        if (confirmState.type === 'DELETE' && confirmState.id) {
            try {
                setIsLoading(true);
                await api.orderbook.cancel(confirmState.id);
                setListings(prev => prev.filter(l => l.id !== confirmState.id));
                closeConfirm();
                // Optional: show success message
            } catch (error) {
                console.error("Failed to delete listing:", error);
                setConfirmState({
                    isOpen: true,
                    type: 'ERROR',
                    title: 'Delete Failed',
                    message: error instanceof Error ? error.message : 'Failed to delete listing. Please try again.',
                    variant: 'danger'
                });
            } finally {
                setIsLoading(false);
            }
        } else {
            closeConfirm();
        }
    };

    const openEditModal = (listing: SupplierListing) => {
        setEditingListing(listing);
        setEditForm({
            quantity_mt: listing.quantity_mt,
            price_per_mt_usd: listing.price_per_mt_usd,
            availability_window: listing.availability_window,
            certifications: [...(listing.certifications || [])],
            status: listing.status,
        });
    };

    const closeEditModal = () => {
        setEditingListing(null);
        setIsUpdating(false);
    };

    const handleEditFormChange = (field: string, value: string | number | string[]) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingListing) return;
        if (editForm.quantity_mt <= 0 || editForm.price_per_mt_usd <= 0) return;

        setIsUpdating(true);
        try {
            await api.orderbook.update(editingListing.id, {
                quantity_mt: editForm.quantity_mt,
                price_per_mt_usd: editForm.price_per_mt_usd,
                availability_window: editForm.availability_window,
                certifications: editForm.certifications,
                status: editForm.status,
            });
            await fetchListings();
            closeEditModal();
        } catch (error) {
            console.error("Failed to update listing:", error);
            setConfirmState({
                isOpen: true,
                type: 'ERROR',
                title: 'Update Failed',
                message: error instanceof Error ? error.message : 'Failed to update listing. Please try again.',
                variant: 'danger',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCertificationInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const value = (e.target as HTMLInputElement).value.trim().replace(/,$/, '');
            if (value && !editForm.certifications.includes(value)) {
                handleEditFormChange('certifications', [...editForm.certifications, value]);
            }
            (e.target as HTMLInputElement).value = '';
        }
    };

    const removeEditCertification = (index: number) => {
        handleEditFormChange(
            'certifications',
            editForm.certifications.filter((_, i) => i !== index)
        );
    };

    // ---- Market Context Panel ----
    const MarketContextPanel: React.FC<{
        region: string;
        fuelType: string;
        price: number;
    }> = ({ region, fuelType, price }) => {
        const entry = marketData.find(
            (d) => d.region === region && d.fuel_type === fuelType
        );

        if (!entry) {
            return (
                <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-600/50 bg-slate-50 dark:bg-slate-700/30 p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <BarChart3 size={14} />
                        <span>No market data available for this combination</span>
                    </div>
                </div>
            );
        }

        const { min_price, max_price, avg_price, total_quantity, listing_count } = entry;
        const range = max_price - min_price;

        // Competitiveness indicator
        let competitiveLabel = '';
        let competitiveColor = '';
        let indicatorBg = '';

        if (price > 0 && avg_price > 0) {
            const pctDiff = ((price - avg_price) / avg_price) * 100;
            if (pctDiff <= -3) {
                competitiveLabel = `Your price is ${Math.abs(pctDiff).toFixed(1)}% below market average`;
                competitiveColor = 'text-emerald-600 dark:text-emerald-400';
                indicatorBg = 'bg-emerald-500';
            } else if (pctDiff <= 3) {
                competitiveLabel = 'Your price is competitive';
                competitiveColor = 'text-emerald-600 dark:text-emerald-400';
                indicatorBg = 'bg-emerald-500';
            } else if (pctDiff <= 10) {
                competitiveLabel = `Your price is ${pctDiff.toFixed(1)}% above market average`;
                competitiveColor = 'text-amber-600 dark:text-amber-400';
                indicatorBg = 'bg-amber-500';
            } else {
                competitiveLabel = `Your price is ${pctDiff.toFixed(1)}% above market average`;
                competitiveColor = 'text-rose-600 dark:text-rose-400';
                indicatorBg = 'bg-rose-500';
            }
        }

        // Position of price marker on the range bar (clamped 0-100%)
        const markerPct = price > 0 && range > 0
            ? Math.min(100, Math.max(0, ((price - min_price) / range) * 100))
            : -1;

        return (
            <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-600/50 bg-slate-50 dark:bg-emerald-900/20 p-3 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    <BarChart3 size={14} className="text-emerald-500 dark:text-emerald-400" />
                    Market Context
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Price range:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                            ${min_price.toLocaleString()} - ${max_price.toLocaleString()} /MT
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Avg price:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                            ${avg_price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} /MT
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Active listings:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {listing_count} listing{listing_count !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Total available:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                            {total_quantity.toLocaleString()} MT
                        </span>
                    </div>
                </div>

                {/* Price position bar */}
                {price > 0 && range > 0 && (
                    <div className="pt-1">
                        <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 dark:from-emerald-500 dark:via-amber-500 dark:to-rose-500 overflow-visible">
                            {markerPct >= 0 && (
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 shadow-md"
                                    style={{
                                        left: `${markerPct}%`,
                                        backgroundColor: markerPct <= 40 ? '#10b981' : markerPct <= 70 ? '#f59e0b' : '#f43f5e',
                                    }}
                                />
                            )}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                            <span>${min_price}</span>
                            <span>${max_price}</span>
                        </div>
                    </div>
                )}

                {/* Competitiveness label */}
                {price > 0 && competitiveLabel && (
                    <div className={`text-xs font-semibold ${competitiveColor}`}>
                        {competitiveLabel}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            Listing Console
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Manage your fuel listings and track incoming orders.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-900 font-bold rounded-lg transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        Create Listing
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm dark:shadow-none">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                            <FileText className="text-emerald-500 dark:text-emerald-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-200">
                                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : listings.length}
                            </div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Total Listings</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm dark:shadow-none">
                        <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                            <Eye className="text-blue-500 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-200">
                                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : activeListings}
                            </div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Active</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm dark:shadow-none">
                        <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                            <Package className="text-amber-500 dark:text-amber-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-200">
                                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : `${totalVolume.toLocaleString()} MT`}
                            </div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Total Volume</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm dark:shadow-none">
                        <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                            <TrendingUp className="text-purple-500 dark:text-purple-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-200">
                                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : totalMatches}
                            </div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Order Matches</div>
                        </div>
                    </div>
                </div>

                {/* Listings Table */}
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                    {isLoading ? (
                        <div className="p-12 flex justify-center items-center text-slate-500 dark:text-slate-400">
                            <Loader2 className="animate-spin mr-2" />
                            <span>Loading listings...</span>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 font-bold bg-slate-50 dark:bg-slate-800/50">
                                            <th className="px-6 py-4 text-left">Fuel / Region</th>
                                            <th className="px-6 py-4 text-left">Availability</th>
                                            <th className="px-6 py-4 text-right">Quantity</th>
                                            <th className="px-6 py-4 text-right">Price</th>
                                            <th className="px-6 py-4 text-center">Certifications</th>
                                            <th className="px-6 py-4 text-center">Order Matches</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                        {listings.map(listing => (
                                            <tr key={listing.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 dark:text-slate-200">
                                                        {listing.fuel_type} ({listing.fuel_grade})
                                                    </div>
                                                    <div className="text-sm text-slate-500">{listing.region}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{listing.availability_window}</td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-200">
                                                    {listing.quantity_mt.toLocaleString()} MT
                                                    {listing.remaining_quantity_mt !== undefined && listing.remaining_quantity_mt !== listing.quantity_mt && (
                                                        <div className="text-xs text-slate-400">({listing.remaining_quantity_mt.toLocaleString()} remaining)</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">${listing.price_per_mt_usd}</span>
                                                    <span className="text-slate-500">/MT</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                                        {listing.certifications?.map((cert, idx) => (
                                                            <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-transparent">
                                                                {cert}
                                                            </span>
                                                        ))}
                                                        {listing.is_verdaxis_verified && (
                                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 rounded text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                                                                <Shield size={10} />
                                                                Verified
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {(listing.trade_count || 0) > 0 ? (
                                                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-sm font-bold border border-purple-200 dark:border-purple-500/30">
                                                            {listing.trade_count}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                        listing.status === 'OPEN'
                                                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                                            : listing.status === 'PARTIALLY_FILLED'
                                                            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                                                            : 'bg-slate-100 dark:bg-slate-600/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-500/50'
                                                    }`}>
                                                        {listing.status === 'OPEN' ? 'Active' : listing.status === 'CANCELLED' ? 'Inactive' : listing.status === 'PARTIALLY_FILLED' ? 'Partial Fill' : listing.status === 'FILLED' ? 'Filled' : listing.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(listing)}
                                                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleListingStatus(listing.id, listing.status)}
                                                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                            title={listing.status === 'OPEN' ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {listing.status === 'OPEN' ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteListing(listing.id)}
                                                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {listings.length === 0 && (
                                <div className="p-12 text-center text-slate-500">
                                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">No listings yet</p>
                                    <p className="text-sm mt-1">Create your first listing to start receiving Direct Orders</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Create Listing Modal */}
            {isCreateModalOpen && (
                <CreateListingModal
                    onSubmit={handleCreateListing}
                    onCancel={() => setIsCreateModalOpen(false)}
                    isLoading={isSubmitting}
                    marketData={marketData}
                />
            )}

            {/* Edit Listing Modal */}
            {editingListing && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0 bg-slate-50 dark:bg-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">Edit Listing</h2>
                            <button
                                onClick={closeEditModal}
                                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleEditSave} className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
                            <div className="p-6 space-y-6">
                                {/* Read-only Fields */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Fuel Type</label>
                                        <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed">
                                            {editingListing.fuel_type} ({editingListing.fuel_grade})
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Region</label>
                                        <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed">
                                            {editingListing.region}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Status</label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => handleEditFormChange('status', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        >
                                            <option value="OPEN">Active</option>
                                            <option value="CANCELLED">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Editable Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Quantity (MT)</label>
                                        <input
                                            type="number"
                                            value={editForm.quantity_mt || ''}
                                            onChange={(e) => handleEditFormChange('quantity_mt', parseFloat(e.target.value) || 0)}
                                            placeholder="e.g., 5000"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Price ($/MT)</label>
                                        <input
                                            type="number"
                                            value={editForm.price_per_mt_usd || ''}
                                            onChange={(e) => handleEditFormChange('price_per_mt_usd', parseFloat(e.target.value) || 0)}
                                            placeholder="e.g., 520"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* Price Benchmarking */}
                                <MarketContextPanel
                                    region={editingListing.region}
                                    fuelType={editingListing.fuel_type}
                                    price={editForm.price_per_mt_usd}
                                />

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Availability Window</label>
                                    <select
                                        value={editForm.availability_window}
                                        onChange={(e) => handleEditFormChange('availability_window', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    >
                                        {['Spot', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Forward 2027', 'Forward 2028'].map(a => (
                                            <option key={a} value={a}>{a}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Certifications */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Certifications</label>
                                    <input
                                        type="text"
                                        placeholder="Type a certification and press Enter"
                                        onKeyDown={handleCertificationInputKeyDown}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    />
                                    {editForm.certifications.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {editForm.certifications.map((cert, idx) => (
                                                <span
                                                    key={idx}
                                                    className="flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-full text-xs text-emerald-600 dark:text-emerald-400"
                                                >
                                                    <CheckCircle2 size={12} />
                                                    {cert}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEditCertification(idx)}
                                                        className="ml-1 text-emerald-400 hover:text-red-400 transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    disabled={isUpdating}
                                    className="flex-1 py-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.quantity_mt <= 0 || editForm.price_per_mt_usd <= 0 || isUpdating}
                                    className={`flex-1 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                        editForm.quantity_mt > 0 && editForm.price_per_mt_usd > 0 && !isUpdating
                                            ? 'bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-900'
                                            : 'bg-slate-200 dark:bg-slate-600 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-transparent'
                                    }`}
                                >
                                    {isUpdating ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={closeConfirm}
                onConfirm={handleConfirmAction}
                title={confirmState.title}
                message={confirmState.message}
                variant={confirmState.variant}
                cancelText={confirmState.type === 'ERROR' || confirmState.type === 'SUCCESS' ? undefined : 'Cancel'}
                confirmText={confirmState.type === 'ERROR' || confirmState.type === 'SUCCESS' ? 'Close' : 'Confirm'}
            />
        </div>
    );

};
