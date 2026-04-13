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
    ClipboardList,
    Trash2,
    Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCopilotContext } from '../context/CopilotContext';
import { api } from '../services/api';
import type { PaginatedResult } from '../services/api';
import { Port, OrderBookOrder, AvailabilityWindow, MarketProduct, MARKET_PRODUCTS } from '../types';
import { PORTS } from '../data';
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
import { useNamespace } from '../hooks/useNamespace';
import {
    getAvailabilityWindowOptions,
    normalizeAvailabilityWindow,
} from '../utils/availabilityWindow';
import { formatMarketProduct, getOrderDisplayName } from '../utils/marketProduct';
import { useWatchlist } from '../hooks/useWatchlist';
import { getWatchlistSliceKeyFromParts } from '../utils/watchlist';
import { VerdaxisSelect } from './ui/VerdaxisSelect';

// ─── Role Config ──────────────────────────────────────────────────
type ColumnId = 'fuel' | 'grade' | 'volume' | 'price' | 'window' | 'expiry' | 'cert' | 'status' | 'action';

interface RoleConfigEntry {
    fetchOrders: (params?: {
        region?: string;
        fuel_type?: string;
        market_product?: string;
        availability?: string;
        skip?: number;
        limit?: number;
    }) => Promise<PaginatedResult<any>>;
    subtitleKey: string;
    primaryAction: { labelKey: string; side: 'BID' | 'ASK' };
    counterAction: { labelKey: string };
    columns: ColumnId[];
}

const ROLE_CONFIG_BASE: Record<string, RoleConfigEntry> = {
    BUYER: {
        fetchOrders: api.orderbook.listAsksPaged,
        subtitleKey: 'marketplace.subtitle.buyer',
        primaryAction: { labelKey: 'marketplace.btn.placeBid', side: 'BID' as const },
        counterAction: { labelKey: 'marketplace.btn.hitAsk' },
        columns: ['fuel', 'grade', 'volume', 'price', 'window', 'expiry', 'cert', 'action'],
    },
    SUPPLIER: {
        fetchOrders: api.orderbook.listBidsPaged,
        subtitleKey: 'marketplace.subtitle.supplier',
        primaryAction: { labelKey: 'marketplace.btn.placeAsk', side: 'ASK' as const },
        counterAction: { labelKey: 'marketplace.btn.hitBid' },
        columns: ['fuel', 'volume', 'price', 'window', 'status', 'action'],
    },
};

// ─── Product chip options ─────────────────────────────────────────
const ALL_MARKET_PRODUCTS = 'All';
const MARKET_PRODUCT_FILTERS: Array<typeof ALL_MARKET_PRODUCTS | MarketProduct> = [ALL_MARKET_PRODUCTS, ...MARKET_PRODUCTS];
const MARKETPLACE_PRODUCT_STORAGE_KEY = 'verdaxis_marketplace_product';
const LEGACY_MARKETPLACE_FUEL_STORAGE_KEY = 'verdaxis_marketplace_fuel';

function readStoredMarketProduct(): typeof ALL_MARKET_PRODUCTS | MarketProduct {
    const stored = localStorage.getItem(MARKETPLACE_PRODUCT_STORAGE_KEY)
        ?? localStorage.getItem(LEGACY_MARKETPLACE_FUEL_STORAGE_KEY);
    return MARKET_PRODUCTS.includes(stored as MarketProduct) ? stored as MarketProduct : ALL_MARKET_PRODUCTS;
}

const PAGE_SIZE = 20;
const REFRESH_INTERVAL_MS = 60_000;

// ─── Props ────────────────────────────────────────────────────────
interface MarketplaceProps {
    initialPort?: Port | null;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ initialPort }) => {
    const { user } = useAuth();
    const { setPageContext } = useCopilotContext();
    const { t, ready } = useNamespace('trading');
    const role = user?.role ?? 'BUYER';
    const configBase = ROLE_CONFIG_BASE[role] ?? ROLE_CONFIG_BASE.BUYER;
    const { trackedSliceKeys, pinnedOrderIds, toggleSlice, togglePin } = useWatchlist();

    // ─── Column header labels (inside component to access t()) ────
    const COLUMN_HEADERS: Record<ColumnId, string> = {
        fuel: t('marketplace.col.fuel'),
        grade: t('marketplace.col.grade'),
        volume: t('marketplace.col.volume'),
        price: t('marketplace.col.price'),
        window: t('marketplace.col.window'),
        expiry: t('marketplace.col.expiry'),
        cert: t('marketplace.col.cert'),
        status: t('marketplace.col.status'),
        action: t('marketplace.col.action'),
    };

    // ─── Data state ───────────────────────────────────────────────
    const [listings, setListings] = useState<OrderBookOrder[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Filter state ─────────────────────────────────────────────
    const [portInput, setPortInput] = useState(() => initialPort?.name || localStorage.getItem('verdaxis_marketplace_port') || '');
    const [marketProduct, setMarketProduct] = useState<typeof ALL_MARKET_PRODUCTS | MarketProduct>(() => readStoredMarketProduct());
    const [availability, setAvailability] = useState<AvailabilityWindow | ''>(() => {
        const stored = localStorage.getItem('verdaxis_marketplace_window');
        return stored ? normalizeAvailabilityWindow(stored) : '';
    });
    const availabilityOptions = useMemo(() => getAvailabilityWindowOptions(), []);
    const [currentSkip, setCurrentSkip] = useState(0);

    // ─── Resolved port name (best match as user types) ─────────
    const resolvedPort = useMemo(() => {
        if (!portInput.trim()) return '';
        const q = portInput.trim().toLowerCase();
        const match = PORTS.find(p => p.name.toLowerCase() === q)
            || PORTS.find(p => p.name.toLowerCase().startsWith(q))
            || PORTS.find(p => p.name.toLowerCase().includes(q));
        return match ? match.name : '';
    }, [portInput]);

    const currentSliceTarget = useMemo(() => {
        if (marketProduct === ALL_MARKET_PRODUCTS || !resolvedPort || !availability) return null;

        const matchingOrder = listings.find((order) => (
            order.market_product === marketProduct
            && order.availability_window === availability
            && order.delivery_point_id
            && (order.delivery_point_name === resolvedPort || order.region === resolvedPort)
        ));

        if (!matchingOrder?.delivery_point_id) return null;

        return {
            marketProductCode: marketProduct,
            deliveryPointId: matchingOrder.delivery_point_id,
            availabilityWindowCode: matchingOrder.availability_window,
        };
    }, [availability, listings, marketProduct, resolvedPort]);

    const currentSliceKey = currentSliceTarget
        ? getWatchlistSliceKeyFromParts(
            currentSliceTarget.marketProductCode,
            currentSliceTarget.deliveryPointId,
            currentSliceTarget.availabilityWindowCode,
        )
        : '';
    const isCurrentSliceTracked = Boolean(currentSliceTarget) && trackedSliceKeys.has(currentSliceKey);

    // ─── Client-side filters ──────────────────────────────────────
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'quantity_desc' | 'newest'>('price_asc');
    const [showFilters, setShowFilters] = useState(false);

    // ─── Port autocomplete ────────────────────────────────────────
    const [suggestions, setSuggestions] = useState<Port[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // ─── Trade modal state ────────────────────────────────────────
    const [selectedOrder, setSelectedOrder] = useState<OrderBookOrder | null>(null);
    const [marketTab, setMarketTab] = useState<'market' | 'my_orders'>('market');
    const [myOrders, setMyOrders] = useState<OrderBookOrder[]>([]);
    const [myOrdersLoading, setMyOrdersLoading] = useState(false);
    const [tradeQuantity, setTradeQuantity] = useState(0);
    const [tradeState, setTradeState] = useState<'idle' | 'confirming' | 'submitting' | 'success' | 'error'>('idle');
    const [tradeError, setTradeError] = useState('');

    // ─── News panel toggle ──────────────────────────────────────

    // ─── Order placement modal ────────────────────────────────────
    const [orderModalSide, setOrderModalSide] = useState<'BID' | 'ASK' | null>(null);

    // ─── Fuel counts for chips ────────────────────────────────────
    const marketProductCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const order of listings) {
            const key = order.market_product;
            if (!key) continue;
            counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
    }, [listings]);

    // ─── Client-side filter + sort ────────────────────────────────
    const filteredListings = useMemo(() => {
        const result = [...listings];
        switch (sortBy) {
            case 'price_asc': result.sort((a, b) => a.price_per_mt_usd - b.price_per_mt_usd); break;
            case 'price_desc': result.sort((a, b) => b.price_per_mt_usd - a.price_per_mt_usd); break;
            case 'quantity_desc': result.sort((a, b) => b.remaining_quantity_mt - a.remaining_quantity_mt); break;
            case 'newest': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
        }
        return result;
    }, [listings, sortBy]);

    const activeFilterCount = sortBy !== 'price_asc' ? 1 : 0;

    // ─── Data fetching ────────────────────────────────────────────
    const fetchData = useCallback(async (silent = false, skip = 0) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const data = await configBase.fetchOrders({
                region: resolvedPort || undefined,
                market_product: marketProduct === ALL_MARKET_PRODUCTS ? undefined : marketProduct,
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
    }, [configBase, resolvedPort, marketProduct, availability]);

    // Fetch on mount + whenever filters change (marketProduct, portInput, availability, role)
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
                fuel_filter: marketProduct,
                region_filter: resolvedPort || 'Any',
                availability_filter: availability || 'Any',
                page_skip: currentSkip,
                summary: t(configBase.subtitleKey),
            });
        }
    }, [listings, loading, marketProduct, portInput, availability, currentSkip, role, totalCount, configBase.subtitleKey, setPageContext, t]);

    // ─── Persist filter selections to localStorage ──────────────
    useEffect(() => {
        localStorage.setItem('verdaxis_marketplace_port', portInput);
    }, [portInput]);

    useEffect(() => {
        localStorage.setItem(MARKETPLACE_PRODUCT_STORAGE_KEY, marketProduct);
        localStorage.removeItem(LEGACY_MARKETPLACE_FUEL_STORAGE_KEY);
    }, [marketProduct]);

    useEffect(() => {
        localStorage.setItem('verdaxis_marketplace_window', availability);
    }, [availability]);

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
        // Auto-select the closest matching port on Enter
        if (portInput.trim()) {
            const query = portInput.trim().toLowerCase();
            const exactMatch = PORTS.find(p => p.name.toLowerCase() === query);
            if (exactMatch) {
                setPortInput(exactMatch.name);
                setShowSuggestions(false);
                return; // useEffect will re-fetch when portInput changes
            }
            const partialMatch = PORTS.find(p => p.name.toLowerCase().startsWith(query))
                || PORTS.find(p => p.name.toLowerCase().includes(query));
            if (partialMatch) {
                setPortInput(partialMatch.name);
                setShowSuggestions(false);
                return; // useEffect will re-fetch when portInput changes
            }
            setShowSuggestions(false);
        }
        // Only manually fetch if no port resolution happened (e.g. empty input or no match)
        fetchData(false, 0);
    };

    const handlePageChange = (newSkip: number) => {
        fetchData(false, newSkip);
    };

    const handleProductChipClick = (productCode: typeof ALL_MARKET_PRODUCTS | MarketProduct) => {
        setMarketProduct(productCode);
    };

    // marketProduct changes are handled by fetchData's useCallback deps — no separate effect needed

    // ─── Trade modal handlers ─────────────────────────────────────
    const openTradeModal = (order: OrderBookOrder) => {
        setSelectedOrder(order);
        setTradeQuantity(order.remaining_quantity_mt);
        setTradeState('confirming');
        setTradeError('');
    };

    /* ---- My Orders fetch ---- */
    const fetchMyOrders = useCallback(async () => {
        setMyOrdersLoading(true);
        try {
            const data = await api.orderbook.myOrders();
            setMyOrders(Array.isArray(data) ? data : data.items ?? []);
        } catch {
            setMyOrders([]);
        } finally {
            setMyOrdersLoading(false);
        }
    }, []);

    useEffect(() => {
        if (marketTab === 'my_orders') fetchMyOrders();
    }, [marketTab, fetchMyOrders]);

    const handleCancelOrder = async (orderId: string) => {
        try {
            await api.orderbook.cancel(orderId);
            setMyOrders(prev => prev.filter(o => o.id !== orderId));
        } catch {
            // Silently fail — order may already be filled/cancelled
        }
    };

    const closeTradeModal = () => {
        setSelectedOrder(null);
        setTradeState('idle');
        setTradeError('');
    };

    const confirmTrade = async () => {
        if (!selectedOrder || tradeState === 'submitting') return;
        const normalizedTradeQuantity = Number.isFinite(tradeQuantity) ? tradeQuantity : NaN;
        if (!Number.isFinite(normalizedTradeQuantity) || normalizedTradeQuantity <= 0 || normalizedTradeQuantity > selectedOrder.remaining_quantity_mt) {
            setTradeError('Enter a valid quantity within the remaining amount.');
            setTradeState('error');
            return;
        }
        setTradeState('submitting');
        try {
            await api.trades.initiate({
                order_id: selectedOrder.id,
                quantity_mt: normalizedTradeQuantity,
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

    if (!ready) return null;

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
                                {getOrderDisplayName(order)}
                            </span>
                            {order.is_verdaxis_verified && (
                                <Shield size={12} className="text-emerald-500 flex-shrink-0" />
                            )}
                            {order.off_spec && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                    Off-spec
                                </span>
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
                            {order.certification_declared ? 'Declared cert' : 'Cert missing'}
                        </span>
                    </td>
                );
            case 'volume':
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap font-mono text-slate-700 dark:text-slate-200 text-xs">
                        {order.remaining_quantity_mt.toLocaleString()}
                    </td>
                );
            case 'price':
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap font-mono text-xs">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            ${order.price_per_mt_usd.toLocaleString()}
                        </div>
                        {order.premium_discount_per_mt_usd != null && (
                            <div className={order.premium_discount_per_mt_usd <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                {order.premium_discount_per_mt_usd < 0 ? '-' : '+'}
                                ${Math.abs(Number(order.premium_discount_per_mt_usd)).toFixed(2)}
                            </div>
                        )}
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
                const isExecutable = order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED';
                const pinnable = Boolean(order.market_product && order.delivery_point_id && order.availability_window);
                const isPinned = pinnedOrderIds.has(order.id);
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-2">
                            {isExecutable ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); openTradeModal(order); }}
                                    className="px-3 py-1.5 text-xs font-bold bg-[#334155] hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-md shadow-sm hover:shadow transition-shadow whitespace-nowrap"
                                >
                                    {t(configBase.counterAction.labelKey)}
                                </button>
                            ) : (
                                <span className="text-xs text-slate-400 font-medium">
                                    {order.status === 'FILLED'
                                        ? t('marketplace.status.filled')
                                        : order.status === 'PARTIALLY_FILLED'
                                            ? t('marketplace.status.partial')
                                            : t('marketplace.status.closed')}
                                </span>
                            )}
                            {pinnable && (
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await togglePin(order.id);
                                    }}
                                    aria-pressed={isPinned}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${isPinned ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-700 dark:border-slate-700 dark:text-slate-300'}`}
                                >
                                    <Star size={12} fill={isPinned ? 'currentColor' : 'none'} />
                                    {isPinned ? 'Pinned' : 'Pin order'}
                                </button>
                            )}
                        </div>
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
                    {configBase.columns.map((col, ci) => (
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
        <div className="h-full flex flex-col overflow-y-auto md:overflow-hidden" onClick={() => setShowSuggestions(false)}>
            {/* Header */}
            <div className="md:flex-shrink-0 px-4 lg:px-10 pt-4 lg:pt-8 pb-0">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        <div>
                            <h1 className="text-2xl lg:text-3xl v-heading">{t('marketplace.title')}</h1>
                            <p className="text-slate-500 mt-1 text-sm">{t(configBase.subtitleKey)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setOrderModalSide(configBase.primaryAction.side)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-lg transition-colors shadow-sm hover:shadow"
                            >
                                <Plus size={16} />
                                <span>{t(configBase.primaryAction.labelKey)}</span>
                            </button>
                            <button
                                onClick={() => fetchData(false, currentSkip)}
                                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-500 transition-colors"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">{t('marketplace.btn.refresh')}</span>
                            </button>
                            <button
                                onClick={async () => {
                                    if (!currentSliceTarget) return;
                                    await toggleSlice(currentSliceTarget);
                                }}
                                disabled={!currentSliceTarget}
                                aria-pressed={isCurrentSliceTracked}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${currentSliceTarget ? (isCurrentSliceTracked ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-700 dark:border-slate-700 dark:text-slate-200') : 'cursor-not-allowed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-600'}`}
                            >
                                <Star size={15} fill={isCurrentSliceTracked ? 'currentColor' : 'none'} />
                                <span>{isCurrentSliceTracked ? 'Watching slice' : 'Watch slice'}</span>
                            </button>
                        </div>
                    </div>


                    {/* Filter Bar */}
                    <div className="v-glass p-4 mb-4 relative z-20">
                        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-3 items-end">
                            {/* Port autocomplete */}
                            <div className="relative flex-1 min-w-0">
                                <label className="v-label">{t('marketplace.filter.port')}</label>
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

                            {/* Availability Window */}
                            <div className="w-full lg:w-44">
                                <label className="v-label">{t('marketplace.filter.window')}</label>
                                <VerdaxisSelect
                                    ariaLabel={t('marketplace.filter.window')}
                                    value={availability}
                                    onChange={(value) => setAvailability(value as AvailabilityWindow | '')}
                                    options={[
                                        { value: '', label: 'Any window' },
                                        ...availabilityOptions.map(option => ({ value: option.value, label: option.label })),
                                    ]}
                                    triggerClassName="v-input min-h-[42px] py-2.5"
                                />
                            </div>

                            {/* Search + Filter toggle */}
                            <div className="flex gap-2">
                                <button type="submit" className="v-btn-primary whitespace-nowrap">
                                    <Search size={18} />
                                    <span>{t('marketplace.btn.search')}</span>
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
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-end gap-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="min-w-[220px]">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('marketplace.filter.sortBy')}</label>
                                    <VerdaxisSelect
                                        ariaLabel={t('marketplace.filter.sortBy')}
                                        value={sortBy}
                                        onChange={(value) => setSortBy(value as typeof sortBy)}
                                        options={[
                                            { value: 'price_asc', label: t('marketplace.sort.priceAsc') },
                                            { value: 'price_desc', label: t('marketplace.sort.priceDesc') },
                                            { value: 'quantity_desc', label: t('marketplace.sort.largestQty') },
                                            { value: 'newest', label: t('marketplace.sort.newest') },
                                        ]}
                                        triggerClassName="min-h-[38px] px-3 py-2 text-sm"
                                    />
                                </div>
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={() => { setSortBy('price_asc'); }}
                                        className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
                                    >
                                        <X size={12} /> {t('marketplace.btn.clear')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Product chip pills */}
                    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin mb-2">
                        {MARKET_PRODUCT_FILTERS.map((productCode) => {
                            const isActive = marketProduct === productCode;
                            const count = productCode === ALL_MARKET_PRODUCTS ? totalCount : (marketProductCounts[productCode] || 0);
                            const label = productCode === ALL_MARKET_PRODUCTS ? ALL_MARKET_PRODUCTS : formatMarketProduct(productCode);
                            return (
                                <button
                                    key={productCode}
                                    onClick={() => handleProductChipClick(productCode)}
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer transition-all whitespace-nowrap flex-shrink-0 ${
                                        isActive
                                            ? 'bg-white/90 dark:bg-slate-700/90 text-slate-900 dark:text-white shadow-md border border-white/30 dark:border-slate-600/50'
                                            : 'bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
                                    }`}
                                >
                                    {label}{count > 0 ? ` (${count})` : ''}
                                </button>
                            );
                        })}
                    </div>

                    {/* Result count + live badge */}
                    <div className="flex items-center gap-3 mb-3">
                        <span className="bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            {totalCount.toLocaleString()} order{totalCount !== 1 ? 's' : ''}
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] text-slate-400">LIVE &middot; 60s</span>
                            </span>
                        </span>
                    </div>

                    {/* Tab Switcher: Market | My Orders */}
                    <div className="relative flex mb-3 bg-white/30 dark:bg-slate-800/30 rounded-lg p-0.5 backdrop-blur-sm border border-white/20 dark:border-slate-700/40 w-fit">
                        <div
                            className="absolute top-0.5 bottom-0.5 rounded-md bg-white/90 dark:bg-slate-700/90 shadow-md backdrop-blur-sm border border-white/30 dark:border-slate-600/30 transition-all duration-300 ease-in-out"
                            style={{
                                left: marketTab === 'market' ? '2px' : 'calc(50%)',
                                width: 'calc(50% - 2px)',
                            }}
                        />
                        <button
                            onClick={() => setMarketTab('market')}
                            className={`relative z-10 px-5 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 w-28 ${
                                marketTab === 'market'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            {t('marketplace.tab.market')}
                        </button>
                        <button
                            onClick={() => setMarketTab('my_orders')}
                            className={`relative z-10 px-5 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 w-28 ${
                                marketTab === 'my_orders'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="flex items-center gap-1 justify-center">
                                <ClipboardList size={12} />
                                My Orders
                            </span>
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
                            <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">{t('marketplace.error.title')}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-md">{error}</p>
                            <button
                                onClick={() => fetchData(false, 0)}
                                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                {t('marketplace.btn.tryAgain')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* My Orders tab: user's open/active orders */}
            {marketTab === 'my_orders' && (
                <div className="md:flex-1 overflow-auto px-4 lg:px-10 pb-6">
                    <div className="max-w-7xl mx-auto">
                        {myOrdersLoading ? (
                            <div className="flex items-center justify-center py-20 text-slate-400">
                                <Loader2 className="animate-spin mr-2" size={20} /> Loading your orders...
                            </div>
                        ) : myOrders.length === 0 ? (
                            <div className="text-center py-20">
                                <ClipboardList size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">No open orders</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                                    {role === 'SUPPLIER' ? 'Post supply to attract buyers' : 'Post a bid to start trading'}
                                </p>
                                <button
                                    onClick={() => setOrderModalSide(role === 'SUPPLIER' ? 'ASK' : 'BID')}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors font-medium text-sm"
                                >
                                    {role === 'SUPPLIER' ? 'Post Supply' : 'Post a Bid'}
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <table className="w-full border-collapse text-sm">
                                    <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Side</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Product</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Delivery</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Price</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Qty (MT)</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Remaining</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Window</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                                            <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myOrders.map((order) => {
                                            const isBid = order.side === 'BID';
                                            const filled = order.status === 'FILLED' || order.status === 'CANCELLED' || order.status === 'EXPIRED';
                                            return (
                                                <tr
                                                    key={order.id}
                                                    className={`border-t border-slate-100 dark:border-slate-700 ${filled ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                                >
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                                            isBid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                                        }`}>
                                                            {order.side}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                                        {getOrderDisplayName(order)}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                                                        {order.delivery_point_name || order.region}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                                        ${Number(order.price_per_mt_usd).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                                        {Number(order.quantity_mt).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                                        {Number(order.remaining_quantity_mt).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                                        {order.availability_window}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                            order.status === 'OPEN' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                                            order.status === 'PARTIALLY_FILLED' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                                                            order.status === 'FILLED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                            'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                                                        }`}>
                                                            {order.status.replaceAll('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {(order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED') && (
                                                            <button
                                                                onClick={() => handleCancelOrder(order.id)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                title="Cancel order"
                                                            >
                                                                <Trash2 size={12} />
                                                                Cancel
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="flex justify-end mt-3">
                            <button
                                onClick={fetchMyOrders}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <RefreshCw size={12} /> Refresh
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Market tab: listings table */}
            {marketTab === 'market' && !error && (
                <div className="md:flex-1 overflow-auto px-4 lg:px-10 pb-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <table className="w-full border-collapse text-sm">
                                <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800">
                                    <tr>
                                        {configBase.columns.map((col) => (
                                            <th
                                                key={col}
                                                className={`text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500 font-semibold whitespace-nowrap ${
                                                    col === 'star' ? 'w-8 px-2' :
                                                    col === 'fuel' ? 'sticky left-0 z-40 bg-slate-100 dark:bg-slate-800 min-w-[180px]' : ''
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
                                                {configBase.columns.map(col => renderCell(col, order))}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={configBase.columns.length} className="py-16 text-center">
                                                <Ship className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                                                <h3 className="text-lg font-bold text-slate-500">{t('marketplace.empty.title')}</h3>
                                                <p className="text-slate-400 mt-1 text-sm max-w-md mx-auto">
                                                    {role === 'BUYER'
                                                        ? t('marketplace.empty.buyer')
                                                        : t('marketplace.empty.supplier')}
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
                                {/* Animated success ring */}
                                <div className="relative mx-auto w-16 h-16 mb-4">
                                    <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" style={{ animationDuration: '1.5s' }} />
                                    <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                        <CheckCircle2 size={28} className="text-white" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">{t('marketplace.modal.tradeInitiated')}</h3>
                                {selectedOrder && (
                                    <div className="w-full mt-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-left">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product</span>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{getOrderDisplayName(selectedOrder)}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Port</span>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder.delivery_point_name || selectedOrder.region}</div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantity</span>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{tradeQuantity.toLocaleString()} MT</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Price</span>
                                                <div className="font-bold text-emerald-600 dark:text-emerald-400">${selectedOrder.price_per_mt_usd}/MT</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Total</span>
                                            <span className="text-base font-extrabold text-slate-900 dark:text-white">
                                                ${(tradeQuantity * selectedOrder.price_per_mt_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                                    {role === 'BUYER' ? t('marketplace.modal.tradeInitiated.buyer') : t('marketplace.modal.tradeInitiated.supplier')}
                                </p>
                            </div>
                        ) : tradeState === 'error' ? (
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="p-4 bg-red-500/10 rounded-full mb-4">
                                    <AlertCircle size={28} className="text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('marketplace.modal.tradeFailed')}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{tradeError}</p>
                                <button
                                    onClick={closeTradeModal}
                                    className="px-6 py-2.5 bg-slate-700 text-white text-sm font-bold rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                    {t('marketplace.btn.cancel')}
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                    <div>
                                        <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">
                                            {t(configBase.counterAction.labelKey)}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {getOrderDisplayName(selectedOrder)} &middot; {selectedOrder.region}
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
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.modal.product')}</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {getOrderDisplayName(selectedOrder)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.modal.price')}</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                ${selectedOrder.price_per_mt_usd.toLocaleString()} / MT
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.modal.location')}</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {selectedOrder.delivery_point_name || selectedOrder.region}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quantity input */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('marketplace.modal.quantity')}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={Number.isFinite(tradeQuantity) ? tradeQuantity : ''}
                                                onChange={(e) => setTradeQuantity(Number(e.target.value))}
                                                max={selectedOrder.remaining_quantity_mt}
                                                min={1}
                                                className="w-full p-3 pl-4 pr-12 border border-slate-200 dark:border-slate-600 rounded-lg text-lg font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">MT</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 text-right">
                                            {t('marketplace.modal.maxAvailable')} {selectedOrder.remaining_quantity_mt.toLocaleString()} MT
                                            {Number.isFinite(tradeQuantity) && tradeQuantity > 0 && selectedOrder.price_per_mt_usd > 0 && (
                                                <span className="ml-2 text-emerald-500 font-bold">
                                                    {t('marketplace.modal.total')} ${(tradeQuantity * selectedOrder.price_per_mt_usd).toLocaleString()}
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
                                        {t('marketplace.btn.cancel')}
                                    </button>
                                    <button
                                        onClick={confirmTrade}
                                        disabled={!Number.isFinite(tradeQuantity) || tradeQuantity <= 0 || tradeQuantity > (selectedOrder?.remaining_quantity_mt ?? 0) || tradeState === 'submitting'}
                                        className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {tradeState === 'submitting' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                        <span>{tradeState === 'submitting' ? t('marketplace.btn.submitting') : t('marketplace.btn.confirm')}</span>
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
                side={orderModalSide || configBase.primaryAction.side}
                prefillFuelType={marketProduct !== ALL_MARKET_PRODUCTS ? formatMarketProduct(marketProduct) : undefined}
                prefillRegion={portInput || undefined}
            />
        </div>
    );
};
