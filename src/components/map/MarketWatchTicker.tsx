import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Activity, Check, FlaskConical, RefreshCw, Settings2, WifiOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PORTS as FALLBACK_PORTS } from '../../data';
import { useNamespace } from '../../hooks/useNamespace';
import { useServerPreference } from '../../hooks/useServerPreference';
import { api } from '../../services/api';
import type { AggregatedOrderbook, DeliveryPoint, MarketProduct, Port, PriceSummary } from '../../types';
import { formatAvailabilityWindow } from '../../utils/availabilityWindow';
import { buildDemoMarketQuotes, type DemoMarketQuote } from '../../utils/demoMarketQuotes';
import { ACTIVE_MARKETPLACE_PRODUCT_OPTIONS } from '../../utils/marketProducts';
import { formatMarketProduct } from '../../utils/marketProduct';
import { filterApprovedTradingPorts } from '../../utils/tradingPorts';

interface MarketWatchTickerProps {
    isPanelOpen: boolean;
    onOpenPanel: () => void;
    ports?: Port[];
    aggregatedData?: AggregatedOrderbook[];
}

type RowStatus = 'LOADING' | 'LIVE' | 'STALE' | 'DEMO' | 'REFERENCE' | 'MIXED' | 'UNAVAILABLE';
type HeaderStatus = 'LOADING' | 'LIVE' | 'MIXED' | 'DEMO' | 'REFERENCE' | 'UNAVAILABLE';

interface TickerPreferences {
    products: MarketProduct[];
    portIds: string[];
}

interface TickerRow {
    key: string;
    port: Port;
    product: MarketProduct;
    value: string;
    change: string;
    up: boolean;
    status: RowStatus;
}

const MARKET_WATCH_PREFERENCES_KEY = 'verdaxis_market_watch_preferences_v1';
const DEFAULT_PINNED_PORT_NAMES = ['Rotterdam', 'Singapore', 'Santos', 'Houston', 'Shanghai'];
const DEFAULT_PINNED_PORT_COUNT = 5;
const MIN_AUTO_SCROLL_ROWS = 4;
const EMPTY_AGGREGATED_DATA: AggregatedOrderbook[] = [];

const DEMO_PREVIEW_PRICES: Record<MarketProduct, number> = {
    BIO_METHANOL: 960,
    E_METHANOL: 1150,
    BIO_ETHANOL: 850,
    SYNTHETIC_ETHANOL: 1240,
};

const productValues = ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.map(option => option.value);
const DEFAULT_PRODUCTS = productValues;

const normalize = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

const currency = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return '--';
    return `$${value.toFixed(0)}`;
};

const getPortLabel = (port: Port) => port.name;
const countLabel = (
    t: ReturnType<typeof useNamespace>['t'],
    key: string,
    count: number
) => t(`marketWatch.${key}.${count === 1 ? 'one' : 'other'}`, { count });
const getCatalogDeliveryPointId = (port: Port, deliveryPoints: DeliveryPoint[]) => (
    deliveryPoints.find(point => normalize(point.name) === normalize(port.name))?.id ?? null
);

const getDefaultPortIds = (availablePorts: Port[]) => {
    const namedDefaults = DEFAULT_PINNED_PORT_NAMES
        .map(name => availablePorts.find(port => normalize(port.name) === normalize(name))?.id)
        .filter((id): id is string => Boolean(id));

    const fallbackIds = availablePorts.map(port => port.id);
    return Array.from(new Set([...namedDefaults, ...fallbackIds])).slice(0, DEFAULT_PINNED_PORT_COUNT);
};

const getDefaultPreferences = (availablePorts: Port[]): TickerPreferences => ({
    products: DEFAULT_PRODUCTS,
    portIds: getDefaultPortIds(availablePorts),
});

const sanitizePreferences = (value: unknown, availablePorts: Port[]): TickerPreferences | null => {
    if (value == null) return getDefaultPreferences(availablePorts);
    if (typeof value !== 'object' || Array.isArray(value)) return null;

    const data = value as Partial<TickerPreferences> & { product?: unknown };
    const rawProducts = Array.isArray(data.products)
        ? data.products
        : typeof data.product === 'string'
            ? [data.product]
            : DEFAULT_PRODUCTS;
    const products = Array.from(new Set(
        rawProducts.filter((product): product is MarketProduct => (
            typeof product === 'string' && productValues.includes(product as MarketProduct)
        ))
    ));
    const allowedPortIds = new Set(availablePorts.map(port => port.id));
    const rawPortIds = Array.isArray(data.portIds) ? data.portIds : [];
    const portIds = Array.from(new Set(
        rawPortIds.filter((id): id is string => typeof id === 'string' && allowedPortIds.has(id))
    ));

    return {
        products: products.length > 0 ? products : DEFAULT_PRODUCTS,
        portIds: portIds.length > 0 ? portIds : getDefaultPortIds(availablePorts),
    };
};

const findMatchingSummary = (summaries: PriceSummary[], product: MarketProduct, deliveryPointId: string) => {
    return summaries.find(summary => (
        summary.market_product === product
        && summary.delivery_point_id === deliveryPointId
        && normalize(summary.availability_window) === 'spot'
    ));
};

const getSummaryPrice = (summary: PriceSummary) => {
    const lastPrice = Number(summary.last_price);
    if (Number.isFinite(lastPrice) && lastPrice > 0) return lastPrice;
    const avgPrice = Number(summary.avg_price_24h);
    return Number.isFinite(avgPrice) && avgPrice > 0 ? avgPrice : null;
};

const getSummaryStatus = (summary: PriceSummary): RowStatus => {
    if (summary.source_kind === 'MIXED_SOURCE' || summary.demo_status === 'MIXED') {
        return 'MIXED';
    }
    if (summary.source_kind === 'DEMO_SEED' || summary.demo_status === 'DEMO_ONLY') {
        return 'DEMO';
    }
    if (summary.is_reference || summary.source_kind === 'BENCHMARK_REFERENCE') {
        return 'REFERENCE';
    }
    if (summary.source_kind === 'NO_DATA') return 'UNAVAILABLE';
    const liveSource = summary.source_kind === 'LIVE_ORDER' || summary.source_kind === 'CONFIRMED_TRADE';
    if (!liveSource) return 'STALE';
    const observedAt = summary.observed_at || summary.last_trade_at;
    if (!observedAt) return 'STALE';
    const timestamp = Date.parse(observedAt);
    if (!Number.isFinite(timestamp)) return 'STALE';
    const hoursOld = (Date.now() - timestamp) / (1000 * 60 * 60);
    return hoursOld <= 24 ? 'LIVE' : 'STALE';
};

const buildDemoRow = (port: Port, product: MarketProduct, language: string, quote?: DemoMarketQuote): TickerRow => {
    return {
        key: `${product}-${port.id}`,
        port,
        product,
        value: currency(quote?.price ?? DEMO_PREVIEW_PRICES[product]),
        change: quote ? formatAvailabilityWindow(quote.availabilityWindow, language) : 'Preview',
        up: true,
        status: 'DEMO',
    };
};

const buildLoadingRow = (port: Port, product: MarketProduct): TickerRow => ({
    key: `${product}-${port.id}`,
    port,
    product,
    value: '...',
    change: '--',
    up: true,
    status: 'LOADING',
});

const buildSummaryRow = (port: Port, product: MarketProduct, summary: PriceSummary): TickerRow | null => {
    const price = getSummaryPrice(summary);
    if (price == null) return null;

    const changePct = summary.price_change_pct == null ? null : Number(summary.price_change_pct);
    return {
        key: `${product}-${port.id}`,
        port,
        product,
        value: currency(price),
        change: changePct != null && Number.isFinite(changePct)
            ? `${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}%`
            : `${summary.trade_count_24h || 0}`,
        up: changePct == null || !Number.isFinite(changePct) ? true : changePct >= 0,
        status: getSummaryStatus(summary),
    };
};

export const MarketWatchTicker: React.FC<MarketWatchTickerProps> = ({
    isPanelOpen,
    onOpenPanel,
    ports,
    aggregatedData = EMPTY_AGGREGATED_DATA,
}) => {
    const { t, ready } = useNamespace('dashboard');
    const { i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || 'en';
    const editorId = useId();
    const titleId = useId();
    const helpId = useId();
    const editorRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const didMountPreferencesRef = useRef(false);
    const availablePorts = useMemo(() => (
        filterApprovedTradingPorts(ports?.length ? ports : FALLBACK_PORTS)
    ), [ports]);
    const defaultPreferences = useMemo(() => getDefaultPreferences(availablePorts), [availablePorts]);
    const sanitizeTickerPreferences = useCallback((raw: unknown) => (
        sanitizePreferences(raw, availablePorts)
    ), [availablePorts]);
    const [preferences, setPreferences] = useServerPreference<TickerPreferences>(
        'market_watch',
        MARKET_WATCH_PREFERENCES_KEY,
        sanitizeTickerPreferences,
        defaultPreferences,
    );
    const [rows, setRows] = useState<TickerRow[]>([]);
    const [editorOpen, setEditorOpen] = useState(false);
    const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[] | null>(null);
    const closeEditor = useCallback((restoreFocus = false) => {
        setEditorOpen(false);
        if (restoreFocus) {
            window.setTimeout(() => triggerRef.current?.focus(), 0);
        }
    }, []);

    useEffect(() => {
        if (!didMountPreferencesRef.current) {
            didMountPreferencesRef.current = true;
            return;
        }
        setPreferences(current => sanitizePreferences(current, availablePorts) ?? defaultPreferences);
    }, [availablePorts, defaultPreferences, setPreferences]);

    useEffect(() => {
        let cancelled = false;
        const loadDeliveryPoints = async () => {
            try {
                const response = await api.catalog.deliveryPoints();
                if (!cancelled) {
                    setDeliveryPoints(filterApprovedTradingPorts(response.filter(point => point.is_active !== false)));
                }
            } catch (error) {
                console.warn('Market watch delivery points unavailable', error);
                if (!cancelled) setDeliveryPoints([]);
            }
        };

        loadDeliveryPoints();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!editorOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (editorRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            closeEditor(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            closeEditor(true);
        };

        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        window.setTimeout(() => {
            editorRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
        }, 0);

        return () => {
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeEditor, editorOpen]);

    const selectedPorts = useMemo(() => preferences.portIds
        .map(portId => availablePorts.find(port => port.id === portId))
        .filter((port): port is Port => Boolean(port)), [availablePorts, preferences.portIds]);

    const selectedProducts = useMemo(() => preferences.products.filter(product => (
        productValues.includes(product)
    )), [preferences.products]);
    const demoQuotes = useMemo(() => buildDemoMarketQuotes(aggregatedData), [aggregatedData]);

    useEffect(() => {
        let cancelled = false;
        const loadRows = async () => {
            const slices = selectedPorts.flatMap(port => selectedProducts.map(product => ({ port, product })));
            setRows(slices.map(({ port, product }) => buildLoadingRow(port, product)));
            if (deliveryPoints === null) return;
            const summariesByProduct = new Map<MarketProduct, PriceSummary[]>();
            await Promise.all(selectedProducts.map(async product => {
                try {
                    const response = await api.prices.getSummaries({
                        market_product: product,
                        availability_window: 'SPOT',
                        hours: 168,
                    });
                    summariesByProduct.set(product, response.summaries ?? []);
                } catch (error) {
                    console.warn('Market watch price summary unavailable', error);
                    summariesByProduct.set(product, []);
                }
            }));

            const nextRows = slices.map(({ port, product }) => {
                const deliveryPointId = getCatalogDeliveryPointId(port, deliveryPoints);
                const summary = deliveryPointId
                    ? findMatchingSummary(summariesByProduct.get(product) ?? [], product, deliveryPointId)
                    : undefined;
                const summaryRow = summary ? buildSummaryRow(port, product, summary) : null;
                const demoQuote = demoQuotes.find(quote => (
                    quote.product === product && normalize(quote.port) === normalize(port.name)
                ));
                return summaryRow ?? buildDemoRow(port, product, language, demoQuote);
            });
            if (!cancelled) setRows(nextRows);
        };

        loadRows();
        return () => {
            cancelled = true;
        };
    }, [deliveryPoints, demoQuotes, language, selectedPorts, selectedProducts]);

    const headerStatus: HeaderStatus = useMemo(() => {
        if (rows.length === 0 || rows.some(row => row.status === 'LOADING')) return 'LOADING';
        if (rows.every(row => row.status === 'LIVE')) return 'LIVE';
        if (rows.some(row => row.status === 'LIVE')) return 'MIXED';
        if (rows.every(row => row.status === 'DEMO')) return 'DEMO';
        if (rows.every(row => row.status === 'REFERENCE')) return 'REFERENCE';
        if (rows.every(row => row.status === 'UNAVAILABLE')) return 'UNAVAILABLE';
        return 'MIXED';
    }, [rows]);

    const togglePort = (portId: string) => {
        setPreferences(current => {
            if (current.portIds.includes(portId)) {
                const nextIds = current.portIds.filter(id => id !== portId);
                return { ...current, portIds: nextIds.length > 0 ? nextIds : current.portIds };
            }
            return { ...current, portIds: [...current.portIds, portId] };
        });
    };

    const toggleProduct = (product: MarketProduct) => {
        setPreferences(current => {
            if (current.products.includes(product)) {
                const nextProducts = current.products.filter(item => item !== product);
                return { ...current, products: nextProducts.length > 0 ? nextProducts : current.products };
            }
            return { ...current, products: [...current.products, product] };
        });
    };

    const statusLabel = (status: RowStatus) => {
        if (status === 'LIVE') return t('marketWatch.source.live');
        if (status === 'STALE') return t('marketWatch.source.stale');
        if (status === 'DEMO') return t('marketWatch.source.demo');
        if (status === 'REFERENCE') return t('marketWatch.source.reference');
        if (status === 'MIXED') return t('marketWatch.source.mixed');
        if (status === 'UNAVAILABLE') return t('marketWatch.source.unavailable');
        return t('marketWatch.connecting');
    };

    const headerStatusLabel = (status: HeaderStatus) => {
        if (status === 'LIVE') return t('marketWatch.liveFeed');
        if (status === 'MIXED') return t('marketWatch.mixed');
        if (status === 'DEMO') return t('marketWatch.demo');
        if (status === 'REFERENCE') return t('marketWatch.reference');
        if (status === 'UNAVAILABLE') return t('marketWatch.offline');
        return t('marketWatch.connecting');
    };

    if (!ready) return null;

    const shouldAutoScroll = rows.length >= MIN_AUTO_SCROLL_ROWS;
    const repeatedRows = shouldAutoScroll ? [...rows, ...rows] : rows;
    const scrollDuration = `${Math.max(55, rows.length * 3.5)}s`;

    const rowChip = (row: TickerRow, duplicateIndex: number) => (
        <div
            key={`${row.key}-${duplicateIndex}`}
            className="verdaxis-market-watch-chip flex min-w-fit items-center gap-2 whitespace-nowrap rounded-md border border-slate-200/70 bg-slate-50/80 px-2.5 py-1 dark:border-slate-700/80 dark:bg-slate-950/40"
        >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                {getPortLabel(row.port)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {formatMarketProduct(row.product)}
            </span>
            <span className={`text-sm font-bold tabular-nums ${
                row.status === 'UNAVAILABLE' || row.status === 'LOADING'
                    ? 'text-slate-400 dark:text-slate-500'
                    : row.status === 'DEMO'
                        ? 'text-amber-700 dark:text-amber-300'
                        : row.status === 'MIXED'
                            ? 'text-orange-700 dark:text-orange-300'
                        : row.status === 'REFERENCE' || row.status === 'STALE'
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-sky-700 dark:text-sky-300'
            }`}>
                {row.value}
            </span>
            {row.change && row.status !== 'UNAVAILABLE' && row.status !== 'LOADING' && (
                <span className={`text-xs font-bold ${row.up ? 'text-green-500' : 'text-red-500'}`}>
                    {row.change === 'Preview' ? t('marketWatch.preview') : row.change}
                </span>
            )}
            <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                row.status === 'LIVE'
                    ? 'bg-green-500/10 text-green-600'
                    : row.status === 'DEMO'
                        ? 'bg-amber-500/10 text-amber-600'
                        : row.status === 'MIXED'
                            ? 'bg-orange-500/10 text-orange-600'
                        : row.status === 'UNAVAILABLE'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-blue-500/10 text-blue-500'
            }`}>
                {statusLabel(row.status)}
            </span>
        </div>
    );

    return (
        <div className="relative w-full max-w-full rounded-lg border border-slate-200 bg-white/95 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
            <div className="flex h-11 items-center">
                <div className="flex h-full min-w-fit items-center gap-2 border-r border-slate-200 px-3 dark:border-slate-700">
                        {headerStatus === 'LIVE' && <Activity size={18} className="text-green-600" />}
                        {headerStatus === 'MIXED' && <FlaskConical size={18} className="text-blue-500" />}
                        {headerStatus === 'REFERENCE' && <FlaskConical size={18} className="text-blue-500" />}
                        {headerStatus === 'DEMO' && <FlaskConical size={18} className="text-amber-500" />}
                        {headerStatus === 'LOADING' && <RefreshCw size={18} className="text-verdaxis animate-spin" />}
                        {headerStatus === 'UNAVAILABLE' && <WifiOff size={18} className="text-red-500" />}

                        <div>
                            <span className="block whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                {t('marketWatch.title')}
                            </span>
                            <span className="block max-w-[180px] truncate whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {countLabel(t, 'productsCount', selectedProducts.length)} · {countLabel(t, 'pinnedCount', selectedPorts.length)} · {headerStatusLabel(headerStatus)}
                            </span>
                        </div>
                    </div>

                <div className="verdaxis-market-watch-strip min-w-0 flex-1 overflow-hidden" tabIndex={0} aria-label={t('marketWatch.scrollArea')}>
                    <div
                        className={`verdaxis-market-watch-track flex w-max items-center gap-2 px-3 ${shouldAutoScroll ? 'verdaxis-market-watch-track--scrolling' : ''}`}
                        style={{ '--verdaxis-market-watch-duration': scrollDuration } as React.CSSProperties}
                    >
                        {repeatedRows.map((row, index) => rowChip(row, index))}
                    </div>
                </div>

                <div className="flex h-full shrink-0 items-center gap-1 border-l border-slate-200 bg-white/95 px-2 dark:border-slate-700 dark:bg-slate-900/95">
                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={() => setEditorOpen(current => !current)}
                        className="flex min-w-fit items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:border-emerald-500/40 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 dark:border-slate-700 dark:text-slate-300"
                        aria-expanded={editorOpen}
                        aria-controls={editorId}
                        aria-label={t('marketWatch.configure')}
                    >
                        <Settings2 size={13} />
                        <span className="hidden lg:inline">{t('marketWatch.configureShort')}</span>
                    </button>

                    {!isPanelOpen && (
                        <button
                            type="button"
                            onClick={onOpenPanel}
                            className="hidden min-w-fit text-[10px] font-bold uppercase tracking-wider text-verdaxis hover:text-verdaxis-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 xl:inline"
                            aria-label={t('marketWatch.viewFullAnalytics')}
                        >
                            {t('marketWatch.viewFullAnalytics')}
                        </button>
                    )}
                </div>
            </div>

            {editorOpen && (
                <div
                    ref={editorRef}
                    id={editorId}
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby={titleId}
                    aria-describedby={helpId}
                    className="absolute left-0 top-full z-[80] mt-2 w-[min(calc(100vw-3rem),520px)] max-w-full rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-950"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div id={titleId} className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                {t('marketWatch.configure')}
                            </div>
                            <div id={helpId} className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                {t('marketWatch.configureHelp')}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => closeEditor(true)}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            aria-label={t('marketWatch.closeConfigure')}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="mt-3 grid gap-3">
                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {t('marketWatch.products')}
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.map(option => {
                                    const selected = selectedProducts.includes(option.value);
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => toggleProduct(option.value)}
                                            aria-pressed={selected}
                                            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                                                selected
                                                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                                            }`}
                                        >
                                            {selected && <Check size={11} />}
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    {t('marketWatch.deliveryPoints')}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                    {t('marketWatch.pinHelp')}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5" aria-describedby={helpId}>
                                {availablePorts.map(port => {
                                    const selected = preferences.portIds.includes(port.id);
                                    return (
                                        <button
                                            key={port.id}
                                            type="button"
                                            onClick={() => togglePort(port.id)}
                                            aria-pressed={selected}
                                            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                                                selected
                                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                                            }`}
                                        >
                                            {selected && <Check size={11} />}
                                            {port.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
