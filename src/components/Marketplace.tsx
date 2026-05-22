import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Loader2,
    MapPin,
    Shield,
    Calendar,
    RefreshCw,
    Plus,
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    Trash2,
    Star,
    Ship,
    X,
    XCircle,
    ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCopilotContext } from '../context/CopilotContext';
import { api } from '../services/api';
import type { PaginatedResult } from '../services/api';
import { Port, OrderBookOrder, AvailabilityWindow, MarketProduct, MARKET_PRODUCTS, ViewMode } from '../types';
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
import { OrderBook } from './OrderBook';
import { TradeTape } from './TradeTape';
import { BenchmarkPriceBlock } from './trading/BenchmarkPriceBlock';

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

const PAGE_SIZE = 10;
const REFRESH_INTERVAL_MS = 60_000;

// ─── Props ────────────────────────────────────────────────────────
interface MarketplaceProps {
    initialPort?: Port | null;
    viewMode?: ViewMode;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ initialPort, viewMode }) => {
    const { user } = useAuth();
    const { setPageContext } = useCopilotContext();
    const { t, ready } = useNamespace('trading');
    const role: ViewMode = user?.role === 'ADMIN'
        ? (viewMode ?? 'BUYER')
        : user?.role === 'SUPPLIER'
            ? 'SUPPLIER'
            : 'BUYER';
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
    const [filtersExpanded, setFiltersExpanded] = useState(false);
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
    const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

    // ─── Trade modal state ────────────────────────────────────────
    const [selectedOrder, setSelectedOrder] = useState<OrderBookOrder | null>(null);
    const [marketTab, setMarketTab] = useState<'market' | 'orderbook' | 'my_orders'>('market');
    const [myOrders, setMyOrders] = useState<OrderBookOrder[]>([]);
    const [myOrdersLoading, setMyOrdersLoading] = useState(false);
    const [tradeQuantity, setTradeQuantity] = useState(0);
    const [tradeState, setTradeState] = useState<'idle' | 'confirming' | 'reviewing' | 'submitting' | 'success' | 'error'>('idle');
    const [tradeError, setTradeError] = useState('');

    // ─── News panel toggle ──────────────────────────────────────

    // ─── Order placement modal ────────────────────────────────────
    const [orderModalSide, setOrderModalSide] = useState<'BID' | 'ASK' | null>(null);

    // ─── Fuel counts for chips ────────────────────────────────────
    const [marketProductCounts, setMarketProductCounts] = useState<Record<string, number>>({});

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
        let cancelled = false;

        const fetchMarketProductCounts = async () => {
            try {
                const totals = await Promise.all(
                    MARKET_PRODUCTS.map(async (productCode) => {
                        const response = await configBase.fetchOrders({
                            region: resolvedPort || undefined,
                            market_product: productCode,
                            availability: availability || undefined,
                            skip: 0,
                            limit: 1,
                        });
                        return [productCode, response.total ?? response.items?.length ?? 0] as const;
                    }),
                );

                if (cancelled) return;

                setMarketProductCounts(Object.fromEntries(totals));
            } catch {
                if (!cancelled) {
                    setMarketProductCounts({});
                }
            }
        };

        fetchMarketProductCounts();
        return () => {
            cancelled = true;
        };
    }, [availability, configBase, resolvedPort]);


    const portOptions = useMemo(() => ([
        { value: '', label: 'All ports' },
        ...PORTS.map((port) => ({ value: port.name, label: port.name, description: port.country })),
    ]), []);

    const sliceSummary = useMemo(() => {
        const parts = [
            marketProduct === ALL_MARKET_PRODUCTS ? 'All products' : formatMarketProduct(marketProduct),
            resolvedPort || 'All ports',
            availability || 'Any window',
        ];
        return parts.join(' · ');
    }, [availability, marketProduct, resolvedPort]);

    const totalMarketProductCount = useMemo(
        () => Object.values(marketProductCounts).reduce((sum, count) => sum + count, 0),
        [marketProductCounts],
    );

    const hasActiveSliceFilters = marketProduct !== ALL_MARKET_PRODUCTS || Boolean(resolvedPort) || Boolean(availability);

    const clearMarketFilters = useCallback(() => {
        setMarketProduct(ALL_MARKET_PRODUCTS);
        setPortInput('');
        setAvailability('');
        setCurrentSkip(0);
    }, []);

    const handlePageChange = (newSkip: number) => {
        fetchData(false, newSkip);
    };

    const hasExactProduct = marketProduct !== ALL_MARKET_PRODUCTS;
    const hasExactPort = Boolean(resolvedPort);
    const hasExactAvailability = Boolean(availability);
    const orderbookRequiresExactSlice = !hasExactProduct || !hasExactPort || !hasExactAvailability;
    const selectedAvailabilityLabel = availabilityOptions.find(option => option.value === availability)?.label || availability;
    const orderbookSliceRequirements = [
        {
            key: 'product',
            label: t('orderBook.requirement.product'),
            value: hasExactProduct ? formatMarketProduct(marketProduct) : t('orderBook.requirement.anyProduct'),
            complete: hasExactProduct,
        },
        {
            key: 'port',
            label: t('orderBook.requirement.port'),
            value: hasExactPort ? resolvedPort : t('orderBook.requirement.anyPort'),
            complete: hasExactPort,
        },
        {
            key: 'window',
            label: t('orderBook.requirement.window'),
            value: hasExactAvailability ? selectedAvailabilityLabel : t('orderBook.requirement.anyWindow'),
            complete: hasExactAvailability,
        },
    ];

    const handleProductChipClick = (productCode: typeof ALL_MARKET_PRODUCTS | MarketProduct) => {
        setMarketProduct(productCode);
    };

    // marketProduct changes are handled by fetchData's useCallback deps — no separate effect needed

    const handleOrderbookLevelClick = useCallback((order: OrderBookOrder) => {
        setHighlightedOrderId(order.id);
        setMarketTab('market');
    }, []);

    useEffect(() => {
        if (marketTab !== 'market' || !highlightedOrderId) return;
        const node = document.querySelector(`[data-order-id="${highlightedOrderId}"]`);
        if (!(node instanceof HTMLElement)) return;
        requestAnimationFrame(() => {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [filteredListings, highlightedOrderId, marketTab]);

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

    const outstandingMyOrders = useMemo(() => myOrders.filter((order) => (
        order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED'
    )), [myOrders]);

    const filteredMyOrders = useMemo(() => outstandingMyOrders.filter((order) => {
        if (marketProduct !== ALL_MARKET_PRODUCTS && order.market_product !== marketProduct) {
            return false;
        }

        if (availability && order.availability_window !== availability) {
            return false;
        }

        if (resolvedPort) {
            const orderPort = order.delivery_point_name || order.region || '';
            if (orderPort !== resolvedPort) {
                return false;
            }
        }

        return true;
    }), [availability, marketProduct, outstandingMyOrders, resolvedPort]);

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

    const validateTradeQuantity = () => {
        if (!selectedOrder || tradeState === 'submitting') return null;
        const normalizedTradeQuantity = Number.isFinite(tradeQuantity) ? tradeQuantity : NaN;
        if (!Number.isFinite(normalizedTradeQuantity) || normalizedTradeQuantity <= 0 || normalizedTradeQuantity > selectedOrder.remaining_quantity_mt) {
            setTradeError('Enter a valid quantity within the remaining amount.');
            setTradeState('error');
            return null;
        }
        return normalizedTradeQuantity;
    };

    const reviewTrade = () => {
        if (!selectedOrder) return;
        if (selectedOrder.is_demo_listing) {
            setTradeError(t('marketplace.demo.blocked'));
            setTradeState('error');
            return;
        }
        if (validateTradeQuantity() == null) return;
        setTradeError('');
        setTradeState('reviewing');
    };

    const confirmTrade = async () => {
        if (!selectedOrder || tradeState === 'submitting') return;
        if (selectedOrder.is_demo_listing) {
            setTradeError(t('marketplace.demo.blocked'));
            setTradeState('error');
            return;
        }
        const normalizedTradeQuantity = validateTradeQuantity();
        if (normalizedTradeQuantity == null) return;
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
                            {order.is_demo_listing && (
                                <span
                                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                                    title={t('marketplace.demo.tooltip')}
                                >
                                    <AlertCircle size={11} />
                                    {t('marketplace.demo.label')}
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
                        <BenchmarkPriceBlock
                            priceUsd={Number(order.price_per_mt_usd)}
                            benchmarkUsd={order.benchmark_price_per_mt_usd == null ? null : Number(order.benchmark_price_per_mt_usd)}
                            deltaUsd={order.premium_discount_per_mt_usd == null ? null : Number(order.premium_discount_per_mt_usd)}
                        />
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
                                    type="button"
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
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await togglePin(order.id);
                                    }}
                                    aria-pressed={isPinned}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${isPinned ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-700 dark:border-slate-700 dark:text-slate-300'}`}
                                >
                                    <Star size={12} fill={isPinned ? 'currentColor' : 'none'} />
                                    {isPinned ? t('marketplace.btn.pinned') : t('marketplace.btn.pinToWatchlist')}
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
        <div className="h-full flex flex-col overflow-y-auto md:overflow-hidden">
            {/* Header */}
            <div className="md:flex-shrink-0 px-4 lg:px-10 pt-4 lg:pt-8 pb-0 relative z-[80]">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        <div>
                            <h1 className="text-2xl lg:text-3xl v-heading">{t('marketplace.title')}</h1>
                            <p className="text-slate-500 mt-1 text-sm">{t(configBase.subtitleKey)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setOrderModalSide(configBase.primaryAction.side)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-lg transition-colors shadow-sm hover:shadow"
                            >
                                <Plus size={16} />
                                <span>{t(configBase.primaryAction.labelKey)}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => fetchData(false, currentSkip)}
                                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-500 transition-colors"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">{t('marketplace.btn.refresh')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!currentSliceTarget) return;
                                    await toggleSlice(currentSliceTarget);
                                }}
                                disabled={!currentSliceTarget}
                                aria-pressed={isCurrentSliceTracked}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${currentSliceTarget ? (isCurrentSliceTracked ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-700 dark:border-slate-700 dark:text-slate-200') : 'cursor-not-allowed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-600'}`}
                            >
                                <Star size={15} fill={isCurrentSliceTracked ? 'currentColor' : 'none'} />
                                <span>{isCurrentSliceTracked ? t('marketplace.btn.watchingMarket') : t('marketplace.btn.watchMarket')}</span>
                            </button>
                        </div>
                    </div>


                    {/* Unified filter rail */}
                    <div className="v-glass p-4 mb-4 relative z-[90]">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('marketplace.metrics.products')}</span>
                                        <span className="text-xs text-slate-400">{t('marketplace.metrics.productsHint')}</span>
                                    </div>
                                    <div className="flex flex-1 flex-wrap gap-2">
                                        {MARKET_PRODUCT_FILTERS.map((productCode) => {
                                            const isActive = marketProduct === productCode;
                                            const count = productCode === ALL_MARKET_PRODUCTS ? totalMarketProductCount : (marketProductCounts[productCode] || 0);
                                            const label = productCode === ALL_MARKET_PRODUCTS ? ALL_MARKET_PRODUCTS : formatMarketProduct(productCode);
                                            return (
                                                <button
                                                    type="button"
                                                    key={productCode}
                                                    onClick={() => handleProductChipClick(productCode)}
                                                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap ${
                                                        isActive
                                                            ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
                                                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                                                    }`}
                                                >
                                                    {label}{count > 0 ? ` (${count})` : ''}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setFiltersExpanded((expanded) => !expanded)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
                                >
                                    <span>{filtersExpanded ? t('marketplace.filter.hide') : t('marketplace.filter.more')}</span>
                                    <ChevronDown size={14} className={`transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {filtersExpanded && (
                                <>
                                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-[minmax(220px,1.2fr)_minmax(180px,0.9fr)_minmax(200px,0.9fr)_minmax(170px,0.8fr)]">
                                        <div>
                                            <label className="v-label">{t('marketplace.filter.port')}</label>
                                            <VerdaxisSelect
                                                ariaLabel={t('marketplace.filter.port')}
                                                value={portInput}
                                                onChange={setPortInput}
                                                options={portOptions}
                                                triggerClassName="v-input min-h-[42px] py-2.5"
                                            />
                                        </div>
                                        <div>
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
                                        <div>
                                            <label className="v-label">{t('marketplace.filter.sortBy')}</label>
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
                                                triggerClassName="v-input min-h-[42px] py-2.5"
                                            />
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('marketplace.metrics.currentSlice')}</div>
                                            <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                {totalCount.toLocaleString()} {t(totalCount === 1 ? 'marketplace.metrics.currentSliceCountOne' : 'marketplace.metrics.currentSliceCountOther')}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-400">{sliceSummary}</div>
                                            <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                {t('marketplace.metrics.currentSliceHint')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                {sliceSummary}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                                            <span className="font-bold uppercase tracking-[0.14em]">{t('marketplace.legend.title')}</span>
                                            <span className="ml-2">{t('marketplace.legend.body')}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Tab Switcher: Market | Orderbook | My Listings */}
                    <div className="relative mb-3 grid w-full max-w-[420px] grid-cols-3 rounded-lg border border-white/20 bg-white/30 p-0.5 backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-800/30">
                        <div
                            className="absolute top-0.5 bottom-0.5 rounded-md bg-white/90 dark:bg-slate-700/90 shadow-md backdrop-blur-sm border border-white/30 dark:border-slate-600/30 transition-all duration-300 ease-in-out"
                            style={{
                                left: marketTab === 'market'
                                    ? '2px'
                                    : marketTab === 'orderbook'
                                        ? 'calc(33.333% + 1px)'
                                        : 'calc(66.666% + 1px)',
                                width: 'calc(33.333% - 2px)',
                            }}
                        />
                        <button
                            onClick={() => setMarketTab('market')}
                            className={`relative z-10 min-w-0 px-4 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 ${
                                marketTab === 'market'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            {t('marketplace.tab.market')}
                        </button>
                        <button
                            onClick={() => setMarketTab('orderbook')}
                            className={`relative z-10 min-w-0 px-4 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 ${
                                marketTab === 'orderbook'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            {t('marketplace.tab.listings')}
                        </button>
                        <button
                            onClick={() => setMarketTab('my_orders')}
                            className={`relative z-10 min-w-0 px-4 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 ${
                                marketTab === 'my_orders'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="flex items-center gap-1 justify-center">
                                <ClipboardList size={12} />
                                {t('marketplace.tab.myOrders')}
                            </span>
                        </button>
                    </div>

                    <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                        {marketTab === 'market'
                            ? t(role === 'BUYER' ? 'marketplace.viewHint.listings.buyer' : 'marketplace.viewHint.listings.supplier')
                            : marketTab === 'orderbook'
                                ? t('marketplace.viewHint.orderbook')
                                : t('marketplace.viewHint.myOrders')}
                    </p>

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

            {marketTab === 'orderbook' && !error && (
                <div className="md:flex-1 overflow-auto px-4 lg:px-10 pb-6">
                    <div className="max-w-[1600px] mx-auto">
                        <div className="min-h-[520px]">
                            {orderbookRequiresExactSlice ? (
                                <div className="v-card p-10 flex flex-col items-center justify-center text-center min-h-[520px]">
                                    <Ship size={44} className="text-slate-300 dark:text-slate-600 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">{t('orderBook.selectProduct.title')}</h3>
                                    <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{t('orderBook.selectProduct.body')}</p>
                                        <div className="mt-6 w-full max-w-md space-y-2 text-left">
                                            {orderbookSliceRequirements.map((requirement) => {
                                                const Icon = requirement.complete ? CheckCircle2 : XCircle;
                                                return (
                                                    <div
                                                        key={requirement.key}
                                                        aria-label={`${requirement.label}: ${requirement.complete ? t('orderBook.requirement.selected') : t('orderBook.requirement.missing')} (${requirement.value})`}
                                                        className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
                                                            requirement.complete
                                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                                                                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
                                                        }`}
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">
                                                                {requirement.label}
                                                            </div>
                                                            <div className="mt-0.5 truncate text-sm font-bold">
                                                                {requirement.value}
                                                            </div>
                                                        </div>
                                                        <Icon size={20} className="flex-shrink-0" aria-hidden="true" />
                                                        <span className="sr-only">
                                                            {requirement.complete ? t('orderBook.requirement.selected') : t('orderBook.requirement.missing')}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                </div>
                            ) : (
                                <div className="grid min-h-[520px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.62fr)_minmax(360px,0.38fr)]">
                                    <OrderBook
                                        marketProduct={marketProduct}
                                        region={resolvedPort || undefined}
                                        availability={availability || undefined}
                                        actionableSide={role === 'BUYER' ? 'ASK' : 'BID'}
                                        onLevelClick={handleOrderbookLevelClick}
                                    />
                                    <TradeTape
                                        marketProduct={marketProduct}
                                        availability={availability || undefined}
                                        region={resolvedPort || undefined}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* My Listings tab: user's outstanding orders */}
            {marketTab === 'my_orders' && (
                <div className="md:flex-1 overflow-auto px-4 lg:px-10 pb-6">
                    <div className="max-w-7xl mx-auto">
                        {myOrdersLoading ? (
                            <div className="flex items-center justify-center py-20 text-slate-400">
                                <Loader2 className="animate-spin mr-2" size={20} /> {t('marketplace.myOrders.loading')}
                            </div>
                        ) : outstandingMyOrders.length === 0 ? (
                            <div className="text-center py-20">
                                <ClipboardList size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">{t('marketplace.myOrders.empty.none.title')}</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                                    {role === 'SUPPLIER'
                                        ? t('marketplace.myOrders.empty.none.supplier')
                                        : t('marketplace.myOrders.empty.none.buyer')}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setOrderModalSide(role === 'SUPPLIER' ? 'ASK' : 'BID')}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors font-medium text-sm"
                                >
                                    {role === 'SUPPLIER' ? t('marketplace.btn.placeAsk') : t('marketplace.btn.placeBid')}
                                </button>
                            </div>
                        ) : filteredMyOrders.length === 0 ? (
                            <div className="text-center py-20">
                                <ClipboardList size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">{t('marketplace.myOrders.empty.filtered.title')}</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                                    {t('marketplace.myOrders.empty.filtered.body', { slice: sliceSummary })}
                                </p>
                                {hasActiveSliceFilters && (
                                    <button
                                        onClick={clearMarketFilters}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors font-medium text-sm"
                                    >
                                        {t('marketplace.btn.clear')}
                                    </button>
                                )}
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
                                        {filteredMyOrders.map((order) => {
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
                                                                type="button"
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
                                                data-order-id={order.id}
                                                className={`h-10 border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors duration-150 cursor-pointer ${getFuelRowClasses(order.fuel_type)} ${highlightedOrderId === order.id ? 'ring-2 ring-emerald-400/70 bg-emerald-50/70 dark:bg-emerald-950/20' : ''}`}
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
                                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                                    <CheckCircle2 size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{t('marketplace.modal.tradeInitiated')}</h3>
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
                                            <span className="text-base font-bold text-slate-900 dark:text-white">
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
                                    type="button"
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
                                        <h3 className="text-xl font-bold text-[#334155] dark:text-white">
                                            {t(configBase.counterAction.labelKey)}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {getOrderDisplayName(selectedOrder)} &middot; {selectedOrder.region}
                                        </p>
                                    </div>
                                    <button type="button" aria-label="Close trade modal" onClick={closeTradeModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-5">
                                    {selectedOrder.is_demo_listing && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="text-sm font-bold">{t('marketplace.demo.modalTitle')}</div>
                                                    <p className="mt-1 text-xs leading-5">{t('marketplace.demo.modalBody')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Order summary */}
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.modal.product')}</span>
                                            <span className="flex items-center gap-2 text-right font-bold text-slate-800 dark:text-slate-200">
                                                {selectedOrder.is_demo_listing && (
                                                    <AlertCircle size={14} className="text-amber-500" aria-label={t('marketplace.demo.label')} />
                                                )}
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
                                                disabled={tradeState === 'reviewing' || tradeState === 'submitting' || selectedOrder.is_demo_listing}
                                                className="w-full p-3 pl-4 pr-12 border border-slate-200 dark:border-slate-600 rounded-lg text-lg font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900 dark:disabled:text-slate-400"
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
                                    {tradeState === 'reviewing' && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="font-bold">{t('marketplace.confirm.title')}</div>
                                                    <p className="mt-1 text-xs leading-5">{t('marketplace.confirm.body')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                                    <button
                                        type="button"
                                        onClick={tradeState === 'reviewing' ? () => setTradeState('confirming') : closeTradeModal}
                                        className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-white transition-colors"
                                    >
                                        {tradeState === 'reviewing' ? t('marketplace.btn.back') : t('marketplace.btn.cancel')}
                                    </button>
                                    {selectedOrder.is_demo_listing ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="px-6 py-2.5 bg-amber-100 text-amber-700 border border-amber-200 font-bold rounded-lg flex items-center gap-2 disabled:cursor-not-allowed dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
                                        >
                                            <AlertCircle size={18} />
                                            <span>{t('marketplace.demo.disabledButton')}</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={tradeState === 'reviewing' ? confirmTrade : reviewTrade}
                                            disabled={!Number.isFinite(tradeQuantity) || tradeQuantity <= 0 || tradeQuantity > (selectedOrder?.remaining_quantity_mt ?? 0) || tradeState === 'submitting'}
                                            className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {tradeState === 'submitting' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                            <span>
                                                {tradeState === 'submitting'
                                                    ? t('marketplace.btn.submitting')
                                                    : tradeState === 'reviewing'
                                                        ? t('marketplace.btn.confirmFinal')
                                                        : t('marketplace.btn.confirm')}
                                            </span>
                                        </button>
                                    )}
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
                prefillMarketProduct={marketProduct !== ALL_MARKET_PRODUCTS ? marketProduct : undefined}
                prefillDeliveryPointId={currentSliceTarget?.deliveryPointId}
                prefillAvailabilityWindow={availability || undefined}
            />
        </div>
    );
};
