import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search,
    Ship,
    Loader2,
    MapPin,
    Shield,
    Calendar,
    RefreshCw,
    Plus,
    ChevronDown,
    X,
    Filter,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCopilotContext } from '../context/CopilotContext';
import { api } from '../services/api';
import type { PaginatedResult } from '../services/api';
import { Port, OrderBookOrder, AvailabilityWindow } from '../types';
import { PORTS } from '../data';
import { OrderBook } from './OrderBook';
import { TradeTape } from './TradeTape';
import { RFQPanel } from './RFQPanel';
import { OrderPlaceModal } from './OrderPlaceModal';
import { Pagination } from './ui/Pagination';
import {
    getFuelRowClasses,
    getFuelBadgeClasses,
    getFuelStickyBg,
    getStatusConfig,
    formatExpiry,
    formatDeliveryWindow,
} from '../utils/fuel';

// ─── Role Config ──────────────────────────────────────────────────
type ColumnId = 'fuel' | 'grade' | 'volume' | 'price' | 'window' | 'expiry' | 'cert' | 'status' | 'action';

interface RoleConfigEntry {
    fetchOrders: (params?: {
        region?: string;
        fuel_type?: string;
        availability?: string;
        skip?: number;
        limit?: number;
    }) => Promise<PaginatedResult<any>>;
    subtitle: string;
    primaryAction: { label: string; side: 'BID' | 'ASK' };
    counterAction: { label: string };
    columns: ColumnId[];
}

const ROLE_CONFIG: Record<string, RoleConfigEntry> = {
    BUYER: {
        fetchOrders: api.orderbook.listAsksPaged,
        subtitle: 'Find and secure compliant marine fuels',
        primaryAction: { label: 'Place Bid', side: 'BID' as const },
        counterAction: { label: 'Inquire' },
        columns: ['fuel', 'grade', 'volume', 'price', 'window', 'expiry', 'cert', 'action'],
    },
    SUPPLIER: {
        fetchOrders: api.orderbook.listBidsPaged,
        subtitle: 'Browse open fuel requests and submit offers',
        primaryAction: { label: 'Place Ask', side: 'ASK' as const },
        counterAction: { label: 'Hit Bid' },
        columns: ['fuel', 'volume', 'price', 'window', 'status', 'action'],
    },
};

// ─── Fuel chip options ────────────────────────────────────────────
const FUEL_TYPES = ['All', 'Methanol', 'Biofuel', 'LNG', 'Ammonia', 'LSMGO'];
const PAGE_SIZE = 20;
const REFRESH_INTERVAL_MS = 60_000;

// ─── Column header labels ─────────────────────────────────────────
const COLUMN_HEADERS: Record<ColumnId, string> = {
    fuel: 'Fuel & Region',
    grade: 'Grade',
    volume: 'Volume (MT)',
    price: 'Price/MT',
    window: 'Window',
    expiry: 'Expiry',
    cert: 'Cert',
    status: 'Status',
    action: 'Action',
};

// ─── Props ────────────────────────────────────────────────────────
interface MarketplaceProps {
    initialPort?: Port | null;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ initialPort }) => {
    const { user } = useAuth();
    const { setPageContext } = useCopilotContext();
    const role = user?.role ?? 'BUYER';
    const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.BUYER;

    // ─── Data state ───────────────────────────────────────────────
    const [listings, setListings] = useState<OrderBookOrder[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Filter state ─────────────────────────────────────────────
    const [portInput, setPortInput] = useState(initialPort?.name || '');
    const [fuelType, setFuelType] = useState('All');
    const [availability, setAvailability] = useState<AvailabilityWindow | ''>('');
    const [currentSkip, setCurrentSkip] = useState(0);

    // ─── Client-side filters ──────────────────────────────────────
    const [filterGrade, setFilterGrade] = useState<string>('All');
    const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'quantity_desc' | 'newest'>('price_asc');
    const [showFilters, setShowFilters] = useState(false);

    // ─── Port autocomplete ────────────────────────────────────────
    const [suggestions, setSuggestions] = useState<Port[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // ─── Trade modal state ────────────────────────────────────────
    const [selectedOrder, setSelectedOrder] = useState<OrderBookOrder | null>(null);
    const [marketTab, setMarketTab] = useState<'orderbook' | 'rfq'>('orderbook');
    const [tradeQuantity, setTradeQuantity] = useState(0);
    const [tradeState, setTradeState] = useState<'idle' | 'confirming' | 'submitting' | 'success' | 'error'>('idle');
    const [tradeError, setTradeError] = useState('');

    // ─── Order placement modal ────────────────────────────────────
    const [orderModalSide, setOrderModalSide] = useState<'BID' | 'ASK' | null>(null);

    // ─── Fuel counts for chips ────────────────────────────────────
    const fuelCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const order of listings) {
            const key = order.fuel_type;
            counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
    }, [listings]);

    // ─── Client-side filter + sort ────────────────────────────────
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

    // ─── Data fetching ────────────────────────────────────────────
    const fetchData = useCallback(async (silent = false, skip = 0) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const data = await config.fetchOrders({
                region: portInput || undefined,
                fuel_type: fuelType === 'All' ? undefined : fuelType,
                availability: availability || undefined,
                skip,
                limit: PAGE_SIZE,
            });
            setListings(data.items);
            setTotalCount(data.total);
            setCurrentSkip(data.skip);
        } catch (err: any) {
            console.error('Marketplace fetch error:', err);
            setError(err.message || 'Failed to load listings. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [config, portInput, fuelType, availability]);

    // Fetch on mount + whenever filters change (fuelType, portInput, availability, role)
    // fetchData is a useCallback with these in its dep array, so it gets a new ref on change
    useEffect(() => {
        fetchData(false, 0);
    }, [fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

    // 60s auto-refresh (silent)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData(true, currentSkip);
        }, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchData, currentSkip]);

    // ─── Copilot context broadcast ────────────────────────────────
    useEffect(() => {
        if (!loading) {
            setPageContext({
                view: 'Marketplace',
                role,
                total_listings: totalCount,
                fuel_filter: fuelType,
                region_filter: portInput || 'Any',
                availability_filter: availability || 'Any',
                page_skip: currentSkip,
                summary: config.subtitle,
            });
        }
    }, [listings, loading, fuelType, portInput, availability, currentSkip, role, totalCount, config.subtitle, setPageContext]);

    // ─── Port autocomplete handlers ───────────────────────────────
    const handlePortInput = (text: string) => {
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

    // ─── Search handlers ──────────────────────────────────────────
    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        fetchData(false, 0);
    };

    const handlePageChange = (newSkip: number) => {
        fetchData(false, newSkip);
    };

    const handleFuelChipClick = (ft: string) => {
        setFuelType(ft);
    };

    // Re-fetch when fuelType changes (fixes stale closure from chip click)
    useEffect(() => {
        fetchData(false, 0);
    }, [fuelType]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Trade modal handlers ─────────────────────────────────────
    const openTradeModal = (order: OrderBookOrder) => {
        setSelectedOrder(order);
        setTradeQuantity(order.remaining_quantity_mt);
        setTradeState('confirming');
        setTradeError('');
    };

    const closeTradeModal = () => {
        setSelectedOrder(null);
        setTradeState('idle');
        setTradeError('');
    };

    const confirmTrade = async () => {
        if (!selectedOrder || tradeState === 'submitting') return;
        setTradeState('submitting');
        try {
            await api.trades.initiate({
                order_id: selectedOrder.id,
                quantity_mt: tradeQuantity || selectedOrder.quantity_mt,
            });
            setTradeState('success');
            // Auto-close after 2s and refresh
            setTimeout(() => {
                closeTradeModal();
                fetchData(true, currentSkip);
            }, 2000);
        } catch (err: any) {
            setTradeError(err.message || 'Trade initiation failed');
            setTradeState('error');
        }
    };

    // ─── Column renderer ──────────────────────────────────────────
    const renderCell = (col: ColumnId, order: OrderBookOrder): React.ReactNode => {
        switch (col) {
            case 'fuel': {
                const badgeClasses = getFuelBadgeClasses(order.fuel_type);
                const stickyBg = getFuelStickyBg(order.fuel_type);
                return (
                    <td key={col} className={`px-4 py-2 sticky left-0 z-20 ${stickyBg} whitespace-nowrap min-w-[180px]`}>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeClasses}`}>
                                {order.product_name || order.fuel_type}
                            </span>
                            {order.is_verdaxis_verified && (
                                <Shield size={12} className="text-emerald-500 flex-shrink-0" />
                            )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                                {order.delivery_point_name || order.region}
                            </span>
                        </div>
                    </td>
                );
            }
            case 'grade':
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap">
                        <span className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                            {order.fuel_grade}
                        </span>
                    </td>
                );
            case 'volume':
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap font-mono text-slate-700 dark:text-slate-200 text-xs">
                        {order.quantity_mt.toLocaleString()}
                    </td>
                );
            case 'price':
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        ${order.price_per_mt_usd.toLocaleString()}
                    </td>
                );
            case 'window':
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                        {formatDeliveryWindow(order)}
                    </td>
                );
            case 'expiry':
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap">
                        {formatExpiry(order)}
                    </td>
                );
            case 'cert':
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                            {order.certifications.map(cert => (
                                <span
                                    key={cert}
                                    className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded"
                                >
                                    {cert}
                                </span>
                            ))}
                        </div>
                    </td>
                );
            case 'status': {
                const statusCfg = getStatusConfig(order.status);
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                        </span>
                    </td>
                );
            }
            case 'action': {
                const isOpen = order.status === 'OPEN';
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap">
                        {isOpen ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); openTradeModal(order); }}
                                className="px-3 py-1.5 text-xs font-bold bg-[#334155] hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-md shadow-sm hover:shadow transition-shadow whitespace-nowrap"
                            >
                                {config.counterAction.label}
                            </button>
                        ) : (
                            <span className="text-xs text-slate-400 font-medium">
                                {order.status === 'FILLED' ? 'Filled' : order.status === 'PARTIALLY_FILLED' ? 'Partial' : 'Closed'}
                            </span>
                        )}
                    </td>
                );
            }
            default:
                return <td key={col} />;
        }
    };

    // ─── Skeleton rows ────────────────────────────────────────────
    const SkeletonRows = () => (
        <>
            {[...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-slate-200/50 dark:border-slate-700/50">
                    {config.columns.map((col, ci) => (
                        <td key={ci} className="px-4 py-3">
                            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-4 w-full" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div className="h-full flex flex-col overflow-hidden" onClick={() => setShowSuggestions(false)}>
            {/* Header */}
            <div className="flex-shrink-0 px-4 lg:px-10 pt-4 lg:pt-8 pb-0">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        <div>
                            <h1 className="text-2xl lg:text-3xl v-heading">Marketplace</h1>
                            <p className="text-slate-500 mt-1 text-sm">{config.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setOrderModalSide(config.primaryAction.side)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-lg transition-colors shadow-sm hover:shadow"
                            >
                                <Plus size={16} />
                                <span>{config.primaryAction.label}</span>
                            </button>
                            <button
                                onClick={() => fetchData(false, currentSkip)}
                                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-500 transition-colors"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="v-glass p-4 mb-4 relative z-20">
                        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-3 items-end">
                            {/* Port autocomplete */}
                            <div className="relative flex-1 min-w-0">
                                <label className="v-label">Port</label>
                                <div className="relative">
                                    <Ship className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={portInput}
                                        onChange={(e) => handlePortInput(e.target.value)}
                                        className="v-input pl-10"
                                        placeholder="e.g. Singapore"
                                        autoComplete="off"
                                    />
                                </div>
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 mt-1 z-30 overflow-hidden max-h-60 overflow-y-auto">
                                        {suggestions.map(port => (
                                            <div
                                                key={port.id}
                                                className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center space-x-2 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); selectSuggestion(port.name); }}
                                            >
                                                <MapPin size={14} className="text-slate-400" />
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{port.name}, {port.country}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Delivery Window */}
                            <div className="w-full lg:w-44">
                                <label className="v-label">Window</label>
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

                            {/* Search + Filter toggle */}
                            <div className="flex gap-2">
                                <button type="submit" className="v-btn-primary whitespace-nowrap">
                                    <Search size={18} />
                                    <span>Search</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                                        showFilters
                                            ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                                            : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <Filter size={16} />
                                    {activeFilterCount > 0 && (
                                        <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">{activeFilterCount}</span>
                                    )}
                                    <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </form>

                        {/* Client-side filter panel */}
                        {showFilters && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2 duration-200">
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
                                        <option value="price_asc">Price: Low → High</option>
                                        <option value="price_desc">Price: High → Low</option>
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
                                        <X size={12} /> Clear
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Fuel chip pills */}
                    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin mb-2">
                        {FUEL_TYPES.map(ft => {
                            const isActive = fuelType === ft;
                            const count = ft === 'All' ? totalCount : (fuelCounts[ft] || 0);
                            return (
                                <button
                                    key={ft}
                                    onClick={() => handleFuelChipClick(ft)}
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer transition-all whitespace-nowrap flex-shrink-0 ${
                                        isActive
                                            ? 'bg-white/90 dark:bg-slate-700/90 text-slate-900 dark:text-white shadow-md border border-white/30 dark:border-slate-600/50'
                                            : 'bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
                                    }`}
                                >
                                    {ft}{count > 0 ? ` (${count})` : ''}
                                </button>
                            );
                        })}
                    </div>

                    {/* Result count + live badge */}
                    <div className="flex items-center gap-3 mb-3">
                        <span className="bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            {totalCount.toLocaleString()} listing{totalCount !== 1 ? 's' : ''}
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] text-slate-400">LIVE &middot; 60s</span>
                            </span>
                        </span>
                    </div>

                    {/* Tab Switcher: Orderbook vs RFQ — fluid sliding indicator */}
                    <div className="relative flex mb-3 bg-white/30 dark:bg-slate-800/30 rounded-lg p-0.5 backdrop-blur-sm border border-white/20 dark:border-slate-700/40 w-fit">
                        {/* Sliding glass indicator */}
                        <div
                            className="absolute top-0.5 bottom-0.5 rounded-md bg-white/90 dark:bg-slate-700/90 shadow-md backdrop-blur-sm border border-white/30 dark:border-slate-600/30 transition-all duration-300 ease-in-out"
                            style={{
                                left: marketTab === 'orderbook' ? '2px' : 'calc(50%)',
                                width: 'calc(50% - 2px)',
                            }}
                        />
                        <button
                            onClick={() => setMarketTab('orderbook')}
                            className={`relative z-10 px-5 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 w-24 ${
                                marketTab === 'orderbook'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            Orderbook
                        </button>
                        <button
                            onClick={() => setMarketTab('rfq')}
                            className={`relative z-10 px-5 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 w-24 ${
                                marketTab === 'rfq'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            RFQ
                        </button>
                    </div>

                </div>
            </div>

            {/* Error state */}
            {error && !loading && (
                <div className="flex-shrink-0 px-4 lg:px-10">
                    <div className="max-w-7xl mx-auto">
                        <div className="v-card p-8 flex flex-col items-center text-center">
                            <div className="p-4 bg-red-500/10 rounded-full mb-4">
                                <AlertCircle size={32} className="text-red-500" />
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">Failed to Load Listings</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-md">{error}</p>
                            <button
                                onClick={() => fetchData(false, 0)}
                                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PINNED: OrderBook + TradeTape side by side (when Orderbook tab active) */}
            {marketTab === 'orderbook' && (
                <div className="flex-shrink-0 px-4 lg:px-10 pb-3">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4">
                        <div className="md:w-3/5">
                            <OrderBook fuelType={fuelType !== 'All' ? fuelType : undefined} region={portInput || undefined} />
                        </div>
                        <div className="md:w-2/5">
                            <TradeTape fuelType={fuelType !== 'All' ? fuelType : undefined} region={portInput || undefined} />
                        </div>
                    </div>
                </div>
            )}

            {/* When RFQ tab active, show RFQPanel */}
            {marketTab === 'rfq' && (
                <div className="flex-1 overflow-y-auto px-4 lg:px-10 pb-6">
                    <div className="max-w-7xl mx-auto">
                        <RFQPanel role={role === 'SUPPLIER' ? 'SUPPLIER' : 'BUYER'} />
                    </div>
                </div>
            )}

            {/* SCROLLABLE: Listings table (only when orderbook tab) */}
            {marketTab === 'orderbook' && !error && (
                <div className="flex-1 overflow-y-auto px-4 lg:px-10 pb-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <table className="w-full border-collapse text-sm">
                                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                                    <tr>
                                        {config.columns.map((col) => (
                                            <th
                                                key={col}
                                                className={`text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500 font-semibold whitespace-nowrap ${
                                                    col === 'fuel' ? 'sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 min-w-[180px]' : ''
                                                }`}
                                            >
                                                {COLUMN_HEADERS[col]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <SkeletonRows />
                                    ) : filteredListings.length > 0 ? (
                                        filteredListings.map(order => (
                                            <tr
                                                key={order.id}
                                                className={`h-10 border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors duration-150 cursor-pointer ${getFuelRowClasses(order.fuel_type)}`}
                                            >
                                                {config.columns.map(col => renderCell(col, order))}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={config.columns.length} className="py-16 text-center">
                                                <Ship className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                                                <h3 className="text-lg font-bold text-slate-500">No listings found</h3>
                                                <p className="text-slate-400 mt-1 text-sm max-w-md mx-auto">
                                                    {role === 'BUYER'
                                                        ? 'Try broadening your filters or searching major hubs.'
                                                        : 'No open buyer requests right now. Check back soon or place an ask.'}
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {/* Pagination */}
                            {!loading && totalCount > 0 && (
                                <div className="border-t border-slate-200 dark:border-slate-700 px-4">
                                    <Pagination
                                        total={totalCount}
                                        skip={currentSkip}
                                        limit={PAGE_SIZE}
                                        onPageChange={handlePageChange}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Trade Confirmation Modal ─────────────────────────── */}
            {selectedOrder && tradeState !== 'idle' && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        {tradeState === 'success' ? (
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="p-4 bg-emerald-500/10 rounded-full mb-4">
                                    <CheckCircle2 size={28} className="text-emerald-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Trade Initiated</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {role === 'BUYER'
                                        ? 'Your order request has been sent. The supplier will review it shortly.'
                                        : 'You have successfully hit the bid. The buyer will be notified.'}
                                </p>
                            </div>
                        ) : tradeState === 'error' ? (
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="p-4 bg-red-500/10 rounded-full mb-4">
                                    <AlertCircle size={28} className="text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Trade Failed</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{tradeError}</p>
                                <button
                                    onClick={closeTradeModal}
                                    className="px-6 py-2.5 bg-slate-700 text-white text-sm font-bold rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                    <div>
                                        <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">
                                            {config.counterAction.label}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {selectedOrder.fuel_type} &middot; {selectedOrder.region}
                                        </p>
                                    </div>
                                    <button onClick={closeTradeModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Order summary */}
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Product</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {selectedOrder.product_name || selectedOrder.fuel_type} ({selectedOrder.fuel_grade})
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Price</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                ${selectedOrder.price_per_mt_usd.toLocaleString()} / MT
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Location</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {selectedOrder.delivery_point_name || selectedOrder.region}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quantity input */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity (MT)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={tradeQuantity}
                                                onChange={(e) => setTradeQuantity(Number(e.target.value))}
                                                max={selectedOrder.remaining_quantity_mt}
                                                min={1}
                                                className="w-full p-3 pl-4 pr-12 border border-slate-200 dark:border-slate-600 rounded-lg text-lg font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">MT</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 text-right">
                                            Max available: {selectedOrder.remaining_quantity_mt.toLocaleString()} MT
                                            {tradeQuantity > 0 && selectedOrder.price_per_mt_usd > 0 && (
                                                <span className="ml-2 text-emerald-500 font-bold">
                                                    Total: ${(tradeQuantity * selectedOrder.price_per_mt_usd).toLocaleString()}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                                    <button
                                        onClick={closeTradeModal}
                                        className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmTrade}
                                        disabled={tradeQuantity <= 0 || tradeQuantity > (selectedOrder?.remaining_quantity_mt ?? 0) || tradeState === 'submitting'}
                                        className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {tradeState === 'submitting' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                        <span>{tradeState === 'submitting' ? 'Submitting...' : 'Confirm'}</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Order Placement Modal ────────────────────────────── */}
            <OrderPlaceModal
                isOpen={orderModalSide !== null}
                onClose={() => { setOrderModalSide(null); fetchData(true, currentSkip); }}
                side={orderModalSide || config.primaryAction.side}
                prefillFuelType={fuelType !== 'All' ? fuelType : undefined}
                prefillRegion={portInput || undefined}
            />
        </div>
    );
};
