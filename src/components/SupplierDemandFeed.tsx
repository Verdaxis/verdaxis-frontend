
import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Filter,
    Loader2,
    Megaphone,
    MapPin,
    Fuel,
    Weight,
    Calendar,
    X,
    Send,
    AlertCircle,
    Inbox,
    RefreshCw,
    ChevronDown,
    DollarSign,
} from 'lucide-react';
import { OrderBookOrder, DemandSignal } from '../types';
import { api } from '../services/api';
import { useCopilotContext } from '../context/CopilotContext';

const FUEL_TYPE_OPTIONS = ['All', 'Methanol', 'Biofuel', 'LNG', 'Ammonia (Green)', 'Ammonia'];
const STATUS_OPTIONS = ['OPEN', 'ALL'];

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'OPEN':
            return {
                label: 'Open',
                bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
                text: 'text-emerald-700 dark:text-emerald-400',
                dot: 'bg-emerald-500',
            };
        case 'PARTIALLY_FILLED':
            return {
                label: 'Partially Filled',
                bg: 'bg-blue-500/10 dark:bg-blue-500/20',
                text: 'text-blue-700 dark:text-blue-400',
                dot: 'bg-blue-500',
            };
        case 'FILLED':
            return {
                label: 'Filled',
                bg: 'bg-amber-500/10 dark:bg-amber-500/20',
                text: 'text-amber-700 dark:text-amber-400',
                dot: 'bg-amber-500',
            };
        case 'CANCELLED':
            return {
                label: 'Cancelled',
                bg: 'bg-red-500/10 dark:bg-red-500/20',
                text: 'text-red-700 dark:text-red-400',
                dot: 'bg-red-500',
            };
        case 'EXPIRED':
            return {
                label: 'Expired',
                bg: 'bg-slate-500/10 dark:bg-slate-500/20',
                text: 'text-slate-700 dark:text-slate-400',
                dot: 'bg-slate-500',
            };
        default:
            return {
                label: status,
                bg: 'bg-slate-500/10 dark:bg-slate-500/20',
                text: 'text-slate-700 dark:text-slate-400',
                dot: 'bg-slate-500',
            };
    }
};

const getFuelIcon = (fuelType: string) => {
    switch (fuelType) {
        case 'Methanol':
            return 'bg-violet-500/10 text-violet-500 dark:bg-violet-500/20';
        case 'Biofuel':
            return 'bg-green-500/10 text-green-500 dark:bg-green-500/20';
        case 'LNG':
            return 'bg-sky-500/10 text-sky-500 dark:bg-sky-500/20';
        case 'Ammonia (Green)':
            return 'bg-teal-500/10 text-teal-500 dark:bg-teal-500/20';
        default:
            return 'bg-slate-500/10 text-slate-500 dark:bg-slate-500/20';
    }
};

export const SupplierDemandFeed: React.FC = () => {
    const { setPageContext } = useCopilotContext();
    const [orders, setOrders] = useState<OrderBookOrder[]>([]);
    const [demandSignals, setDemandSignals] = useState<DemandSignal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [fuelTypeFilter, setFuelTypeFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('OPEN');
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [selectedOrder, setSelectedOrder] = useState<OrderBookOrder | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Broadcast Copilot Context
    useEffect(() => {
        if (!loading) {
            setPageContext({
                view: 'Supplier Demand Feed',
                total_rfqs: orders.length,
                open_rfqs: orders.filter(o => o.status === 'OPEN').length,
                fuel_filter: fuelTypeFilter,
                status_filter: statusFilter,
                search_query: searchQuery || 'None',
                summary: 'Browse open buyer fuel requests (RFQs) and submit competitive offers.'
            });
        }
    }, [orders, loading, fuelTypeFilter, statusFilter, searchQuery, setPageContext]);

    const fetchOrders = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const [bids, signals] = await Promise.all([
                api.orderbook.listBids(),
                api.demand.signals(),
            ]);
            setOrders(bids);
            setDemandSignals(signals);
        } catch (e: any) {
            console.error('Failed to fetch demand feed:', e);
            setError(e.message || 'Failed to load buyer requests. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Filter logic
    const filteredOrders = orders.filter(order => {
        // Status filter
        if (statusFilter === 'OPEN' && order.status !== 'OPEN') return false;

        // Fuel type filter
        if (fuelTypeFilter !== 'All' && order.fuel_type !== fuelTypeFilter) return false;

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchRegion = order.region?.toLowerCase().includes(q);
            const matchFuel = order.fuel_type?.toLowerCase().includes(q);
            const matchId = order.id?.toLowerCase().includes(q);
            if (!matchRegion && !matchFuel && !matchId) return false;
        }

        return true;
    });

    const openOfferModal = (order: OrderBookOrder) => {
        setSelectedOrder(order);
        setSubmitError(null);
        setSubmitSuccess(false);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (submitting) return;
        setIsModalOpen(false);
        setSelectedOrder(null);
        setSubmitError(null);
        setSubmitSuccess(false);
    };

    const handleSubmitOffer = async () => {
        if (!selectedOrder) return;

        setSubmitting(true);
        setSubmitError(null);

        try {
            await api.trades.initiate({
                order_id: selectedOrder.id,
                quantity_mt: selectedOrder.quantity_mt,
            });
            setSubmitSuccess(true);
            // Refresh the list
            await fetchOrders(true);
        } catch (e: any) {
            console.error('Failed to initiate trade:', e);
            setSubmitError(e.message || 'Failed to initiate trade. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl">
                        <Megaphone size={24} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">
                            Buyer Demand Feed
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                            Browse open fuel requests and submit your offers
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Search */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by port, fuel, or ID..."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/40 outline-none transition-all focus:border-emerald-500 bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                        />
                    </div>

                    {/* Fuel Type Filter */}
                    <div className="relative w-full md:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={fuelTypeFilter}
                            onChange={(e) => setFuelTypeFilter(e.target.value)}
                            className="w-full pl-10 pr-8 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 outline-none transition-all focus:border-emerald-500 cursor-pointer"
                        >
                            {FUEL_TYPE_OPTIONS.map(ft => (
                                <option key={ft} value={ft}>{ft === 'All' ? 'All Fuel Types' : ft}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Status Filter */}
                    <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
                        {STATUS_OPTIONS.map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                    statusFilter === s
                                        ? 'bg-white dark:bg-slate-600 text-emerald-700 dark:text-emerald-400 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {s === 'OPEN' ? 'Open Only' : 'All Statuses'}
                            </button>
                        ))}
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchOrders(true)}
                        disabled={refreshing}
                        className="ml-auto p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Loader2 size={36} className="animate-spin text-emerald-500 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Loading buyer requests...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="p-4 bg-red-500/10 rounded-full mb-4">
                        <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">Failed to Load Requests</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-md text-center">{error}</p>
                    <button
                        onClick={() => fetchOrders()}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                        <Inbox size={32} className="text-slate-400" />
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">No open requests right now</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md text-center">
                        {searchQuery || fuelTypeFilter !== 'All'
                            ? 'Try adjusting your filters to see more results.'
                            : 'New buyer RFQs will appear here as they are submitted. Check back soon.'}
                    </p>
                </div>
            ) : (
                <>
                    {/* Demand Signals Summary */}
                    {demandSignals.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {demandSignals.slice(0, 6).map((signal, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{signal.fuel_type}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                            signal.urgency === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                            : signal.urgency === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
                                        }`}>
                                            {signal.urgency}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                        <div>{signal.region} &mdash; {signal.bid_count} buyer{signal.bid_count > 1 ? 's' : ''}</div>
                                        <div>{signal.volume_mt.toLocaleString()} MT demanded</div>
                                        <div>Up to ${signal.max_price_per_mt.toLocaleString()}/MT</div>
                                        <div>{signal.earliest_delivery}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Count Badge */}
                    <div className="mb-4 flex items-center gap-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            Showing <span className="font-bold text-slate-700 dark:text-slate-200">{filteredOrders.length}</span> request{filteredOrders.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* RFQ Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredOrders.map(order => {
                            const statusConfig = getStatusConfig(order.status);
                            const fuelColorClass = getFuelIcon(order.fuel_type);
                            const isOpen = order.status === 'OPEN';

                            return (
                                <div
                                    key={order.id}
                                    className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                                        isOpen
                                            ? 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                                            : 'border-slate-200 dark:border-slate-700 opacity-75'
                                    }`}
                                >
                                    {/* Card Header */}
                                    <div className="p-5 pb-4">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`p-2 rounded-lg ${fuelColorClass}`}>
                                                    <Fuel size={18} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                                        {order.fuel_type}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 font-mono">
                                                        #{order.id.slice(0, 8)}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                                                {statusConfig.label}
                                            </span>
                                        </div>

                                        {/* Details Grid */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2.5 text-sm">
                                                <MapPin size={15} className="text-slate-400 flex-shrink-0" />
                                                <span className="text-slate-600 dark:text-slate-300">
                                                    {order.region || 'Region not specified'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-sm">
                                                <Weight size={15} className="text-slate-400 flex-shrink-0" />
                                                <span className="text-slate-600 dark:text-slate-300">
                                                    <span className="font-bold text-slate-800 dark:text-white">{order.quantity_mt?.toLocaleString()}</span> MT requested
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-sm">
                                                <DollarSign size={15} className="text-slate-400 flex-shrink-0" />
                                                <span className="text-slate-600 dark:text-slate-300">
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">${order.price_per_mt_usd?.toLocaleString()}</span> /MT bid price
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-sm">
                                                <Calendar size={15} className="text-slate-400 flex-shrink-0" />
                                                <span className="text-slate-600 dark:text-slate-300">
                                                    {order.delivery_window_start
                                                        ? `${new Date(order.delivery_window_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${order.delivery_window_end ? ` - ${new Date(order.delivery_window_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`
                                                        : order.availability_window || 'Spot delivery'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer / Action */}
                                    <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                        {isOpen ? (
                                            <button
                                                onClick={() => openOfferModal(order)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm shadow-emerald-600/20"
                                            >
                                                <Send size={15} />
                                                Hit Bid
                                            </button>
                                        ) : (
                                            <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-1.5 font-medium uppercase tracking-wider">
                                                {order.status === 'FILLED' ? 'Fully filled' : order.status === 'PARTIALLY_FILLED' ? 'Partially filled' : 'Closed'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Hit Bid Confirmation Modal */}
            {isModalOpen && selectedOrder && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl">
                                        <Send size={20} className="text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Hit Bid</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            BID #{selectedOrder.id.slice(0, 8)} &middot; {selectedOrder.fuel_type} &middot; {selectedOrder.quantity_mt?.toLocaleString()} MT
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {submitSuccess ? (
                            /* Success State */
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="p-4 bg-emerald-500/10 rounded-full mb-4">
                                    <Send size={28} className="text-emerald-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Trade Initiated</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                                    You have successfully hit the bid. A trade has been created and the buyer will be notified.
                                </p>
                                <button
                                    onClick={closeModal}
                                    className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            /* Confirmation */
                            <div className="p-6 space-y-5">
                                {/* Bid Summary */}
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                    <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">Bid Details</div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-400" />
                                            <span className="text-slate-600 dark:text-slate-300">{selectedOrder.region}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Fuel size={14} className="text-slate-400" />
                                            <span className="text-slate-600 dark:text-slate-300">{selectedOrder.fuel_type}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Weight size={14} className="text-slate-400" />
                                            <span className="text-slate-600 dark:text-slate-300">{selectedOrder.quantity_mt?.toLocaleString()} MT</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DollarSign size={14} className="text-slate-400" />
                                            <span className="text-slate-600 dark:text-slate-300">${selectedOrder.price_per_mt_usd?.toLocaleString()} /MT</span>
                                        </div>
                                        <div className="flex items-center gap-2 col-span-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            <span className="text-slate-600 dark:text-slate-300">
                                                {selectedOrder.delivery_window_start
                                                    ? `${new Date(selectedOrder.delivery_window_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${selectedOrder.delivery_window_end ? ` - ${new Date(selectedOrder.delivery_window_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`
                                                    : selectedOrder.availability_window || 'Spot'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-500/30">
                                    <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                                        Hitting this bid will create a trade for <span className="font-bold">{selectedOrder.quantity_mt?.toLocaleString()} MT</span> at <span className="font-bold">${selectedOrder.price_per_mt_usd?.toLocaleString()}/MT</span> (total: <span className="font-bold">${((selectedOrder.quantity_mt || 0) * (selectedOrder.price_per_mt_usd || 0)).toLocaleString()}</span>).
                                    </p>
                                </div>

                                {/* Error */}
                                {submitError && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                                        <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={closeModal}
                                        disabled={submitting}
                                        className="flex-1 px-4 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitOffer}
                                        disabled={submitting}
                                        className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Initiating...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={16} />
                                                Confirm Trade
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
