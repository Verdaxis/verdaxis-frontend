import React, { useState, useEffect } from 'react';
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
    BarChart3,
    Landmark,
} from 'lucide-react';
import { CreateListingModal, ListingFormData } from './supplier/CreateListingModal';
import { api } from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';
import { VerdaxisSelect } from './ui/VerdaxisSelect';
import { useNamespace } from '../hooks/useNamespace';
import {
    formatAvailabilityWindow,
    getAvailabilityWindowOptions,
} from '../utils/availabilityWindow';
import { getOrderDisplayName } from '../utils/marketProduct';
import { BenchmarkPriceBlock } from './trading/BenchmarkPriceBlock';

import { BenchmarkQuote, OrderBookOrder, OrderBookStatus } from '../types';

type SupplierListing = OrderBookOrder;

export const SupplierListingConsole: React.FC = () => {
    const { t, ready } = useNamespace('dashboard');
    const [listings, setListings] = useState<SupplierListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        certification_declared: boolean;
        certification_scheme: string;
        specification_standard: string;
        msds_available: boolean;
        carbon_intensity_gco2_mj?: number;
        carbon_intensity_method: string;
        feedstock: string;
        origin: string;
        off_spec: boolean;
        off_spec_notes: string;
        status: OrderBookStatus;
    }>({
        quantity_mt: 0,
        price_per_mt_usd: 0,
        availability_window: '',
        certifications: [],
        certification_declared: false,
        certification_scheme: '',
        specification_standard: '',
        msds_available: false,
        carbon_intensity_gco2_mj: undefined,
        carbon_intensity_method: '',
        feedstock: '',
        origin: '',
        off_spec: false,
        off_spec_notes: '',
        status: 'OPEN',
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [editBenchmark, setEditBenchmark] = useState<BenchmarkQuote | null>(null);
    const [editBenchmarkLoading, setEditBenchmarkLoading] = useState(false);
    const availabilityOptions = getAvailabilityWindowOptions();

    // Fetch Listings
    useEffect(() => {
        fetchListings();
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
                title: t('supplierListingConsole.modal.creationFailedTitle'),
                message: t('supplierListingConsole.modal.creationFailedMessage'),
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
                    title: t('supplierListingConsole.modal.updateFailedTitle'),
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
                    title: t('supplierListingConsole.modal.updateFailedTitle'),
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
            title: t('supplierListingConsole.modal.deleteTitle'),
            message: t('supplierListingConsole.modal.deleteMessage'),
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
                    title: t('supplierListingConsole.modal.deleteFailedTitle'),
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
            certification_declared: Boolean(listing.certification_declared),
            certification_scheme: listing.certification_scheme || '',
            specification_standard: listing.specification_standard || '',
            msds_available: Boolean(listing.msds_available),
            carbon_intensity_gco2_mj: listing.carbon_intensity_gco2_mj ?? undefined,
            carbon_intensity_method: listing.carbon_intensity_method || '',
            feedstock: listing.feedstock || '',
            origin: listing.origin || '',
            off_spec: Boolean(listing.off_spec),
            off_spec_notes: listing.off_spec_notes || '',
            status: listing.status,
        });
    };

    const closeEditModal = () => {
        setEditingListing(null);
        setIsUpdating(false);
        setEditBenchmark(null);
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
                certifications: editForm.certification_scheme ? [editForm.certification_scheme] : editForm.certifications,
                certification_declared: editForm.certification_declared,
                certification_scheme: editForm.certification_scheme.trim(),
                specification_standard: editForm.specification_standard.trim(),
                msds_available: editForm.msds_available,
                carbon_intensity_gco2_mj: editForm.carbon_intensity_gco2_mj,
                carbon_intensity_method: editForm.carbon_intensity_method.trim(),
                feedstock: editForm.feedstock.trim(),
                origin: editForm.origin.trim(),
                off_spec: editForm.off_spec,
                off_spec_notes: editForm.off_spec ? editForm.off_spec_notes.trim() : '',
                status: editForm.status,
            });
            await fetchListings();
            closeEditModal();
        } catch (error) {
            console.error("Failed to update listing:", error);
            setConfirmState({
                isOpen: true,
                type: 'ERROR',
                title: t('supplierListingConsole.modal.updateFailedTitle'),
                message: error instanceof Error ? error.message : 'Failed to update listing. Please try again.',
                variant: 'danger',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        async function loadEditBenchmark() {
            if (!editingListing?.market_product || !editingListing.delivery_point_id) {
                setEditBenchmark(null);
                return;
            }

            setEditBenchmarkLoading(true);
            try {
                const response = await api.benchmarks.lookup({
                    market_product: editingListing.market_product,
                    delivery_point_id: editingListing.delivery_point_id,
                    availability_window: editForm.availability_window,
                });
                if (!cancelled) {
                    setEditBenchmark(response.items?.[0] ?? null);
                }
            } catch {
                if (!cancelled) {
                    setEditBenchmark(null);
                }
            } finally {
                if (!cancelled) setEditBenchmarkLoading(false);
            }
        }

        loadEditBenchmark();
        return () => {
            cancelled = true;
        };
    }, [editForm.availability_window, editingListing?.delivery_point_id, editingListing?.market_product]);


    if (!ready) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            {t('supplierListingConsole.title')}
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            {t('supplierListingConsole.subtitle')}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-900 font-bold rounded-lg transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        {t('supplierListingConsole.createListing')}
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
                            <div className="text-xs text-slate-500 uppercase font-bold">{t('supplierListingConsole.kpi.totalListings')}</div>
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
                            <div className="text-xs text-slate-500 uppercase font-bold">{t('supplierListingConsole.kpi.active')}</div>
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
                            <div className="text-xs text-slate-500 uppercase font-bold">{t('supplierListingConsole.kpi.totalVolume')}</div>
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
                            <div className="text-xs text-slate-500 uppercase font-bold">{t('supplierListingConsole.kpi.orderMatches')}</div>
                        </div>
                    </div>
                </div>

                {/* Listings Table */}
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                    {isLoading ? (
                        <div className="p-12 flex justify-center items-center text-slate-500 dark:text-slate-400">
                            <Loader2 className="animate-spin mr-2" />
                            <span>{t('supplierListingConsole.loading')}</span>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 font-bold bg-slate-50 dark:bg-slate-800/50">
                                            <th className="px-6 py-4 text-left">{t('supplierListingConsole.table.fuelRegion')}</th>
                                            <th className="px-6 py-4 text-left">{t('supplierListingConsole.table.availability')}</th>
                                            <th className="px-6 py-4 text-right">{t('supplierListingConsole.table.quantity')}</th>
                                            <th className="px-6 py-4 text-right">{t('supplierListingConsole.table.price')}</th>
                                            <th className="px-6 py-4 text-center">{t('supplierListingConsole.table.certifications')}</th>
                                            <th className="px-6 py-4 text-center">{t('supplierListingConsole.table.orderMatches')}</th>
                                            <th className="px-6 py-4 text-center">{t('supplierListingConsole.table.status')}</th>
                                            <th className="px-6 py-4 text-right">{t('supplierListingConsole.table.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                        {listings.map(listing => (
                                            <tr key={listing.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 dark:text-slate-200">
                                                        {getOrderDisplayName(listing)}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {[listing.delivery_point_name, listing.region].filter(Boolean).join(' · ')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{formatAvailabilityWindow(listing.availability_window)}</td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-200">
                                                    {listing.quantity_mt.toLocaleString()} MT
                                                    {listing.remaining_quantity_mt !== undefined && listing.remaining_quantity_mt !== listing.quantity_mt && (
                                                        <div className="text-xs text-slate-400">({listing.remaining_quantity_mt.toLocaleString()} {t('supplierListingConsole.table.remaining')})</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <BenchmarkPriceBlock
                                                        priceUsd={Number(listing.price_per_mt_usd)}
                                                        benchmarkUsd={listing.benchmark_price_per_mt_usd == null ? null : Number(listing.benchmark_price_per_mt_usd)}
                                                        deltaUsd={listing.premium_discount_per_mt_usd == null ? null : Number(listing.premium_discount_per_mt_usd)}
                                                        align="right"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                                        {listing.certification_scheme && (
                                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-transparent">
                                                                {listing.certification_scheme}
                                                            </span>
                                                        )}
                                                        {listing.certification_declared && (
                                                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 rounded text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                                                                Certified
                                                            </span>
                                                        )}
                                                        {listing.off_spec && (
                                                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 rounded text-xs text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                                                                Off-spec
                                                            </span>
                                                        )}
                                                        {listing.is_verdaxis_verified && (
                                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 rounded text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                                                                <Shield size={10} />
                                                                {t('supplierListingConsole.table.verified')}
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
                                                        {listing.status === 'OPEN'
                                                            ? t('supplierListingConsole.table.active')
                                                            : listing.status === 'CANCELLED'
                                                            ? t('supplierListingConsole.table.inactive')
                                                            : listing.status === 'PARTIALLY_FILLED'
                                                            ? t('supplierListingConsole.table.partialFill')
                                                            : listing.status === 'FILLED'
                                                            ? t('supplierListingConsole.table.filled')
                                                            : listing.status}
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
                                    <p className="text-lg">{t('supplierListingConsole.emptyState.heading')}</p>
                                    <p className="text-sm mt-1">{t('supplierListingConsole.emptyState.body')}</p>
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
                />
            )}

            {/* Edit Listing Modal */}
            {editingListing && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0 bg-slate-50 dark:bg-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">{t('supplierListingConsole.editModal.title')}</h2>
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
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Product</label>
                                        <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed">
                                            {getOrderDisplayName(editingListing)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Delivery point</label>
                                        <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed">
                                            {[editingListing.delivery_point_name, editingListing.region].filter(Boolean).join(' · ')}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('supplierListingConsole.editModal.status')}</label>
                                        <VerdaxisSelect
                                            ariaLabel="Listing status"
                                            value={editForm.status}
                                            onChange={(value) => handleEditFormChange('status', value)}
                                            options={[
                                                { value: 'OPEN', label: t('supplierListingConsole.table.active') },
                                                { value: 'CANCELLED', label: t('supplierListingConsole.table.inactive') },
                                            ]}
                                        />
                                    </div>
                                </div>

                                {/* Editable Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('supplierListingConsole.editModal.quantity')}</label>
                                        <input
                                            type="number"
                                            value={editForm.quantity_mt || ''}
                                            onChange={(e) => handleEditFormChange('quantity_mt', parseFloat(e.target.value) || 0)}
                                            placeholder="e.g., 5000"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('supplierListingConsole.editModal.price')}</label>
                                        <input
                                            type="number"
                                            value={editForm.price_per_mt_usd || ''}
                                            onChange={(e) => handleEditFormChange('price_per_mt_usd', parseFloat(e.target.value) || 0)}
                                            placeholder="e.g., 520"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 dark:border-slate-600/50 bg-slate-50 dark:bg-slate-700/30 p-4">
                                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                        <span className="flex items-center gap-2">
                                            <Landmark size={14} className="text-emerald-500 dark:text-emerald-400" />
                                            Benchmark Context
                                        </span>
                                        {editBenchmarkLoading && <Loader2 size={14} className="animate-spin" />}
                                    </div>
                                    {editBenchmark ? (
                                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <div className="text-[11px] uppercase tracking-wide text-slate-400">Benchmark</div>
                                                <div className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
                                                    ${Number(editBenchmark.benchmark_price_per_mt_usd).toLocaleString()}/MT
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{editBenchmark.source || 'Benchmark'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[11px] uppercase tracking-wide text-slate-400">Current delta</div>
                                                <div className={`mt-1 font-semibold ${
                                                    editForm.price_per_mt_usd <= Number(editBenchmark.benchmark_price_per_mt_usd)
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-amber-600 dark:text-amber-400'
                                                }`}>
                                                    {editForm.price_per_mt_usd - Number(editBenchmark.benchmark_price_per_mt_usd) < 0 ? '-' : '+'}
                                                    ${Math.abs(editForm.price_per_mt_usd - Number(editBenchmark.benchmark_price_per_mt_usd)).toFixed(2)} vs benchmark
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                                            No benchmark is available for this listing context.
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('supplierListingConsole.editModal.availabilityWindow')}</label>
                                    <VerdaxisSelect
                                        ariaLabel="Listing availability window"
                                        value={editForm.availability_window}
                                        onChange={(value) => handleEditFormChange('availability_window', value)}
                                        options={availabilityOptions.map(option => ({ value: option.value, label: option.label }))}
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={editForm.certification_declared}
                                            onChange={(e) => handleEditFormChange('certification_declared', e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        Listing is certified
                                    </label>
                                    <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={editForm.msds_available}
                                            onChange={(e) => handleEditFormChange('msds_available', e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-[#5DADE2] focus:ring-[#5DADE2]"
                                        />
                                        MSDS available
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Certification scheme</label>
                                        <input
                                            type="text"
                                            value={editForm.certification_scheme}
                                            onChange={(e) => handleEditFormChange('certification_scheme', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200"
                                            placeholder="e.g. ISCC EU"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Specification standard</label>
                                        <input
                                            type="text"
                                            value={editForm.specification_standard}
                                            onChange={(e) => handleEditFormChange('specification_standard', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200"
                                            placeholder="e.g. IMPCA"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">CI (gCO2e/MJ)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            value={editForm.carbon_intensity_gco2_mj ?? ''}
                                            onChange={(e) => handleEditFormChange('carbon_intensity_gco2_mj', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">CI methodology</label>
                                        <input
                                            type="text"
                                            value={editForm.carbon_intensity_method}
                                            onChange={(e) => handleEditFormChange('carbon_intensity_method', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Feedstock</label>
                                        <input
                                            type="text"
                                            value={editForm.feedstock}
                                            onChange={(e) => handleEditFormChange('feedstock', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Origin</label>
                                        <input
                                            type="text"
                                            value={editForm.origin}
                                            onChange={(e) => handleEditFormChange('origin', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={editForm.off_spec}
                                            onChange={(e) => handleEditFormChange('off_spec', e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                        />
                                        Off-spec listing
                                    </label>
                                    {editForm.off_spec && (
                                        <textarea
                                            value={editForm.off_spec_notes}
                                            onChange={(e) => handleEditFormChange('off_spec_notes', e.target.value)}
                                            className="min-h-[100px] w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                                            placeholder="Describe the variance clearly"
                                        />
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
                                    {t('supplierListingConsole.editModal.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        editForm.quantity_mt <= 0 ||
                                        editForm.price_per_mt_usd <= 0 ||
                                        !editForm.certification_declared ||
                                        editForm.certification_scheme.trim() === '' ||
                                        (editForm.off_spec && editForm.off_spec_notes.trim() === '') ||
                                        isUpdating
                                    }
                                    className={`flex-1 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                        editForm.quantity_mt > 0 &&
                                        editForm.price_per_mt_usd > 0 &&
                                        editForm.certification_declared &&
                                        editForm.certification_scheme.trim() !== '' &&
                                        (!editForm.off_spec || editForm.off_spec_notes.trim() !== '') &&
                                        !isUpdating
                                            ? 'bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-900'
                                            : 'bg-slate-200 dark:bg-slate-600 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-transparent'
                                    }`}
                                >
                                    {isUpdating ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            {t('supplierListingConsole.editModal.saving')}
                                        </>
                                    ) : (
                                        t('supplierListingConsole.editModal.saveChanges')
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
