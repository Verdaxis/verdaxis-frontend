import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, ChevronLeft, ChevronRight, RefreshCw, Target, TrendingUp } from 'lucide-react';

import { api } from '../services/api';
import { MARKET_PRODUCTS } from '../types';
import type {
    ForwardCurveBoardDepthLevel,
    ForwardCurveEvidenceLayer,
    ForwardCurveMarketCell,
    ForwardCurveSourceKind,
    ForwardCurveSliceEvidencePoint,
    ForwardCurveSliceResponse,
    ForwardCurveTableColumn,
    ForwardCurveTableRow,
    ForwardCurveTableResponse,
    MarketProduct,
    Page,
} from '../types';
import { formatAvailabilityWindowPeriod, getAvailabilityWindowOptions } from '../utils/availabilityWindow';
import { formatMarketProduct } from '../utils/marketProduct';
import { describeForwardCurveSignal, describeMarketActivity, marketActivityTextClass } from '../utils/marketActivity';
import { isApprovedTradingPortName } from '../utils/tradingPorts';
import type { MarketSlice } from '../utils/sliceUrl';
import { useNamespace } from '../hooks/useNamespace';
import type { TFunction } from 'i18next';
import i18n from '../i18n';

interface ForwardCurveWorkspaceProps {
    onNavigate?: (page: Page) => void;
    onOpenSlice?: (slice: MarketSlice) => void;
}

type SelectedSlice = {
    marketProduct: MarketProduct;
    deliveryPointId: string;
    availabilityWindow: string;
};

const PRODUCT_STORAGE_KEY = 'verdaxis_forward_curve_product';
const DELIVERY_POINT_STORAGE_KEY = 'verdaxis_forward_curve_delivery_point';
const WINDOW_STORAGE_KEY = 'verdaxis_forward_curve_window';
const REFRESH_INTERVAL_MS = 30_000;

const getForwardCurveTableWindows = () => getAvailabilityWindowOptions().map(option => option.value);

const currency = (value: number | string | null | undefined) => {
    if (value == null || value === '') return '--';
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return '--';
    return `$${parsed.toFixed(0)}`;
};

const numericValue = (value: number | string | null | undefined) => {
    if (value == null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const quantity = (value: number | string | null | undefined, locale = 'en') => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return '--';
    if (parsed >= 1000) return `${(parsed / 1000).toFixed(1)}k MT`;
    return `${parsed.toLocaleString(locale)} MT`;
};

const ageLabel = (value: string | null | undefined, t: TFunction) => {
    if (!value) return t('forwardCurve.noTimestamp');
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return t('forwardCurve.noTimestamp');
    const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
    if (minutes < 60) return t('forwardCurve.age.minutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return t('forwardCurve.age.hours', { count: hours });
    return t('forwardCurve.age.days', { count: Math.floor(hours / 24) });
};

const sourceLabel = (value: string, t: TFunction) => t(
    `forwardCurve.sourceLabel.${value.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
    {
        defaultValue: i18n.resolvedLanguage?.startsWith('zh')
            ? t('forwardCurve.sourceLabel.unknown')
            : value,
    },
);

const sliceKey = (slice: SelectedSlice | null | undefined) => (
    slice ? `${slice.marketProduct}|${slice.deliveryPointId}|${slice.availabilityWindow}` : ''
);

const cellToSlice = (cell: ForwardCurveMarketCell): SelectedSlice => ({
    marketProduct: cell.market_product,
    deliveryPointId: cell.delivery_point_id,
    availabilityWindow: cell.availability_window,
});

const cellHasSignal = (cell: ForwardCurveMarketCell) => (
    cell.primary_value != null
    || cell.best_bid != null
    || cell.best_ask != null
    || cell.order_count > 0
    || (cell.indication_summary?.indication_count ?? 0) > 0
    || (cell.physical_stem_summary?.stem_count ?? 0) > 0
);

const getStoredSelection = (): SelectedSlice | null => {
    if (typeof window === 'undefined') return null;
    const marketProduct = localStorage.getItem(PRODUCT_STORAGE_KEY) as MarketProduct | null;
    const deliveryPointId = localStorage.getItem(DELIVERY_POINT_STORAGE_KEY);
    const availabilityWindow = localStorage.getItem(WINDOW_STORAGE_KEY);
    if (!marketProduct || !deliveryPointId || !availabilityWindow) return null;
    return { marketProduct, deliveryPointId, availabilityWindow };
};

const persistSelection = (selection: SelectedSlice) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PRODUCT_STORAGE_KEY, selection.marketProduct);
    localStorage.setItem(DELIVERY_POINT_STORAGE_KEY, selection.deliveryPointId);
    localStorage.setItem(WINDOW_STORAGE_KEY, selection.availabilityWindow);
};

const persistMarketplaceSlice = (cell: ForwardCurveMarketCell) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('verdaxis_marketplace_port', cell.delivery_point_name);
    localStorage.setItem('verdaxis_marketplace_delivery_point_id', cell.delivery_point_id);
    localStorage.setItem('verdaxis_marketplace_product', cell.market_product);
    localStorage.removeItem('verdaxis_marketplace_fuel');
    localStorage.setItem('verdaxis_marketplace_window', cell.availability_window);
};

const flattenCells = (table: ForwardCurveTableResponse | null) => (
    table?.rows.flatMap(row => table.columns.map(column => row.cells[column.availability_window]).filter(Boolean)) ?? []
);

const findCell = (table: ForwardCurveTableResponse | null, selection: SelectedSlice | null) => {
    if (!table || !selection) return null;
    const row = table.rows.find(item => (
        item.market_product === selection.marketProduct
        && item.delivery_point_id === selection.deliveryPointId
    ));
    return row?.cells[selection.availabilityWindow] ?? null;
};

const pickInitialSelection = (table: ForwardCurveTableResponse): SelectedSlice | null => {
    const cells = flattenCells(table);
    const preferred = cells.find(cellHasSignal) ?? cells[0];
    return preferred ? cellToSlice(preferred) : null;
};

const isApprovedMarketProduct = (marketProduct: string | null | undefined): marketProduct is MarketProduct => (
    MARKET_PRODUCTS.includes(marketProduct as MarketProduct)
);

const filterApprovedForwardCurveTable = (response: ForwardCurveTableResponse): ForwardCurveTableResponse => {
    const rows = response.rows
        .filter(row => isApprovedMarketProduct(row.market_product) && isApprovedTradingPortName(row.delivery_point_name))
        .map(row => ({
            ...row,
            cells: Object.fromEntries(
                Object.entries(row.cells).map(([availabilityWindow, cell]) => [
                    availabilityWindow,
                    {
                        ...cell,
                        market_product: row.market_product,
                        product_name: row.product_name,
                        representative_product_id: row.representative_product_id,
                        product_count: row.product_count,
                        delivery_point_id: row.delivery_point_id,
                        delivery_point_name: row.delivery_point_name,
                        region: row.region,
                        availability_window: availabilityWindow,
                    },
                ])
            ) as Record<string, ForwardCurveMarketCell>,
        }))
        .filter(row => Object.keys(row.cells).length > 0);

    return {
        ...response,
        rows,
        latest_signals: response.latest_signals.filter(signal => (
            isApprovedMarketProduct(signal.market_product)
            && isApprovedTradingPortName(signal.delivery_point_name)
        )),
    };
};

const signalTone = (
    sourceKind: ForwardCurveSourceKind | null | undefined,
    t: TFunction,
    demoStatus?: ForwardCurveMarketCell['demo_status'],
) => describeForwardCurveSignal({
    signal_source_kind: sourceKind,
    demo_status: demoStatus,
}, t);

const sourceTone = (cell: ForwardCurveMarketCell, t: TFunction) => signalTone(
    cell.primary_source_kind,
    t,
    cell.demo_status,
);

const getEvidenceLayerMeta = (t: TFunction): Record<ForwardCurveEvidenceLayer, {
    label: string;
    shortLabel: string;
    toneClass: string;
    markerClass: string;
}> => ({
    HISTORICAL_TRADE: {
        label: t('forwardCurve.layer.lastPrint'),
        shortLabel: t('forwardCurve.layer.lastShort'),
        toneClass: 'text-cyan-300',
        markerClass: 'rounded-full bg-cyan-300',
    },
    ORDERBOOK_BID: {
        label: t('forwardCurve.layer.bid'),
        shortLabel: 'BID',
        toneClass: 'text-emerald-300',
        markerClass: 'rounded-sm bg-emerald-300',
    },
    ORDERBOOK_ASK: {
        label: t('forwardCurve.layer.ask'),
        shortLabel: 'ASK',
        toneClass: 'text-rose-300',
        markerClass: 'rounded-sm bg-rose-300',
    },
    MARKET_INDICATION: {
        label: t('forwardCurve.layer.indication'),
        shortLabel: t('forwardCurve.layer.indicationShort'),
        toneClass: 'text-amber-300',
        markerClass: 'rotate-45 rounded-[2px] bg-amber-300',
    },
    FAIR_PRICE_BAND: {
        label: t('forwardCurve.layer.fairValue'),
        shortLabel: t('forwardCurve.layer.fairShort'),
        toneClass: 'text-fuchsia-300',
        markerClass: 'rounded-sm bg-fuchsia-300',
    },
    BENCHMARK_MID: {
        label: t('forwardCurve.layer.reference'),
        shortLabel: t('forwardCurve.layer.referenceShort'),
        toneClass: 'text-blue-300',
        markerClass: 'w-0.5 rounded-none bg-blue-300',
    },
    PHYSICAL_STEM: {
        label: t('forwardCurve.layer.physicalStem'),
        shortLabel: t('forwardCurve.layer.stemShort'),
        toneClass: 'text-slate-300',
        markerClass: 'rounded-full bg-slate-300',
    },
});

const cellCurveValue = (cell: ForwardCurveMarketCell | null | undefined) => {
    if (!cell) return null;
    const primary = numericValue(cell.primary_value);
    if (primary != null) return primary;
    const bid = numericValue(cell.best_bid);
    const ask = numericValue(cell.best_ask);
    if (bid != null && ask != null) return (bid + ask) / 2;
    return bid ?? ask;
};

const findCurveRow = (
    table: ForwardCurveTableResponse,
    selectedCell: ForwardCurveMarketCell | null | undefined,
): ForwardCurveTableRow | null => {
    if (selectedCell) {
        const selectedRow = table.rows.find(row => (
            row.market_product === selectedCell.market_product
            && row.delivery_point_id === selectedCell.delivery_point_id
        ));
        if (selectedRow) return selectedRow;
    }
    return table.rows.find(row => table.columns.some(column => cellCurveValue(row.cells[column.availability_window]) != null)) ?? null;
};

const ForwardCurveChart: React.FC<{
    table: ForwardCurveTableResponse;
    columns: ForwardCurveTableColumn[];
    selectedCell: ForwardCurveMarketCell | null;
    selectedKey: string;
    onSelectCell: (cell: ForwardCurveMarketCell) => void;
    onOpenCell: (cell: ForwardCurveMarketCell) => void;
}> = ({ table, columns, selectedCell, selectedKey, onSelectCell, onOpenCell }) => {
    const { t, ready } = useNamespace('trading');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    const curveRow = useMemo(() => findCurveRow(table, selectedCell), [table, selectedCell]);

    const graph = useMemo(() => {
        const cells = columns.map((column, index) => {
            const cell = curveRow?.cells[column.availability_window] ?? null;
            const value = cellCurveValue(cell);
            return { column, cell, value, index };
        });
        const priceValues = cells.flatMap(point => [
            point.value,
            point.cell?.best_bid,
            point.cell?.best_ask,
        ]).map(numericValue).filter((value): value is number => value != null);

        if (!priceValues.length) {
            return { cells, points: [], min: 0, max: 0, range: 1 };
        }

        const rawMin = Math.min(...priceValues);
        const rawMax = Math.max(...priceValues);
        const padding = Math.max((rawMax - rawMin) * 0.16, 8);
        const min = rawMin - padding;
        const max = rawMax + padding;
        const range = Math.max(max - min, 1);
        const left = 42;
        const right = 18;
        const top = 20;
        const bottom = 34;
        const width = 900;
        const height = 210;
        const plotWidth = width - left - right;
        const plotHeight = height - top - bottom;
        const xForIndex = (index: number) => {
            if (columns.length <= 1) return left + (plotWidth / 2);
            return left + (index / (columns.length - 1)) * plotWidth;
        };
        const yForValue = (value: number | string | null | undefined) => {
            const parsed = numericValue(value);
            if (parsed == null) return top + plotHeight;
            return top + ((max - parsed) / range) * plotHeight;
        };
        const points = cells
            .filter((point): point is typeof point & { cell: ForwardCurveMarketCell; value: number } => (
                point.cell != null && point.value != null
            ))
            .map(point => ({
                ...point,
                x: xForIndex(point.index),
                y: yForValue(point.value),
                bidY: yForValue(point.cell.best_bid),
                askY: yForValue(point.cell.best_ask),
            }));

        return { cells, points, min, max, range };
    }, [columns, curveRow]);

    const curveLabel = curveRow
        ? `${formatMarketProduct(curveRow.market_product)} · ${curveRow.delivery_point_name}`
        : t('forwardCurve.noMarketSelected');
    // One path per run of consecutive populated periods. Periods without
    // evidence break the line instead of being interpolated across.
    const pathSegments = useMemo(() => {
        const segments: string[] = [];
        let run: { x: number; y: number }[] = [];
        const pointsByIndex = new Map(graph.points.map(point => [point.index, point]));
        graph.cells.forEach(cell => {
            const point = pointsByIndex.get(cell.index);
            if (point) {
                run.push(point);
                return;
            }
            if (run.length > 1) {
                segments.push(run.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '));
            }
            run = [];
        });
        if (run.length > 1) {
            segments.push(run.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '));
        }
        return segments;
    }, [graph.cells, graph.points]);

    if (!ready) return null;
    return (
        <section data-tour="forward-curve-chart" className="min-w-0 border border-slate-800 bg-[#05080d]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-3 py-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        <TrendingUp size={12} className="text-blue-300" aria-hidden="true" />
                        {t('forwardCurve.title')}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-slate-500">{t('forwardCurve.chart.scope', { market: curveLabel })}</div>
                </div>
                <div className="shrink-0 text-right font-mono text-[9px] uppercase tracking-wider text-slate-500">
                    <div>{currency(graph.min)} {t('forwardCurve.low')}</div>
                    <div>{currency(graph.max)} {t('forwardCurve.high')}</div>
                </div>
            </div>

            {graph.points.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center px-4 text-center text-[11px] text-slate-500">
                    {t('forwardCurve.chart.empty')}
                </div>
            ) : (
                <div className="px-3 pb-2 pt-2">
                    <svg className="h-56 w-full overflow-visible" viewBox="0 0 900 210" role="img" aria-label={t('forwardCurve.chart.aria', { market: curveLabel })}>
                        {[0.25, 0.5, 0.75].map(fraction => {
                            const y = 20 + fraction * 156;
                            return <line key={fraction} x1="42" x2="882" y1={y} y2={y} stroke="#1e293b" strokeDasharray="4 6" />;
                        })}
                        <line x1="42" x2="882" y1="176" y2="176" stroke="#334155" />
                        <line x1="42" x2="42" y1="20" y2="176" stroke="#334155" />
                        <text x="0" y="27" fill="#64748b" fontSize="12">{currency(graph.max)}</text>
                        <text x="0" y="178" fill="#64748b" fontSize="12">{currency(graph.min)}</text>
                        {graph.points.map(point => (
                            <text
                                key={`label-${point.index}`}
                                x={point.x}
                                y="196"
                                fill="#64748b"
                                fontSize="11"
                                textAnchor="middle"
                            >
                                {formatAvailabilityWindowPeriod(point.cell.availability_window, locale)}
                            </text>
                        ))}
                        {pathSegments.map((segment, index) => (
                            <path key={`segment-${index}`} d={segment} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        ))}
                        {graph.points.map(point => {
                            const pointKey = sliceKey(cellToSlice(point.cell));
                            const selected = pointKey === selectedKey;
                            const bid = numericValue(point.cell.best_bid);
                            const ask = numericValue(point.cell.best_ask);
                            const bandY1 = bid != null && ask != null ? Math.min(point.bidY, point.askY) : null;
                            const bandY2 = bid != null && ask != null ? Math.max(point.bidY, point.askY) : null;
                            return (
                                <g
                                    key={`${point.cell.delivery_point_id}-${point.cell.availability_window}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${formatAvailabilityWindowPeriod(point.cell.availability_window, locale)} ${currency(point.value)}`}
                                    onClick={() => onSelectCell(point.cell)}
                                    onDoubleClick={(event) => {
                                        event.preventDefault();
                                        onOpenCell(point.cell);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            onSelectCell(point.cell);
                                        }
                                    }}
                                    className="cursor-pointer"
                                >
                                    <title>
                                        {t('forwardCurve.chart.pointTitle', {
                                            period: formatAvailabilityWindowPeriod(point.cell.availability_window, locale),
                                            price: currency(point.value),
                                        })}
                                    </title>
                                    {bandY1 != null && bandY2 != null && (
                                        <line x1={point.x} x2={point.x} y1={bandY1} y2={bandY2} stroke="#475569" strokeWidth="5" strokeLinecap="round" />
                                    )}
                                    <circle cx={point.x} cy={point.y} r={selected ? 6 : 4.5} fill={selected ? '#34d399' : '#38bdf8'} stroke="#020617" strokeWidth="2" />
                                    {selected && <circle cx={point.x} cy={point.y} r="10" fill="none" stroke="#34d399" strokeWidth="1.5" />}
                                </g>
                            );
                        })}
                    </svg>

                    <div className="mt-1 flex items-center gap-3 text-[9px] uppercase tracking-wider text-slate-500">
                        <span className="flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden="true" />
                            {t('forwardCurve.chart.midPrimary')}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="h-3 w-1 rounded-full bg-slate-500" aria-hidden="true" />
                            {t('forwardCurve.chart.bidAskRange')}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-full border border-emerald-400 bg-transparent" aria-hidden="true" />
                            {t('forwardCurve.selectedPeriod')}
                        </span>
                    </div>
                </div>
            )}
        </section>
    );
};

const PriceEvidenceStrip: React.FC<{ slice: ForwardCurveSliceResponse | null; loading: boolean; hasSelection: boolean }> = ({ slice, loading, hasSelection }) => {
    const { t, ready } = useNamespace('trading');
    const evidenceLayerMeta = getEvidenceLayerMeta(t);
    const axis = useMemo(() => {
        const evidence = slice?.evidence_points ?? [];
        const priceValues = evidence.flatMap(point => [
            point.price_per_mt_usd,
            point.low_price_per_mt_usd,
            point.high_price_per_mt_usd,
        ]).map(numericValue).filter((value): value is number => value != null);

        if (!priceValues.length) {
            return { evidence, min: 0, max: 0, range: 1 };
        }

        const rawMin = Math.min(...priceValues);
        const rawMax = Math.max(...priceValues);
        const padding = Math.max((rawMax - rawMin) * 0.18, 8);
        const min = rawMin - padding;
        const max = rawMax + padding;
        return { evidence, min, max, range: Math.max(max - min, 1) };
    }, [slice]);

    if (!ready) return null;

    if (loading) {
        return (
            <div className="flex min-h-[230px] items-center justify-center border border-slate-800 bg-[#05080d] text-[11px] text-slate-500">
                <RefreshCw size={13} className="mr-2 animate-spin" aria-hidden="true" />
                {t('forwardCurve.evidence.refreshing')}
            </div>
        );
    }

    if (!hasSelection) {
        return (
            <div data-tour="forward-period-detail" className="flex min-h-[230px] items-center justify-center border border-slate-800 bg-[#05080d] px-4 text-center text-[11px] text-slate-500">
                {t('forwardCurve.evidence.select')}
            </div>
        );
    }

    if (!slice || axis.evidence.length === 0 || axis.evidence.every(point => (
        numericValue(point.price_per_mt_usd) == null
        && numericValue(point.low_price_per_mt_usd) == null
        && numericValue(point.high_price_per_mt_usd) == null
    ))) {
        return (
            <div data-tour="forward-period-detail" className="flex min-h-[230px] items-center justify-center border border-slate-800 bg-[#05080d] px-4 text-center text-[11px] text-slate-500">
                {t('forwardCurve.evidence.empty')}
            </div>
        );
    }

    const pricedEvidence = axis.evidence.filter(point => (
        numericValue(point.price_per_mt_usd) != null
        || numericValue(point.low_price_per_mt_usd) != null
        || numericValue(point.high_price_per_mt_usd) != null
    ));
    const bandEvidence = pricedEvidence.filter(point => (
        numericValue(point.low_price_per_mt_usd) != null
        && numericValue(point.high_price_per_mt_usd) != null
    ));
    const pointEvidence = pricedEvidence.filter(point => numericValue(point.price_per_mt_usd) != null);

    const position = (value: number | string | null | undefined) => {
        const parsed = numericValue(value);
        if (parsed == null) return '0%';
        return `${Math.min(100, Math.max(0, ((parsed - axis.min) / axis.range) * 100))}%`;
    };

    const evidencePriceLabel = (point: ForwardCurveSliceEvidencePoint) => {
        if (point.low_price_per_mt_usd != null && point.high_price_per_mt_usd != null) {
            return `${currency(point.low_price_per_mt_usd)}-${currency(point.high_price_per_mt_usd)}`;
        }
        return currency(point.price_per_mt_usd);
    };

    return (
        <div data-tour="forward-period-detail" className="border border-slate-800 bg-[#05080d] p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('forwardCurve.evidence.title')}</div>
                    <div className="mt-0.5 text-[9px] text-slate-500">{t('forwardCurve.evidence.subtitle')}</div>
                </div>
                <div className="shrink-0 text-right font-mono text-[9px] uppercase tracking-wider text-slate-500">
                    <div>{currency(axis.min)}</div>
                    <div>{currency(axis.max)}</div>
                </div>
            </div>
            <div className="relative mt-3 h-28">
                <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-700" aria-hidden="true" />
                <div className="absolute left-0 top-[calc(50%+12px)] font-mono text-[9px] uppercase text-slate-600">{currency(axis.min)}</div>
                <div className="absolute right-0 top-[calc(50%+12px)] font-mono text-[9px] uppercase text-slate-600">{currency(axis.max)}</div>
                {bandEvidence.map((point, index) => {
                    const lowPrice = numericValue(point.low_price_per_mt_usd);
                    const highPrice = numericValue(point.high_price_per_mt_usd);
                    if (lowPrice == null || highPrice == null) return null;
                    const low = Math.min(lowPrice, highPrice);
                    const high = Math.max(lowPrice, highPrice);
                    return (
                        <div
                            key={`${point.layer}-band-${index}`}
                            className="absolute top-1/2 h-6 -translate-y-1/2 border border-fuchsia-300/60 bg-fuchsia-300/15"
                            style={{ left: position(low), width: `${Math.max(1, ((high - low) / axis.range) * 100)}%` }}
                            aria-label={t('forwardCurve.evidence.fairBand', { low: currency(low), high: currency(high) })}
                        />
                    );
                })}
                {pointEvidence.map((point, index) => {
                    const pointPrice = numericValue(point.price_per_mt_usd);
                    if (pointPrice == null) return null;
                    const meta = evidenceLayerMeta[point.layer];
                    const verticalOffset = index % 2 === 0 ? '-top-6' : 'top-6';
                    return (
                        <div
                            key={`${point.layer}-marker-${index}`}
                            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                            style={{ left: position(pointPrice) }}
                            aria-label={`${meta.label} ${currency(pointPrice)} ${sourceLabel(point.public_source_label, t)}`}
                        >
                            <div className="absolute left-1/2 top-1/2 h-12 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-700" aria-hidden="true" />
                            <div className={`relative z-10 h-3 w-3 ${meta.markerClass}`} />
                            <div className={`absolute left-1/2 ${verticalOffset} -translate-x-1/2 whitespace-nowrap text-center`}>
                                <div className={`text-[8px] font-bold uppercase tracking-wider ${meta.toneClass}`}>{meta.shortLabel}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 grid gap-px bg-slate-900 sm:grid-cols-2">
                {pricedEvidence.slice(0, 6).map((point, index) => {
                    const meta = evidenceLayerMeta[point.layer];
                    return (
                        <div key={`${point.layer}-legend-${index}`} className="grid min-w-0 grid-cols-[auto_1fr_auto] items-center gap-2 bg-[#080c13] px-2 py-1.5">
                            <div className={`text-[8px] font-bold uppercase tracking-wider ${meta.toneClass}`}>
                                {meta.shortLabel}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-500">{meta.label}</div>
                                <div className="truncate text-[9px] text-slate-600">{sourceLabel(point.public_source_label, t)}</div>
                            </div>
                            <div className="font-mono text-[10px] font-bold text-slate-200">
                                {evidencePriceLabel(point)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DepthList: React.FC<{ label: string; levels: ForwardCurveBoardDepthLevel[]; tone: 'bid' | 'ask' }> = ({ label, levels, tone }) => {
    const { t, ready } = useNamespace('trading');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    if (!ready) return null;
    return <div className="border border-slate-800 bg-[#080c13]">
        <div className={`border-b border-slate-800 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] ${tone === 'bid' ? 'text-emerald-300' : 'text-rose-300'}`}>
            {label}
        </div>
        <div className="max-h-[180px] divide-y divide-slate-900 overflow-y-auto">
            {levels.length === 0 ? (
                <div className="px-3 py-6 text-center text-[11px] text-slate-500">
                    {tone === 'bid' ? t('forwardCurve.depth.noBids') : t('forwardCurve.depth.noAsks')}
                </div>
            ) : levels.map((level, index) => (
                <div key={`${label}-${index}`} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-[11px]">
                    <span className="font-mono font-bold text-slate-200">{currency(level.price_per_mt_usd)}</span>
                    <span className="font-mono text-slate-500">{quantity(level.quantity_mt, locale)}</span>
                </div>
            ))}
        </div>
    </div>;
};

export const ForwardCurveWorkspace: React.FC<ForwardCurveWorkspaceProps> = ({ onNavigate, onOpenSlice }) => {
    const { t, ready } = useNamespace('trading');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    const [table, setTable] = useState<ForwardCurveTableResponse | null>(null);
    const [selected, setSelected] = useState<SelectedSlice | null>(() => getStoredSelection());
    const [slice, setSlice] = useState<ForwardCurveSliceResponse | null>(null);
    const [sliceSelectionKey, setSliceSelectionKey] = useState('');
    const [pendingSliceKey, setPendingSliceKey] = useState('');
    const [failedSliceKey, setFailedSliceKey] = useState('');
    const [loadingTable, setLoadingTable] = useState(true);
    const [loadingSlice, setLoadingSlice] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const tableRequestIdRef = useRef(0);
    const sliceRequestIdRef = useRef(0);

    const selectedCell = useMemo(() => findCell(table, selected), [table, selected]);
    const allCells = useMemo(() => flattenCells(table), [table]);
    // Hide periods with no signal in ANY row: they carry zero monitoring
    // information and push populated quarters behind the horizontal scroll.
    const visibleColumns = useMemo(() => {
        if (!table) return [];
        const populated = table.columns.filter(column => table.rows.some(row => {
            const cell = row.cells[column.availability_window];
            return cell != null && cellHasSignal(cell);
        }));
        return populated.length > 0 ? populated : table.columns;
    }, [table]);
    const hiddenColumnCount = table ? table.columns.length - visibleColumns.length : 0;

    const fetchTable = useCallback(async () => {
        if (!ready) return;
        const requestId = tableRequestIdRef.current + 1;
        tableRequestIdRef.current = requestId;
        setLoadingTable(true);
        setError(null);
        try {
            const response = filterApprovedForwardCurveTable(await api.curves.table({
                windows: getForwardCurveTableWindows(),
            }));
            if (requestId !== tableRequestIdRef.current) return;
            setTable(response);
            setSelected(current => {
                const currentCell = findCell(response, current);
                if (currentCell) return current;
                const next = pickInitialSelection(response);
                if (next) persistSelection(next);
                return next;
            });
        } catch (err) {
            if (requestId !== tableRequestIdRef.current) return;
            console.error('Failed to load forward curve table', err);
            setError(t('forwardCurve.error'));
        } finally {
            if (requestId === tableRequestIdRef.current) setLoadingTable(false);
        }
    }, [ready, t]);

    useEffect(() => {
        if (!ready) return;
        fetchTable();
        const interval = window.setInterval(fetchTable, REFRESH_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, [fetchTable, ready]);

    useEffect(() => {
        if (!ready) return;
        if (!selected || !selectedCell) {
            setSlice(null);
            setSliceSelectionKey('');
            setPendingSliceKey('');
            setFailedSliceKey('');
            setLoadingSlice(false);
            return;
        }

        const requestId = sliceRequestIdRef.current + 1;
        sliceRequestIdRef.current = requestId;
        const requestKey = sliceKey(selected);
        setSlice(null);
        setSliceSelectionKey('');
        setPendingSliceKey(requestKey);
        setFailedSliceKey('');
        setLoadingSlice(true);
        api.curves.slice({
            market_product: selected.marketProduct,
            delivery_point_id: selected.deliveryPointId,
            availability_window: selected.availabilityWindow,
        }).then(response => {
            if (requestId !== sliceRequestIdRef.current) return;
            setSlice(response);
            setSliceSelectionKey(requestKey);
            setPendingSliceKey('');
            setFailedSliceKey('');
        }).catch(err => {
            if (requestId !== sliceRequestIdRef.current) return;
            console.error('Failed to load forward curve slice', err);
            setSlice(null);
            setSliceSelectionKey('');
            setPendingSliceKey('');
            setFailedSliceKey(requestKey);
        }).finally(() => {
            if (requestId === sliceRequestIdRef.current) setLoadingSlice(false);
        });
    }, [ready, selected, selectedCell]);

    const prepareSliceRefresh = (next: SelectedSlice) => {
        sliceRequestIdRef.current += 1;
        setSlice(null);
        setSliceSelectionKey('');
        setPendingSliceKey(sliceKey(next));
        setFailedSliceKey('');
        setLoadingSlice(true);
    };

    const selectCell = (cell: ForwardCurveMarketCell) => {
        const next = cellToSlice(cell);
        persistSelection(next);
        prepareSliceRefresh(next);
        setSelected(next);
    };

    const openMarketplaceForCell = (cell: ForwardCurveMarketCell) => {
        const next = cellToSlice(cell);
        persistSelection(next);
        setSelected(next);
        if (onOpenSlice) {
            // Slice-aware handoff: the slice URL carries the selection.
            onOpenSlice({
                product: cell.market_product,
                port: cell.delivery_point_name,
                window: cell.availability_window,
            });
            return;
        }
        persistMarketplaceSlice(cell);
        onNavigate?.('MARKETPLACE');
    };

    const selectWindow = (availabilityWindow: string | null | undefined) => {
        if (!availabilityWindow || !selected) return;
        const next = { ...selected, availabilityWindow };
        persistSelection(next);
        prepareSliceRefresh(next);
        setSelected(next);
    };

    const openMarketplace = () => {
        const cell = activeCell;
        if (!cell) return;
        openMarketplaceForCell(cell);
    };

    const selectedKey = sliceKey(selected);
    const activeSlice = slice && sliceSelectionKey === selectedKey ? slice : null;
    const waitingForActiveSlice = Boolean(selectedKey && pendingSliceKey === selectedKey);
    const latestSignals = table?.latest_signals ?? [];
    const activeCell = activeSlice?.cell ?? selectedCell;
    const evidenceLoading = loadingSlice || waitingForActiveSlice || Boolean(activeCell && !activeSlice && failedSliceKey !== selectedKey);
    const activeTone = activeCell ? sourceTone(activeCell, t) : null;

    if (!ready) return null;

    return (
        <div className="min-h-full bg-[#05070b] font-mono text-slate-100">
            <div className="border-b border-slate-800 bg-[#080c13] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                            <Activity size={17} aria-hidden="true" />
                        </div>
                        <div>
                            <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{t('forwardCurve.title')}</div>
                            <div className="text-[11px] text-slate-500">{t('forwardCurve.subtitle')}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={fetchTable}
                            className="inline-flex h-8 items-center gap-1 border border-slate-700 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                        >
                            <RefreshCw size={12} className={loadingTable ? 'animate-spin' : ''} aria-hidden="true" />
                            {t('common.refresh')}
                        </button>
                        <button
                            data-tour="forward-open-marketplace"
                            type="button"
                            onClick={openMarketplace}
                            disabled={!activeCell}
                            className="inline-flex h-8 items-center gap-1 bg-emerald-500 px-3 text-[11px] font-bold uppercase tracking-wider text-[#04110c] hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                        >
                            {t('forwardCurve.openMarketplace')}
                            <ArrowRight size={13} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="p-6 text-sm text-rose-300">{error}</div>
            ) : !table ? (
                <div className="flex h-96 items-center justify-center text-xs text-slate-500">
                    <RefreshCw size={14} className="mr-2 animate-spin" aria-hidden="true" />
                    {t('forwardCurve.loading')}
                </div>
            ) : table.rows.length === 0 ? (
                <div className="flex h-96 items-center justify-center px-6 text-center text-xs text-slate-500">
                    {t('forwardCurve.emptyMarkets')}
                </div>
            ) : (
                <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_430px]">
                    <div className="min-w-0 space-y-3">
                    <ForwardCurveChart
                        table={table}
                        columns={visibleColumns}
                        selectedCell={selectedCell}
                        selectedKey={selectedKey}
                        onSelectCell={selectCell}
                        onOpenCell={openMarketplaceForCell}
                    />

                    <section data-tour="forward-market-matrix" className="min-w-0 overflow-hidden border border-slate-800 bg-[#080c13]">
                        <div data-tour="forward-market-matrix-header" className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('forwardCurve.matrix.title')}</div>
                                <div className="text-[10px] text-slate-500">{t('forwardCurve.matrix.subtitle')}</div>
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-500">
                                {t('forwardCurve.matrix.dimensions', { rows: table.rows.length, periods: visibleColumns.length })}
                                {hiddenColumnCount > 0 && (
                                    <span className="ml-1 text-slate-600">· {t('forwardCurve.matrix.hidden', { count: hiddenColumnCount })}</span>
                                )}
                            </div>
                        </div>
                        <div className="max-h-[calc(100vh-540px)] min-h-[280px] overflow-auto">
                            <div
                                className="grid gap-px bg-slate-900 text-[11px]"
                                style={{
                                    gridTemplateColumns: `220px repeat(${visibleColumns.length}, minmax(118px, 1fr))`,
                                    minWidth: `${220 + visibleColumns.length * 118}px`,
                                }}
                            >
                                <div className="sticky left-0 top-0 z-20 bg-[#0b111a] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    {t('forwardCurve.matrix.productPort')}
                                </div>
                                {visibleColumns.map(column => (
                                    <div key={column.availability_window} className="sticky top-0 z-10 bg-[#0b111a] px-2 py-2 text-center">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{formatAvailabilityWindowPeriod(column.availability_window, locale)}</div>
                                        <div className="mt-0.5 text-[9px] uppercase text-slate-600">{t(`forwardCurve.group.${column.group.toLowerCase()}`, { defaultValue: t('forwardCurve.group.other') })}</div>
                                    </div>
                                ))}
                                {table.rows.map(row => (
                                    <React.Fragment key={row.row_key}>
                                        <div className="sticky left-0 z-10 min-w-0 border-t border-slate-900 bg-[#080c13] px-3 py-2">
                                            <div className="truncate text-[11px] font-bold text-slate-200">{formatMarketProduct(row.market_product)}</div>
                                            <div className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-slate-500">{row.delivery_point_name}</div>
                                            <div className="mt-0.5 text-[9px] text-slate-600">{row.region}</div>
                                        </div>
                                        {visibleColumns.map(column => {
                                            const cell = row.cells[column.availability_window];
                                            const selectedCellKey = sliceKey(cell ? cellToSlice(cell) : null);
                                            const selectedState = Boolean(cell && selectedCellKey === selectedKey);
                                            const tone = cell ? sourceTone(cell, t) : null;
                                            const empty = !cell || !cellHasSignal(cell);
                                            const stale = cell?.staleness_status === 'STALE';
                                            return (
                                                <button
                                                    key={`${row.row_key}-${column.availability_window}`}
                                                    type="button"
                                                    onClick={() => cell && selectCell(cell)}
                                                    onDoubleClick={() => cell && openMarketplaceForCell(cell)}
                                                    disabled={!cell}
                                                    aria-pressed={selectedState}
                                                    title={cell ? t('forwardCurve.matrix.cellTitle') : undefined}
                                                    className={`min-h-[78px] bg-[#080c13] px-2 py-2 text-left transition hover:bg-[#0d1520] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                                                        selectedState ? 'outline outline-1 outline-emerald-400 bg-[#0b1f1a]' : ''
                                                    } ${empty ? 'text-slate-600' : 'text-slate-200'} disabled:cursor-not-allowed`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className={`font-mono text-base font-bold ${empty ? 'text-slate-600' : 'text-slate-100'}`}>
                                                            {currency(cell?.primary_value)}
                                                        </span>
                                                        {tone && tone.tone !== 'empty' && (
                                                            <span className={`text-[9px] font-bold uppercase ${marketActivityTextClass(tone.tone)}`}>
                                                                {tone.shortLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-1 flex items-center justify-between gap-2 text-[9px] tracking-wider">
                                                        <span className="min-w-0 truncate text-slate-500">
                                                            {cell ? sourceLabel(cell.public_source_label, t) : t('marketActivity.empty.label')}
                                                        </span>
                                                        {!empty && cell?.observed_at && (
                                                            <span className={`shrink-0 font-mono uppercase ${stale ? 'font-bold text-amber-400' : 'text-slate-600'}`}>
                                                                {ageLabel(cell.observed_at, t)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px]">
                                                        <span className="text-emerald-300">BID {currency(cell?.best_bid)}</span>
                                                        <span className="text-right text-rose-300">ASK {currency(cell?.best_ask)}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                        </section>
                    </div>

                    <div className="flex min-w-0 flex-col gap-3 xl:max-h-[calc(100vh-230px)] xl:overflow-y-auto xl:sticky xl:top-3 xl:self-start">
                        <section data-tour="forward-latest-signals" className="order-2 min-w-0 overflow-hidden border border-slate-800 bg-[#080c13]">
                            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={13} className="text-blue-300" aria-hidden="true" />
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('forwardCurve.signals.title')}</div>
                                        <div className="text-[9px] text-slate-500">{t('forwardCurve.signals.subtitle')}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500">{ageLabel(table.generated_at, t)}</div>
                            </div>
                            <div className="grid max-h-[238px] gap-px overflow-y-auto bg-slate-900 md:grid-cols-2 xl:grid-cols-1">
                                {latestSignals.length === 0 ? (
                                    <div className="bg-[#080c13] px-3 py-6 text-center text-[11px] text-slate-500 md:col-span-2 xl:col-span-1">
                                        {t('forwardCurve.signals.empty')}
                                    </div>
                                ) : latestSignals.slice(0, 8).map(signal => {
                                    const tone = signalTone(signal.primary_source_kind, t, signal.demo_status);
                                    const matchingCell = allCells.find(cell => (
                                        cell.market_product === signal.market_product
                                        && cell.delivery_point_id === signal.delivery_point_id
                                        && cell.availability_window === signal.availability_window
                                    ));
                                    return (
                                        <button
                                            key={`${signal.market_product}-${signal.delivery_point_id}-${signal.availability_window}`}
                                            type="button"
                                            onClick={() => matchingCell && selectCell(matchingCell)}
                                            onDoubleClick={() => matchingCell && openMarketplaceForCell(matchingCell)}
                                            disabled={!matchingCell}
                                            title={matchingCell ? t('forwardCurve.matrix.cellTitle') : undefined}
                                            className="min-w-0 bg-[#080c13] px-3 py-1.5 text-left hover:bg-[#0d1520] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                                        >
                                            <div className="flex min-w-0 items-center justify-between gap-2">
                                                <span className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                                    {formatMarketProduct(signal.market_product)} · {signal.delivery_point_name}
                                                </span>
                                                <span className={`text-[9px] font-bold uppercase ${marketActivityTextClass(tone.tone)}`}>{tone.shortLabel}</span>
                                            </div>
                                            <div className="mt-0.5 flex items-baseline justify-between gap-2">
                                                <span className="font-mono text-sm font-bold text-slate-100">{currency(signal.primary_value)}</span>
                                                <span className="truncate text-[9px] uppercase tracking-wider text-slate-500">
                                                    {formatAvailabilityWindowPeriod(signal.availability_window, locale)} · {ageLabel(signal.observed_at, t)}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                    <aside data-tour="forward-focus-panel" className="order-1 min-w-0 border border-slate-800 bg-[#080c13]">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-800 bg-[#080c13] px-3 py-2 xl:sticky xl:top-0 xl:z-10">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                    <Target size={12} aria-hidden="true" />
                                    {t('forwardCurve.selectedPeriod')}
                                </div>
                                <div className="mt-1 truncate text-lg font-bold text-slate-100">
                                    {activeCell ? `${formatMarketProduct(activeCell.market_product)} · ${activeCell.delivery_point_name}` : t('forwardCurve.noPeriodSelected')}
                                </div>
                                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                                    {activeCell ? formatAvailabilityWindowPeriod(activeCell.availability_window, locale) : t('forwardCurve.selectMatrixCell')}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => selectWindow(activeSlice?.previous_window)}
                                    disabled={!activeSlice?.previous_window}
                                    className="flex h-8 w-8 items-center justify-center border border-slate-700 text-slate-300 hover:border-blue-400/60 hover:text-blue-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                                    aria-label={t('forwardCurve.previousPeriod')}
                                >
                                    <ChevronLeft size={14} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => selectWindow(activeSlice?.next_window)}
                                    disabled={!activeSlice?.next_window}
                                    className="flex h-8 w-8 items-center justify-center border border-slate-700 text-slate-300 hover:border-blue-400/60 hover:text-blue-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                                    aria-label={t('forwardCurve.nextPeriod')}
                                >
                                    <ChevronRight size={14} aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        {activeCell && (
                            <div className="grid grid-cols-3 gap-px bg-slate-900">
                                <div className="bg-[#080c13] p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500">{t('forwardCurve.primary')}</div>
                                    <div className="mt-1 font-mono text-xl font-bold text-slate-100">{currency(activeCell.primary_value)}</div>
                                </div>
                                <div className="bg-[#080c13] p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500">{t('forwardCurve.source')}</div>
                                    <div className={`mt-1 text-[10px] font-bold uppercase ${activeTone ? marketActivityTextClass(activeTone.tone) : 'text-slate-500'}`}>
                                        {activeTone?.label ?? t('marketActivity.unknown.label')}
                                    </div>
                                    <div className="mt-0.5 truncate text-[9px] tracking-wider text-slate-600">
                                        {sourceLabel(activeCell.public_source_label, t)}
                                    </div>
                                </div>
                                <div className="bg-[#080c13] p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500">{t('forwardCurve.age')}</div>
                                    <div className="mt-1 font-mono text-sm font-bold text-slate-300">{ageLabel(activeCell.observed_at, t)}</div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 p-3">
                            <PriceEvidenceStrip slice={activeSlice} loading={evidenceLoading} hasSelection={Boolean(activeCell)} />
                            <div className="grid grid-cols-2 gap-3">
                                <DepthList label={t('orderBook.bids')} levels={activeSlice?.depth_bids ?? []} tone="bid" />
                                <DepthList label={t('orderBook.asks')} levels={activeSlice?.depth_asks ?? []} tone="ask" />
                            </div>
                            <div className="border border-slate-800 bg-[#080c13]">
                                <div className="border-b border-slate-800 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                    {t('forwardCurve.historicalPrints')}
                                </div>
                                <div className="max-h-[200px] divide-y divide-slate-900 overflow-y-auto">
                                    {!activeSlice || activeSlice.trades.length === 0 ? (
                                        <div className="px-3 py-6 text-center text-[11px] text-slate-500">{t('forwardCurve.noPrints')}</div>
                                    ) : activeSlice.trades.map((trade, index) => {
                                        const tone = describeMarketActivity({ source_kind: trade.source_kind, demo_status: trade.demo_status }, t);
                                        return (
                                            <div key={`${trade.confirmed_at}-${index}`} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-[11px]">
                                                <span className="min-w-0 truncate text-slate-300">
                                                    {quantity(trade.quantity_mt, locale)}
                                                    <span className={`ml-2 text-[9px] font-bold uppercase ${marketActivityTextClass(tone.tone)}`}>{tone.shortLabel}</span>
                                                </span>
                                                <span className="font-mono font-bold text-cyan-300">{currency(trade.price_per_mt_usd)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        </aside>
                    </div>
                </div>
            )}
            {table && (
                <div className="border-t border-slate-800 px-3 py-2 text-[10px] text-slate-500">
                    {locale.startsWith('zh') ? t('forwardCurve.disclaimer') : table.disclaimer}
                </div>
            )}
        </div>
    );
};
