import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Ship, Loader2, MapPin, Shield, DollarSign, Calendar, Info, CheckCircle2, RefreshCw, Plus, ChevronDown, X } from 'lucide-react';
import { Port, AvailabilityWindow, OrderBookOrder } from '../types';
import { PORTS } from '../data';
import { api } from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';
import { OrderPlaceModal } from './OrderPlaceModal';
import { Pagination } from './ui/Pagination';

import { formatTierLabel } from '../utils';
import { OrderBook } from './OrderBook';

interface MarketplaceProps {
    initialPort: Port | null;
}

// Returns row color classes based on fuel type
function getFuelRowClasses(fuelType: string): string {
    const ft = fuelType.toLowerCase();
    if (ft === 'methanol') return 'border-l-2 border-l-violet-400 bg-violet-50 dark:bg-violet-950/20';
    if (ft === 'biofuel') return 'border-l-2 border-l-green-400 bg-green-50 dark:bg-green-950/20';
    if (ft === 'lng') return 'border-l-2 border-l-sky-400 bg-sky-50 dark:bg-sky-950/20';
    if (ft === 'ammonia' || ft === 'ammonia (green)') return 'border-l-2 border-l-teal-400 bg-teal-50 dark:bg-teal-950/20';
    if (ft === 'lsmgo') return 'border-l-2 border-l-amber-400 bg-amber-50 dark:bg-amber-950/20';
    // ethanol / default
    return 'border-l-2 border-l-slate-400 bg-white dark:bg-slate-800';
}

// Returns the sticky-cell bg class (must match row bg for correct overlap)
function getFuelStickyBg(fuelType: string): string {
    const ft = fuelType.toLowerCase();
    if (ft === 'methanol') return 'bg-violet-50 dark:bg-violet-950/20';
    if (ft === 'biofuel') return 'bg-green-50 dark:bg-green-950/20';
    if (ft === 'lng') return 'bg-sky-50 dark:bg-sky-950/20';
    if (ft === 'ammonia' || ft === 'ammonia (green)') return 'bg-teal-50 dark:bg-teal-950/20';
    if (ft === 'lsmgo') return 'bg-amber-50 dark:bg-amber-950/20';
    return 'bg-white dark:bg-slate-800';
}

// Fuel type badge color
function getFuelBadgeClasses(fuelType: string): string {
    const ft = fuelType.toLowerCase();
    if (ft === 'methanol') return 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300';
    if (ft === 'biofuel') return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
    if (ft === 'lng') return 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300';
    if (ft === 'ammonia' || ft === 'ammonia (green)') return 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300';
    if (ft === 'lsmgo') return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
    return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
}

function formatExpiry(listing: OrderBookOrder): React.ReactNode {
    const expiryDate = (listing as any).expiry_date;
    if (!expiryDate) {
        return (
            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">
                GTC
            </span>
        );
    }
    const formatted = new Date(expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    return (
        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
            {formatted}
        </span>
    );
}

const PAGE_SIZE = 20;

export const Marketplace: React.FC<MarketplaceProps> = ({ initialPort }) => {
    const [portInput, setPortInput] = useState(initialPort?.name || '');
    const [fuelType, setFuelType] = useState('Methanol');
    const [availability, setAvailability] = useState<AvailabilityWindow | ''>('');

    const [listings, setListings] = useState<OrderBookOrder[]>([]);
    const [totalListings, setTotalListings] = useState(0);
    const [currentSkip, setCurrentSkip] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    // Autocomplete state
    const [suggestions, setSuggestions] = useState<Port[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Selected Listing for Modal
    const [selectedListing, setSelectedListing] = useState<OrderBookOrder | null>(null);
    const [buyQuantity, setBuyQuantity] = useState<number>(0);
    const [buyDate, setBuyDate] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'SUCCESS' | 'ERROR' | null;
        title: string;
        message: string;
        variant?: 'success' | 'danger';
    }>({
        isOpen: false,
        type: null,
        title: '',
        message: ''
    });

    const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [filterGrade, setFilterGrade] = useState<string>('All');
    const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'quantity_desc' | 'newest'>('price_asc');

    const filteredListings = useMemo(() => {
        let result = [...listings];
        if (filterGrade !== 'All') {
            result = result.filter(l => l.fuel_grade === filterGrade);
        }
        if (filterVerifiedOnly) {
            result = result.filter(l => l.is_verdaxis_verified);
        }
        switch (sortBy) {
            case 'price_asc': result.sort((a, b) => a.price_per_mt_usd - b.price_per_mt_usd); break;
            case 'price_desc': result.sort((a, b) => b.price_per_mt_usd - a.price_per_mt_usd); break;
            case 'quantity_desc': result.sort((a, b) => b.remaining_quantity_mt - a.remaining_quantity_mt); break;
            case 'newest': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
        }
        return result;
    }, [listings, filterGrade, filterVerifiedOnly, sortBy]);

    const activeFilterCount = (filterGrade !== 'All' ? 1 : 0) + (filterVerifiedOnly ? 1 : 0) + (sortBy !== 'price_asc' ? 1 : 0);

    // Order placement modal state
    const [orderModalSide, setOrderModalSide] = useState<'BID' | 'ASK' | null>(null);

    const handleSearch = useCallback(async (e?: React.FormEvent, isSilent = false, skip = 0) => {
        if (e) e.preventDefault();

        setIsSearching(true);
        if (!isSilent) setLoading(true);

        try {
            const data = await api.orderbook.listAsksPaged({
                region: portInput || undefined,
                fuel_type: fuelType === 'All' ? undefined : fuelType,
                availability: availability || undefined,
                skip,
                limit: PAGE_SIZE,
            });
            setListings(data.items);
            setTotalListings(data.total);
            setCurrentSkip(data.skip);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    }, [portInput, fuelType, availability]);

    // Initial load
    useEffect(() => {
        handleSearch();
    }, []);

    // Handle Input Change & Autocomplete
    const handleInputChange = (text: string) => {
        setPortInput(text);
        if (text.length > 1) {
            const matches = PORTS.filter(p => p.name.toLowerCase().includes(text.toLowerCase()));
            setSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (portName: string) => {
        setPortInput(portName);
        setShowSuggestions(false);
    };

    // Auto-refresh polling (60 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            handleSearch(undefined, true, currentSkip);
        }, 60000);
        return () => clearInterval(interval);
    }, [handleSearch, currentSkip]);

    const handlePageChange = (newSkip: number) => {
        handleSearch(undefined, false, newSkip);
    };

    // Reset to page 1 when filters change
    const handleSearchFromPage1 = (e?: React.FormEvent) => {
        handleSearch(e, false, 0);
    };

    const handleBuyClick = (listing: OrderBookOrder) => {
        setSelectedListing(listing);
        setBuyQuantity(listing.quantity_mt); // Default to max available
        // Default date: today + 14 days
        const date = new Date();
        date.setDate(date.getDate() + 14);
        setBuyDate(date.toISOString().split('T')[0]);
    };

    const handleConfirmBuy = async () => {
        if (!selectedListing) return;

        setIsSubmitting(true);
        try {
            await api.trades.initiate({ order_id: selectedListing.id, quantity_mt: buyQuantity || selectedListing.quantity_mt });
            setSelectedListing(null);
            setConfirmState({
                isOpen: true,
                type: 'SUCCESS',
                title: 'Order Request Sent',
                message: 'Your order request has been sent! The supplier will review it shortly.',
                variant: 'success'
            });
        } catch (error: any) {
            console.error("Failed to place order:", error);
            setConfirmState({
                isOpen: true,
                type: 'ERROR',
                title: 'Order Failed',
                message: 'Failed to submit order: ' + error.message,
                variant: 'danger'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24" onClick={() => setShowSuggestions(false)}>
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl v-heading">Green Fuel Marketplace</h1>
                <p className="text-slate-500 mt-1 lg:mt-2 text-sm lg:text-base">Secure compliant marine fuels based on energy density and real-time availability.</p>
            </div>

            {/* Search Bar */}
            <div className="v-card p-4 lg:p-6 mb-8 relative z-20">
                <form onSubmit={handleSearchFromPage1} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="relative">
                        <label className="v-label">Port Location</label>
                        <div className="relative">
                            <Ship className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={portInput}
                                onChange={(e) => handleInputChange(e.target.value)}
                                className="v-input pl-10"
                                placeholder="e.g. Singapore"
                                autoComplete="off"
                            />
                        </div>

                        {/* Autocomplete Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 mt-1 z-30 overflow-hidden">
                                {suggestions.map(port => (
                                    <div
                                        key={port.id}
                                        className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center space-x-2 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            selectSuggestion(port.name);
                                        }}
                                    >
                                        <MapPin size={14} className="text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{port.name}, {port.country}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="v-label">Fuel Type</label>
                        <select
                            value={fuelType}
                            onChange={(e) => setFuelType(e.target.value)}
                            className="v-input appearance-none"
                        >
                            <option value="All">All types</option>
                            <option>Methanol</option>
                            <option>Biofuel</option>
                            <option>Ethanol</option>
                            <option>LNG</option>
                            <option>Ammonia</option>
                            <option>LSMGO</option>
                        </select>
                    </div>
                    <div>
                        <label className="v-label">Delivery Window</label>
                         <select
                            value={availability}
                            onChange={(e) => setAvailability(e.target.value as any)}
                            className="v-input appearance-none"
                        >
                            <option value="">Any</option>
                            <option value="Spot">Spot</option>
                            <option value="Q1 2026">Q1 2026</option>
                            <option value="Q2 2026">Q2 2026</option>
                            <option value="Q3 2026">Q3 2026</option>
                            <option value="Q4 2026">Q4 2026</option>
                            <option value="Forward 2027">Forward 2027</option>
                            <option value="Forward 2028">Forward 2028</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="v-btn-primary w-full"
                    >
                        {isSearching ? (
                            <span className="animate-pulse">Searching...</span>
                        ) : (
                            <>
                                <Search size={18} />
                                <span>Find Listings</span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Results */}
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h2 className="text-lg lg:text-xl v-heading">
                        {loading ? 'Searching Listings...' : `${totalListings.toLocaleString()} Available Listings ${portInput ? `matching "${portInput}"` : ''}`}
                    </h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setOrderModalSide('BID')}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            <span>Place Bid</span>
                        </button>
                        <button
                            onClick={() => setOrderModalSide('ASK')}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#5DADE2] hover:bg-[#4A9BD9] text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            <span>Place Ask</span>
                        </button>
                        <button
                            onClick={() => handleSearch(undefined, false, currentSkip)}
                            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-500 transition-colors"
                        >
                            <RefreshCw size={16} className={isSearching ? 'animate-spin' : ''} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center space-x-2 text-sm font-medium transition-colors ${showFilters ? 'text-emerald-500' : 'text-slate-500 hover:text-[#5DADE2]'}`}
                        >
                            <Filter size={16} />
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">{activeFilterCount}</span>
                            )}
                            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2 duration-200">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Grade</label>
                            <select
                                value={filterGrade}
                                onChange={(e) => setFilterGrade(e.target.value)}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                            >
                                <option value="All">All Grades</option>
                                <option value="Conventional">Conventional</option>
                                <option value="Green">Green</option>
                                <option value="Bio">Bio</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                            >
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                                <option value="quantity_desc">Largest Quantity</option>
                                <option value="newest">Newest First</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer py-1.5">
                                <input
                                    type="checkbox"
                                    checked={filterVerifiedOnly}
                                    onChange={(e) => setFilterVerifiedOnly(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                    <Shield size={14} className="text-emerald-500" /> Verified Only
                                </span>
                            </label>
                        </div>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={() => { setFilterGrade('All'); setFilterVerifiedOnly(false); setSortBy('price_asc'); }}
                                className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
                            >
                                <X size={12} /> Clear Filters
                            </button>
                        )}
                    </div>
                )}

                {/* Live Orderbook */}
                <OrderBook fuelType={fuelType !== 'All' ? fuelType : undefined} region={portInput || undefined} />

                {/* Listings Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800">
                            <tr>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500 sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 whitespace-nowrap min-w-[180px]">
                                    Fuel &amp; Region
                                </th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500 whitespace-nowrap">Grade</th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500 whitespace-nowrap">Volume (MT)</th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500 whitespace-nowrap">Price/MT</th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500 whitespace-nowrap">Window</th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500 whitespace-nowrap">Expiry</th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500 whitespace-nowrap">Cert</th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500 whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center">
                                        <Loader2 size={32} className="animate-spin text-verdaxis mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredListings.length > 0 ? (
                                filteredListings.map((listing) => {
                                    const rowClasses = getFuelRowClasses(listing.fuel_type);
                                    const stickyBg = getFuelStickyBg(listing.fuel_type);
                                    const badgeClasses = getFuelBadgeClasses(listing.fuel_type);
                                    return (
                                        <tr
                                            key={listing.id}
                                            className={`h-10 hover:opacity-90 transition-opacity cursor-pointer border-b border-slate-200/50 dark:border-slate-700/50 ${rowClasses}`}
                                        >
                                            {/* Fuel & Region — sticky first column */}
                                            <td className={`px-4 py-2 sticky left-0 z-10 ${stickyBg} whitespace-nowrap`}>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeClasses}`}>
                                                        {listing.product_name || listing.fuel_type}
                                                    </span>
                                                    {listing.is_verdaxis_verified && (
                                                        <Shield size={12} className="text-emerald-500 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{listing.delivery_point_name || listing.region}</span>
                                                </div>
                                            </td>

                                            {/* Grade */}
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <span className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                                                    {listing.fuel_grade}
                                                </span>
                                            </td>

                                            {/* Volume */}
                                            <td className="px-4 py-2 whitespace-nowrap font-mono text-slate-700 dark:text-slate-200 text-xs">
                                                {listing.quantity_mt.toLocaleString()}
                                            </td>

                                            {/* Price/MT */}
                                            <td className="px-4 py-2 whitespace-nowrap font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                                ${listing.price_per_mt_usd}
                                            </td>

                                            {/* Window */}
                                            <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                                                {listing.availability_window}
                                            </td>

                                            {/* Expiry */}
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                {formatExpiry(listing)}
                                            </td>

                                            {/* Cert */}
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-1">
                                                    {listing.certifications.map(cert => (
                                                        <span
                                                            key={cert}
                                                            className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded"
                                                        >
                                                            {cert}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>

                                            {/* Action */}
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleBuyClick(listing); }}
                                                    className="px-3 py-1.5 text-xs font-bold bg-[#334155] hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-md transition-colors whitespace-nowrap"
                                                >
                                                    Inquire
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center">
                                        <Ship className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                                        <h3 className="text-lg font-bold text-slate-500">No listings found</h3>
                                        <p className="text-slate-400 mt-1">Try allowing "Spot" availability or searching for major hubs.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {/* Pagination */}
                    {!loading && totalListings > 0 && (
                        <div className="border-t border-slate-200 dark:border-slate-700 px-4">
                            <Pagination
                                total={totalListings}
                                skip={currentSkip}
                                limit={PAGE_SIZE}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Buy Modal */}
            {selectedListing && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Confirm Order Request</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Buying from {selectedListing.tier_label}</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Product</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedListing.product_name || selectedListing.fuel_type} ({selectedListing.fuel_grade})</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Price</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">${selectedListing.price_per_mt_usd} / MT</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Location</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedListing.delivery_point_name || selectedListing.region}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity (MT)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={buyQuantity}
                                        onChange={(e) => setBuyQuantity(Number(e.target.value))}
                                        max={selectedListing.quantity_mt}
                                        className="w-full p-3 pl-4 pr-12 border border-slate-200 dark:border-slate-600 rounded-lg text-lg font-bold text-slate-800 dark:text-white bg-transparent"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">MT</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 text-right">Max available: {selectedListing.quantity_mt} MT</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Requested Delivery Date</label>
                                <input
                                    type="date"
                                    value={buyDate}
                                    onChange={(e) => setBuyDate(e.target.value)}
                                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium bg-transparent dark:text-white"
                                />
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <Info size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    By clicking Confirm, you are sending a binding request to the supplier. The supplier will review your requested quantity and date and confirm the order shortly.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                onClick={() => setSelectedListing(null)}
                                className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmBuy}
                                disabled={isSubmitting || buyQuantity <= 0 || !buyDate}
                                className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                <span>Confirm Request</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <OrderPlaceModal
                isOpen={orderModalSide !== null}
                onClose={() => { setOrderModalSide(null); handleSearch(undefined, false, currentSkip); }}
                side={orderModalSide || 'BID'}
                prefillFuelType={fuelType !== 'All' ? fuelType : undefined}
                prefillRegion={portInput || undefined}
            />

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={closeConfirm}
                onConfirm={closeConfirm}
                title={confirmState.title}
                message={confirmState.message}
                variant={confirmState.variant}
                confirmText="Close"
                cancelText=""
            />
        </div>
    );
};
