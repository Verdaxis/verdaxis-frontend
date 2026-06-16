import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Activity, Check, FlaskConical, RefreshCw, Settings2, WifiOff, X } from 'lucide-react';

import { PORTS as FALLBACK_PORTS } from '../../data';
import { useNamespace } from '../../hooks/useNamespace';
import { api } from '../../services/api';
import type { MarketProduct, Port, PriceSummary } from '../../types';
import { VerdaxisSelect } from '../ui/VerdaxisSelect';
import { ACTIVE_MARKETPLACE_PRODUCT_OPTIONS } from '../../utils/marketProducts';
import { formatMarketProduct } from '../../utils/marketProduct';

interface MarketWatchTickerProps {
    isPanelOpen: boolean;
    onOpenPanel: () => void;
    ports?: Port[];
}

type RowStatus = 'LOADING' | 'LIVE' | 'STALE' | 'REFERENCE' | 'UNAVAILABLE';

interface TickerPreferences {
    product: MarketProduct;
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

interface ReferenceQuote {
    product: MarketProduct;
    deliveryPointId: string;
    price: number;
}

const MARKET_WATCH_PREFERENCES_KEY = 'verdaxis_market_watch_preferences_v1';
const MAX_PINNED_PORTS = 3;
const DEFAULT_PRODUCT: MarketProduct = 'BIO_METHANOL';
const DEFAULT_PINNED_PORT_NAMES = ['Rotterdam', 'Singapore', 'Santos'];

const REFERENCE_QUOTES: ReferenceQuote[] = [
    { product: 'BIO_METHANOL', deliveryPointId: 'nl-rtm', price: 680 },
    { product: 'E_METHANOL', deliveryPointId: 'sg-sin', price: 1250 },
    { product: 'BIO_ETHANOL', deliveryPointId: 'br-ssz', price: 590 },
    { product: 'SYNTHETIC_ETHANOL', deliveryPointId: 'us-hou', price: 740 },
];

const productValues = ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.map(option => option.value);

const normalize = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

const currency = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return '--';
    return `$${value.toFixed(0)}`;
};

const getPortLabel = (port: Port) => port.name;

const getDefaultPortIds = (availablePorts: Port[]) => {
    const namedDefaults = DEFAULT_PINNED_PORT_NAMES
        .map(name => availablePorts.find(port => normalize(port.name) === normalize(name))?.id)
        .filter((id): id is string => Boolean(id));

    const fallbackIds = availablePorts.map(port => port.id);
    return Array.from(new Set([...namedDefaults, ...fallbackIds])).slice(0, MAX_PINNED_PORTS);
};

const sanitizePreferences = (value: unknown, availablePorts: Port[]): TickerPreferences => {
    const data = value && typeof value === 'object' ? value as Partial<TickerPreferences> : {};
    const product = typeof data.product === 'string' && productValues.includes(data.product as MarketProduct)
        ? data.product as MarketProduct
        : DEFAULT_PRODUCT;
    const allowedPortIds = new Set(availablePorts.map(port => port.id));
    const rawPortIds = Array.isArray(data.portIds) ? data.portIds : [];
    const portIds = Array.from(new Set(
        rawPortIds.filter((id): id is string => typeof id === 'string' && allowedPortIds.has(id))
    )).slice(0, MAX_PINNED_PORTS);

    return {
        product,
        portIds: portIds.length > 0 ? portIds : getDefaultPortIds(availablePorts),
    };
};

const readStoredPreferences = (availablePorts: Port[]): TickerPreferences => {
    if (typeof window === 'undefined') return sanitizePreferences(null, availablePorts);
    try {
        const raw = localStorage.getItem(MARKET_WATCH_PREFERENCES_KEY);
        return sanitizePreferences(raw ? JSON.parse(raw) : null, availablePorts);
    } catch {
        return sanitizePreferences(null, availablePorts);
    }
};

const findMatchingSummary = (summaries: PriceSummary[], product: MarketProduct, port: Port) => {
    return summaries.find(summary => (
        summary.market_product === product
        && summary.delivery_point_id === port.id
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
    if (!summary.last_trade_at) return 'STALE';
    const timestamp = Date.parse(summary.last_trade_at);
    if (!Number.isFinite(timestamp)) return 'STALE';
    const hoursOld = (Date.now() - timestamp) / (1000 * 60 * 60);
    return hoursOld <= 24 ? 'LIVE' : 'STALE';
};

const buildReferenceRow = (port: Port, product: MarketProduct): TickerRow => {
    const reference = REFERENCE_QUOTES.find(
        quote => quote.product === product && quote.deliveryPointId === port.id
    );
    if (!reference) {
        return {
            key: `${product}-${port.id}`,
            port,
            product,
            value: '--',
            change: 'No data',
            up: false,
            status: 'UNAVAILABLE',
        };
    }

    return {
        key: `${product}-${port.id}`,
        port,
        product,
        value: currency(reference.price),
        change: '',
        up: true,
        status: 'REFERENCE',
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

export const MarketWatchTicker: React.FC<MarketWatchTickerProps> = ({ isPanelOpen, onOpenPanel, ports }) => {
    const { t, ready } = useNamespace('dashboard');
    const editorId = useId();
    const titleId = useId();
    const helpId = useId();
    const editorRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const availablePorts = useMemo(() => ports?.length ? ports : FALLBACK_PORTS, [ports]);
    const [preferences, setPreferences] = useState<TickerPreferences>(() => readStoredPreferences(FALLBACK_PORTS));
    const [rows, setRows] = useState<TickerRow[]>([]);
    const [editorOpen, setEditorOpen] = useState(false);

    useEffect(() => {
        setPreferences(current => sanitizePreferences(current, availablePorts));
    }, [availablePorts]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(MARKET_WATCH_PREFERENCES_KEY, JSON.stringify(preferences));
    }, [preferences]);

    useEffect(() => {
        if (!editorOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (editorRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            setEditorOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setEditorOpen(false);
            triggerRef.current?.focus();
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
    }, [editorOpen]);

    const selectedPorts = useMemo(() => preferences.portIds
        .map(portId => availablePorts.find(port => port.id === portId))
        .filter((port): port is Port => Boolean(port)), [availablePorts, preferences.portIds]);

    const productOptions = useMemo(() => ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.map(option => ({
        value: option.value,
        label: option.label,
        description: option.fuelType,
    })), []);

    useEffect(() => {
        let cancelled = false;
        const loadRows = async () => {
            setRows(selectedPorts.map(port => buildLoadingRow(port, preferences.product)));
            const nextRows = await Promise.all(selectedPorts.map(async (port) => {
                try {
                    const response = await api.prices.getSummaries({
                        market_product: preferences.product,
                        delivery_point_id: port.id,
                        availability_window: 'SPOT',
                        hours: 168,
                    });
                    const summary = findMatchingSummary(response.summaries ?? [], preferences.product, port);
                    const summaryRow = summary ? buildSummaryRow(port, preferences.product, summary) : null;
                    return summaryRow ?? buildReferenceRow(port, preferences.product);
                } catch (error) {
                    console.warn('Market watch price summary unavailable', error);
                    return buildReferenceRow(port, preferences.product);
                }
            }));
            if (!cancelled) setRows(nextRows);
        };

        loadRows();
        return () => {
            cancelled = true;
        };
    }, [preferences.product, selectedPorts]);

    const headerStatus = useMemo(() => {
        if (rows.length === 0 || rows.some(row => row.status === 'LOADING')) return 'LOADING';
        if (rows.some(row => row.status === 'LIVE')) return 'LIVE';
        if (rows.some(row => row.status === 'STALE' || row.status === 'REFERENCE')) return 'REFERENCE';
        return 'UNAVAILABLE';
    }, [rows]);

    const togglePort = (portId: string) => {
        setPreferences(current => {
            if (current.portIds.includes(portId)) {
                const nextIds = current.portIds.filter(id => id !== portId);
                return { ...current, portIds: nextIds.length > 0 ? nextIds : current.portIds };
            }
            if (current.portIds.length >= MAX_PINNED_PORTS) return current;
            return { ...current, portIds: [...current.portIds, portId] };
        });
    };

    const statusLabel = (status: RowStatus) => {
        if (status === 'LIVE') return t('marketWatch.source.live');
        if (status === 'STALE') return t('marketWatch.source.stale');
        if (status === 'REFERENCE') return t('marketWatch.source.reference');
        if (status === 'UNAVAILABLE') return t('marketWatch.source.unavailable');
        return t('marketWatch.connecting');
    };

    if (!ready) return null;

    return (
        <div className={`relative w-[min(calc(100vw-3rem),760px)] max-w-full rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 ${isPanelOpen ? 'xl:w-[min(calc(100vw-33rem),700px)]' : ''}`}>
            <div className="flex items-center gap-4 overflow-x-auto">
                <div className="flex min-w-fit items-center space-x-2 border-r border-slate-200 pr-4 dark:border-slate-700">
                    {headerStatus === 'LIVE' && <Activity size={18} className="text-green-600" />}
                    {headerStatus === 'REFERENCE' && <FlaskConical size={18} className="text-blue-500" />}
                    {headerStatus === 'LOADING' && <RefreshCw size={18} className="text-verdaxis animate-spin" />}
                    {headerStatus === 'UNAVAILABLE' && <WifiOff size={18} className="text-red-500" />}

                    <div>
                        <span className="block whitespace-nowrap text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {t('marketWatch.title')}
                        </span>
                        <span className="block whitespace-nowrap text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {formatMarketProduct(preferences.product)} · {t('marketWatch.pinnedCount', { count: selectedPorts.length })}
                        </span>
                    </div>
                </div>

                {rows.map((row) => (
                    <div key={row.key} className="flex min-w-[128px] flex-col">
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-300">
                            {getPortLabel(row.port)}
                        </span>
                        <div className="flex items-center space-x-2">
                            <span className={`text-sm font-bold ${
                                row.status === 'UNAVAILABLE' || row.status === 'LOADING'
                                    ? 'text-slate-400 dark:text-slate-500'
                                    : row.status === 'REFERENCE' || row.status === 'STALE'
                                        ? 'text-blue-700 dark:text-blue-300'
                                        : 'text-sky-700 dark:text-sky-300'
                            }`}>
                                {row.value}
                            </span>
                            {row.change && row.status !== 'UNAVAILABLE' && row.status !== 'LOADING' && (
                                <span className={`text-xs font-bold ${row.up ? 'text-green-500' : 'text-red-500'}`}>
                                    {row.change}
                                </span>
                            )}
                        </div>
                        <span className={`mt-0.5 text-[8px] font-bold uppercase tracking-wider ${
                            row.status === 'LIVE'
                                ? 'text-green-600'
                                : row.status === 'UNAVAILABLE'
                                    ? 'text-red-500'
                                    : 'text-blue-500'
                        }`}>
                            {statusLabel(row.status)}
                        </span>
                    </div>
                ))}

                <div className="flex-1" />

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
                    {t('marketWatch.configureShort')}
                </button>

                <button
                    type="button"
                    onClick={onOpenPanel}
                    className="min-w-fit text-xs font-bold text-verdaxis hover:text-verdaxis-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                    aria-label={t('marketWatch.viewFullAnalytics')}
                >
                    {t('marketWatch.viewFullAnalytics')}
                </button>
            </div>

            {editorOpen && (
                <div
                    ref={editorRef}
                    id={editorId}
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby={titleId}
                    aria-describedby={helpId}
                    className="absolute left-0 top-full z-[40] mt-2 w-[min(calc(100vw-3rem),520px)] rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-950"
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
                            onClick={() => setEditorOpen(false)}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            aria-label={t('marketWatch.closeConfigure')}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="mt-3 grid gap-3">
                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {t('marketWatch.product')}
                            </label>
                            <VerdaxisSelect
                                ariaLabel={t('marketWatch.product')}
                                value={preferences.product}
                                onChange={(value) => setPreferences(current => ({
                                    ...current,
                                    product: productValues.includes(value as MarketProduct) ? value as MarketProduct : current.product,
                                }))}
                                options={productOptions}
                                triggerClassName="rounded-lg px-3 py-2 text-xs"
                                menuClassName="rounded-xl"
                            />
                        </div>

                        <div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    {t('marketWatch.deliveryPoints')}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                    {t('marketWatch.pinLimit')}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5" aria-describedby={helpId}>
                                {availablePorts.map(port => {
                                    const selected = preferences.portIds.includes(port.id);
                                    const disabled = !selected && preferences.portIds.length >= MAX_PINNED_PORTS;
                                    return (
                                        <button
                                            key={port.id}
                                            type="button"
                                            onClick={() => togglePort(port.id)}
                                            aria-disabled={disabled}
                                            aria-pressed={selected}
                                            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                                                selected
                                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                    : disabled
                                                        ? 'cursor-not-allowed border-slate-200 text-slate-400 opacity-50 dark:border-slate-700 dark:text-slate-500'
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
