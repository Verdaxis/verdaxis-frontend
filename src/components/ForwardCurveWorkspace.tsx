import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, ArrowRight, ChevronLeft, ChevronRight, RefreshCw, Target, TrendingUp } from 'lucide-react';

import { api } from '../services/api';
import { MARKET_PRODUCTS } from '../types';
import type {
    ForwardCurveBoardDepthLevel,
    ForwardCurveMarketCell,
    ForwardCurveSourceKind,
    ForwardCurveSliceResponse,
    ForwardCurveTableColumn,
    ForwardCurveTableRow,
    ForwardCurveTableResponse,
    MarketProduct,
    Page,
} from '../types';
import { formatAvailabilityWindow, formatAvailabilityWindowPeriod, getAvailabilityWindowOptions } from '../utils/availabilityWindow';
import { getForwardCurveHorizon, getForwardCurveTicks, type ForwardCurveHorizon } from '../utils/forwardCurveAxis';
import { formatMarketProduct, isOrderbookMarketProduct } from '../utils/marketProduct';
import { writeMarketplaceSlice } from '../utils/marketplaceSelection';
import { describeForwardCurveSignal, describeMarketActivity, marketActivityTextClass } from '../utils/marketActivity';
import { isApprovedTradingPortName } from '../utils/tradingPorts';
import type { MarketSlice } from '../utils/sliceUrl';
import { useNamespace } from '../hooks/useNamespace';
import { usePublicMarketRefresh } from '../hooks/usePublicMarketRefresh';
import { useDashboardContentReady } from '../hooks/useDashboardContentReady';
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

type LoadedSlice = {
    selectionKey: string;
    response: ForwardCurveSliceResponse;
};

type SliceReadState =
    | { status: 'idle' }
    | { status: 'loading' | 'failed'; selectionKey: string; previous: LoadedSlice | null }
    | { status: 'ready'; result: LoadedSlice };

const getLoadedSlice = (state: SliceReadState): LoadedSlice | null => {
    if (state.status === 'ready') return state.result;
    if (state.status === 'loading' || state.status === 'failed') return state.previous;
    return null;
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

const preciseCurrency = (value: number | string | null | undefined, locale = 'en') => {
    const parsed = numericValue(value);
    if (parsed == null) return '--';
    return `$${parsed.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
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
    // Only canonical saved keys can start a slice read before the table validates it.
    if (!MARKET_PRODUCTS.includes(marketProduct)
        || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(deliveryPointId)
        || !getForwardCurveTableWindows().includes(availabilityWindow)) return null;
    return { marketProduct, deliveryPointId, availabilityWindow };
};

const persistSelection = (selection: SelectedSlice) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PRODUCT_STORAGE_KEY, selection.marketProduct);
    localStorage.setItem(DELIVERY_POINT_STORAGE_KEY, selection.deliveryPointId);
    localStorage.setItem(WINDOW_STORAGE_KEY, selection.availabilityWindow);
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

const filterApprovedForwardCurveTable = (response: ForwardCurveTableResponse): ForwardCurveTableResponse => {
    const rows = response.rows
        .filter(row => isOrderbookMarketProduct(row.market_product) && isApprovedTradingPortName(row.delivery_point_name))
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
            isOrderbookMarketProduct(signal.market_product)
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

type ForwardCurveMarkSource = Pick<
    ForwardCurveMarketCell,
    'primary_source_kind' | 'demo_status'
>;

const normalizedSourceLabel = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const markSourceLabel = (value: string, t: TFunction) => (
    normalizedSourceLabel(value) === 'executableorderbookmidpoint'
        ? t('forwardCurve.summary.orderbookMidpoint')
        : sourceLabel(value, t)
);

const sourceTone = (mark: ForwardCurveMarkSource, t: TFunction) => (
    signalTone(mark.primary_source_kind, t, mark.demo_status)
);

const quoteScope = (level: ForwardCurveBoardDepthLevel | null): 'live' | 'demo' | null => {
    if (!level) return null;
    if (level.demo_status === 'REAL_ONLY' && level.source_kind === 'LIVE_ORDER') return 'live';
    if (level.demo_status === 'DEMO_ONLY' && level.source_kind === 'DEMO_SEED') return 'demo';
    return null;
};

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

const ForwardCurvePointTooltip: React.FC<{
    id: string;
    cell: ForwardCurveMarketCell;
    value: number;
    anchor: SVGGElement;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}> = ({ id, cell, value, anchor, onMouseEnter, onMouseLeave }) => {
    const { t } = useNamespace('trading');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ left: 0, top: 0 });
    const tone = sourceTone(cell, t);
    const price = (input: number | string | null | undefined) => {
        const parsed = numericValue(input);
        return parsed == null ? '--' : `$${parsed.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    const priceSource = numericValue(cell.primary_value) != null
        ? markSourceLabel(cell.public_source_label, t)
        : t(numericValue(cell.best_bid) != null && numericValue(cell.best_ask) != null
            ? 'forwardCurve.chart.tooltip.midpoint'
            : numericValue(cell.best_bid) != null
                ? 'forwardCurve.chart.tooltip.bestBid'
                : 'forwardCurve.chart.tooltip.bestAsk');

    useLayoutEffect(() => {
        const tooltip = tooltipRef.current;
        const point = anchor.querySelector('circle');
        if (!tooltip || !point) return;
        const rect = point.getBoundingClientRect();
        const bounds = tooltip.getBoundingClientRect();
        const gap = 12;
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
        let left = rect.left + rect.width / 2 - bounds.width / 2;
        let top = rect.top - bounds.height - gap;
        if (top < gap) {
            top = rect.bottom + gap;
            if (top + bounds.height > viewportHeight - gap) {
                // On short viewports, use a side so the focused point stays visible.
                left = rect.right + gap + bounds.width <= viewportWidth - gap
                    ? rect.right + gap
                    : rect.left - bounds.width - gap;
                top = rect.top + rect.height / 2 - bounds.height / 2;
            }
        }
        setPosition({
            left: Math.max(gap, Math.min(left, viewportWidth - bounds.width - gap)),
            top: Math.max(gap, Math.min(top, viewportHeight - bounds.height - gap)),
        });
    }, [anchor, cell, value, locale]);

    return createPortal(
        <div
            ref={tooltipRef}
            id={id}
            role="tooltip"
            className="dark forward-curve-console forward-curve-console__point-tooltip fixed z-[140] w-72 max-w-[calc(100vw-24px)] rounded-lg border border-slate-600 p-3 font-mono text-xs leading-relaxed text-slate-100 shadow-xl"
            style={position}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="font-bold text-sm">{formatAvailabilityWindow(cell.availability_window, locale)}</div>
                <span className={`shrink-0 ${marketActivityTextClass(tone.tone)}`}>{tone.label}</span>
            </div>
            <div className="forward-curve-console__muted">{formatMarketProduct(cell.market_product)} · {cell.delivery_point_name}</div>
            <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold tabular-nums">{price(value)}</span>
                <span className="forward-curve-console__muted">USD/MT</span>
            </div>
            <div className="forward-curve-console__muted">{priceSource}</div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-700 pt-2">
                {[
                    [t('forwardCurve.chart.tooltip.bestBid'), price(cell.best_bid)],
                    [t('forwardCurve.chart.tooltip.bestAsk'), price(cell.best_ask)],
                    [t('orderBook.spread'), price(cell.spread)],
                    [t('forwardCurve.chart.tooltip.volume'), numericValue(cell.volume_mt)?.toLocaleString(locale, { maximumFractionDigits: 2 }) ?? '--'],
                ].map(([label, detail]) => (
                    <div key={label}>
                        <dt className="forward-curve-console__muted">{label}</dt>
                        <dd className="font-semibold tabular-nums">{detail}</dd>
                    </div>
                ))}
            </dl>
            <div className="forward-curve-console__muted mt-2 border-t border-slate-700 pt-2">{t('forwardCurve.chart.tooltip.observed', { age: ageLabel(cell.observed_at, t) })}</div>
        </div>,
        document.body,
    );
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
    const [horizon, setHorizon] = useState<ForwardCurveHorizon>('All');
    const plotRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(900);
    const tooltipId = useId();
    const [tooltip, setTooltip] = useState<{ key: string; anchor: SVGGElement } | null>(null);
    const tooltipCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const cancelTooltipClose = useCallback(() => clearTimeout(tooltipCloseTimer.current), []);
    const closeTooltip = useCallback(() => {
        cancelTooltipClose();
        setTooltip(null);
    }, [cancelTooltipClose]);
    // Leave time to cross the small gap between the point and its tooltip.
    const scheduleTooltipClose = () => {
        cancelTooltipClose();
        tooltipCloseTimer.current = setTimeout(() => {
            if (document.activeElement !== tooltip?.anchor) closeTooltip();
        }, 150);
    };
    const showTooltip = (key: string, anchor: SVGGElement) => {
        cancelTooltipClose();
        setTooltip({ key, anchor });
    };
    const horizonWindows = useMemo(() => getForwardCurveHorizon(
        columns.map(column => column.availability_window), horizon,
    ), [columns, horizon]);
    const chartColumns = useMemo(() => columns.filter(
        column => horizonWindows.includes(column.availability_window),
    ), [columns, horizonWindows]);
    const left = 64;
    const right = 24;
    const plotWidth = Math.max(chartWidth - left - right, 1);
    const xForIndex = useCallback((index: number) => left + (
        chartColumns.length <= 1 ? plotWidth / 2 : index * plotWidth / (chartColumns.length - 1)
    ), [chartColumns.length, plotWidth]);
    const pointTargetWidth = Math.min(44, plotWidth / Math.max(chartColumns.length - 1, 1));
    const ticks = getForwardCurveTicks(horizonWindows, horizon, plotWidth, locale);
    const selectionOutsideHorizon = selectedCell && !horizonWindows.includes(selectedCell.availability_window);

    useEffect(() => {
        const element = plotRef.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => {
            if (entry.contentRect.width > 0) setChartWidth(entry.contentRect.width);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        closeTooltip();
    }, [horizon, curveRow, chartWidth, closeTooltip]);

    useEffect(() => cancelTooltipClose, [cancelTooltipClose]);

    useEffect(() => {
        if (!tooltip) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeTooltip();
        };
        const onScroll = (event: Event) => {
            const insideTooltip = event.target instanceof Node && document.getElementById(tooltipId)?.contains(event.target);
            if (!insideTooltip) closeTooltip();
        };
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', closeTooltip);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', closeTooltip);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [tooltip, tooltipId, closeTooltip]);

    const graph = useMemo(() => {
        const cells = chartColumns.map((column, index) => {
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
        const top = 20;
        const plotHeight = 156;
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
    }, [chartColumns, curveRow, xForIndex]);

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
    const tooltipPoint = tooltip ? graph.points.find(point => sliceKey(cellToSlice(point.cell)) === tooltip.key) : null;

    if (!ready) return null;
    return (
        <section data-tour="forward-curve-chart" className="forward-curve-console__chart-panel forward-curve-console__panel min-w-0 border bg-[#05080d]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-3 py-2">
                <div className="min-w-0">
                    <div className="forward-curve-console__label flex items-center gap-2 font-bold uppercase tracking-[0.18em]">
                        <TrendingUp size={12} className="text-blue-300" aria-hidden="true" />
                        {t('forwardCurve.title')}
                    </div>
                    <div className="forward-curve-console__muted mt-0.5 truncate">{t('forwardCurve.chart.scope', { market: curveLabel })}</div>
                    {curveRow?.market_product === 'UCOME_B100' && (
                        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-amber-200/90">{t('forwardCurve.specificationScope')}</p>
                    )}
                </div>
                <div role="group" aria-label={t('forwardCurve.chart.horizon')} className="flex shrink-0 rounded border border-slate-700 p-0.5">
                    {(['1Y', '3Y', 'All'] as const).map(value => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={horizon === value}
                            onClick={() => setHorizon(value)}
                            className={`min-h-11 min-w-11 rounded-sm px-3 text-xs font-bold transition-colors ${
                                horizon === value
                                    ? 'bg-slate-700 text-slate-100'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                            }`}
                        >
                            {t(`forwardCurve.chart.horizon${value}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-3 pb-2 pt-2">
                <div className="forward-curve-console__muted flex flex-wrap justify-between gap-x-4 gap-y-1">
                    <span>{t('forwardCurve.chart.periodCount', { count: chartColumns.length })} · USD/MT</span>
                    {chartColumns.length > 1 && (
                        <span>{formatAvailabilityWindowPeriod(chartColumns[0].availability_window, locale)} — {formatAvailabilityWindowPeriod(chartColumns[chartColumns.length - 1].availability_window, locale)}</span>
                    )}
                </div>
                {selectionOutsideHorizon && (
                    <p className="forward-curve-console__muted mt-2" role="status">{t('forwardCurve.chart.outsideHorizon')}</p>
                )}
                <div ref={plotRef} className="forward-curve-console__chart-scroll">
                    {graph.points.length === 0 ? (
                        <div className="forward-curve-console__muted flex h-[220px] items-center justify-center px-4 text-center">
                            {t('forwardCurve.chart.empty')}
                        </div>
                    ) : (
                        <svg className="forward-curve-console__chart h-56 w-full" viewBox={`0 0 ${chartWidth} 224`} role="group" aria-label={t('forwardCurve.chart.aria', { market: curveLabel })}>
                            {[0.25, 0.5, 0.75].map(fraction => {
                                const y = 20 + fraction * 156;
                                return <line key={fraction} x1={left} x2={chartWidth - right} y1={y} y2={y} stroke="#1e293b" strokeDasharray="4 6" />;
                            })}
                            <line x1={left} x2={chartWidth - right} y1="176" y2="176" stroke="#334155" />
                            <line x1={left} x2={left} y1="20" y2="176" stroke="#334155" />
                            <text className="forward-curve-console__chart-axis" x="0" y="27">{currency(graph.max)}</text>
                            <text className="forward-curve-console__chart-axis" x="0" y="178">{currency(graph.min)}</text>
                            {graph.cells.map(point => (
                                <line key={`tick-${point.index}`} x1={xForIndex(point.index)} x2={xForIndex(point.index)} y1="176" y2="181" stroke="#334155" />
                            ))}
                            {ticks.map(tick => (
                                <text
                                    key={`label-${tick.index}`}
                                    x={xForIndex(tick.index)}
                                    y="196"
                                    className="forward-curve-console__chart-label"
                                    textAnchor="middle"
                                >
                                    <tspan x={xForIndex(tick.index)}>{tick.label}</tspan>
                                    {tick.year && <tspan x={xForIndex(tick.index)} dy="17" className="forward-curve-console__chart-axis">{tick.year}</tspan>}
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
                                        aria-pressed={selected}
                                        aria-label={`${formatAvailabilityWindow(point.cell.availability_window, locale)} ${currency(point.value)}`}
                                        aria-describedby={tooltip?.key === pointKey ? tooltipId : undefined}
                                        aria-description={t('forwardCurve.chart.pointHint')}
                                        data-tooltip-active={tooltip?.key === pointKey || undefined}
                                        onMouseEnter={event => showTooltip(pointKey, event.currentTarget)}
                                        onMouseLeave={event => {
                                            if (document.activeElement !== event.currentTarget) scheduleTooltipClose();
                                        }}
                                        onFocus={event => showTooltip(pointKey, event.currentTarget)}
                                        onBlur={scheduleTooltipClose}
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
                                        className="forward-curve-console__chart-point cursor-pointer"
                                    >
                                        <rect
                                            x={point.x - pointTargetWidth / 2}
                                            y="12"
                                            width={pointTargetWidth}
                                            height="164"
                                            fill="transparent"
                                        />
                                        {bandY1 != null && bandY2 != null && (
                                            <line x1={point.x} x2={point.x} y1={bandY1} y2={bandY2} stroke="#475569" strokeWidth="5" strokeLinecap="round" />
                                        )}
                                        <circle cx={point.x} cy={point.y} r={selected ? 6 : 4.5} fill={selected ? '#34d399' : '#38bdf8'} stroke="#020617" strokeWidth="2" />
                                        <circle className={selected ? '' : 'forward-curve-console__point-ring'} cx={point.x} cy={point.y} r="10" fill="none" stroke="#34d399" strokeWidth="1.5" />
                                    </g>
                                );
                            })}
                        </svg>
                    )}
                </div>
                {tooltip && tooltipPoint && (
                    <ForwardCurvePointTooltip
                        id={tooltipId}
                        cell={tooltipPoint.cell}
                        value={tooltipPoint.value}
                        anchor={tooltip.anchor}
                        onMouseEnter={cancelTooltipClose}
                        onMouseLeave={scheduleTooltipClose}
                    />
                )}
                <div className="forward-curve-console__muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 uppercase tracking-wider">
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
                    <span className="normal-case tracking-normal">{t('forwardCurve.chart.gaps')}</span>
                </div>
            </div>
        </section>
    );
};

const SelectedPeriodSummary: React.FC<{
    cell: ForwardCurveMarketCell | null;
    slice: ForwardCurveSliceResponse | null;
    loading: boolean;
    failed: boolean;
}> = ({ cell, slice, loading, failed }) => {
    const { t, ready } = useNamespace('trading');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    if (!ready) return null;

    if (!cell) {
        return (
            <div data-tour="forward-period-detail" className="forward-curve-console__panel forward-curve-console__muted flex min-h-48 items-center justify-center border bg-[#05080d] px-4 text-center">
                {t('forwardCurve.summary.select')}
            </div>
        );
    }

    const formatPrice = (value: number | string | null | undefined) => preciseCurrency(value, locale);
    const publicSource = markSourceLabel(cell.public_source_label, t);
    const cellTone = sourceTone(cell, t);
    const bestBid = slice?.depth_bids[0] ?? null;
    const bestAsk = slice?.depth_asks[0] ?? null;
    const bidScope = quoteScope(bestBid);
    const askScope = quoteScope(bestAsk);
    const comparableQuotes = Boolean(bestBid && bestAsk && bidScope && bidScope === askScope);
    const spread = comparableQuotes && bestBid && bestAsk
        ? Number(bestAsk.price_per_mt_usd) - Number(bestBid.price_per_mt_usd)
        : null;

    const quoteCard = (
        label: string,
        level: ForwardCurveBoardDepthLevel | null,
        toneClass: string,
        emptyText: string,
    ) => {
        const scope = quoteScope(level);
        const tone = level
            ? signalTone(scope === 'live' ? 'LIVE_ORDER' : level.source_kind, t, level.demo_status)
            : null;
        return (
            <div className="min-w-0 bg-[#080c13] p-3">
                <div className={`forward-curve-console__label font-bold uppercase tracking-[0.18em] ${toneClass}`}>{label}</div>
                {level ? (
                    <>
                        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-mono text-lg font-bold tabular-nums text-slate-100">{formatPrice(level.price_per_mt_usd)}</span>
                            <span className={`forward-curve-console__badge font-bold uppercase ${tone ? marketActivityTextClass(tone.tone) : 'text-slate-400'}`}>
                                {tone?.shortLabel ?? t('marketActivity.unknown.short')}
                            </span>
                        </div>
                        <div className="forward-curve-console__muted mt-1">
                            {t('forwardCurve.summary.availableQuantity', { quantity: quantity(level.quantity_mt, locale) })}
                        </div>
                    </>
                ) : (
                    <div className="forward-curve-console__muted mt-3 min-h-10">{emptyText}</div>
                )}
            </div>
        );
    };

    return (
        <div data-tour="forward-period-detail" className="forward-curve-console__panel border bg-[#05080d]">
            <div data-curve-mark className="p-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="forward-curve-console__label font-bold uppercase tracking-[0.18em]">{t('forwardCurve.summary.mark')}</div>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="font-mono text-2xl font-bold tabular-nums text-slate-100">{formatPrice(cell.primary_value)}</span>
                            <span className="forward-curve-console__muted uppercase">{t('forwardCurve.summary.priceUnit')}</span>
                        </div>
                    </div>
                    <span className={`forward-curve-console__badge shrink-0 font-bold uppercase ${marketActivityTextClass(cellTone.tone)}`}>
                        {cellTone.shortLabel}
                    </span>
                </div>
                <dl className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                    <div>
                        <dt className="forward-curve-console__dim uppercase tracking-widest">{t('forwardCurve.source')}</dt>
                        <dd className="forward-curve-console__body mt-0.5 break-words text-slate-300">{publicSource}</dd>
                    </div>
                    <div>
                        <dt className="forward-curve-console__dim uppercase tracking-widest">{t('forwardCurve.summary.sourceUpdated')}</dt>
                        <dd className="forward-curve-console__body mt-0.5 font-mono text-slate-300">{ageLabel(cell.observed_at, t)}</dd>
                    </div>
                </dl>
                <div className="forward-curve-console__muted mt-3 border-l-2 border-blue-400/50 pl-2">
                    {t('forwardCurve.summary.notOffer')}
                </div>
            </div>

            <div className="border-t border-slate-800">
                <div className="forward-curve-console__label px-3 py-2 font-bold uppercase tracking-[0.18em]">{t('forwardCurve.summary.quotes')}</div>
                {loading ? (
                    <div className="forward-curve-console__muted flex min-h-28 items-center justify-center border-t border-slate-800">
                        <RefreshCw size={13} className="mr-2 animate-spin" aria-hidden="true" />
                        {t('forwardCurve.summary.refreshing')}
                    </div>
                ) : failed ? (
                    <div role="alert" className="border-t border-rose-900/60 bg-rose-950/30 px-3 py-4 text-xs text-rose-300">
                        {t('forwardCurve.summary.quoteError')}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-px border-t border-slate-800 bg-slate-900">
                            {quoteCard(t('forwardCurve.summary.bestBid'), bestBid, 'text-emerald-300', t('forwardCurve.summary.noBid'))}
                            {quoteCard(t('forwardCurve.summary.bestAsk'), bestAsk, 'text-rose-300', t('forwardCurve.summary.noAsk'))}
                        </div>
                        {spread != null ? (
                            <div className="forward-curve-console__body flex items-center justify-between border-t border-slate-800 px-3 py-2 text-slate-300">
                                <span>{t(spread < 0 ? 'forwardCurve.summary.crossedBy' : 'forwardCurve.summary.spread')}</span>
                                <span className="font-mono font-bold tabular-nums">{formatPrice(Math.abs(spread))}</span>
                            </div>
                        ) : bestBid && bestAsk ? (
                            <div className="forward-curve-console__dim border-t border-slate-800 px-3 py-2">
                                {t('forwardCurve.summary.mixedSpread')}
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
};

export const ForwardCurveWorkspace: React.FC<ForwardCurveWorkspaceProps> = ({ onNavigate, onOpenSlice }) => {
    const { t, ready } = useNamespace('trading');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    const [table, setTable] = useState<ForwardCurveTableResponse | null>(null);
    const [selected, setSelected] = useState<SelectedSlice | null>(() => getStoredSelection());
    const [sliceRead, setSliceRead] = useState<SliceReadState>({ status: 'idle' });
    const [loadingTable, setLoadingTable] = useState(true);
    useDashboardContentReady('FORWARD_CURVE', ready && table !== null);
    const [error, setError] = useState<string | null>(null);
    const tableRequestIdRef = useRef(0);
    const sliceRequestIdRef = useRef(0);

    const selectedCell = useMemo(() => findCell(table, selected), [table, selected]);
    // A saved key can load early; once the table arrives, retain its market boundary.
    const selectedForRead = table && !selectedCell ? null : selected;
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

    const fetchTable = useCallback(async (force = false) => {
        if (!ready) return;
        const requestId = tableRequestIdRef.current + 1;
        tableRequestIdRef.current = requestId;
        setLoadingTable(true);
        setError(null);
        try {
            const params = { windows: getForwardCurveTableWindows() };
            const response = filterApprovedForwardCurveTable(force
                ? await api.curves.table(params, { force: true })
                : await api.curves.table(params));
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

    const fetchSlice = useCallback((selection: SelectedSlice | null, force = false) => {
        if (!ready) return;
        const requestId = ++sliceRequestIdRef.current;
        if (!selection) {
            setSliceRead({ status: 'idle' });
            return;
        }

        const requestKey = sliceKey(selection);
        setSliceRead(current => ({
            status: 'loading',
            selectionKey: requestKey,
            previous: getLoadedSlice(current),
        }));
        const params = {
            market_product: selection.marketProduct,
            delivery_point_id: selection.deliveryPointId,
            availability_window: selection.availabilityWindow,
        };
        const request = force
            ? api.curves.slice(params, { force: true })
            : api.curves.slice(params);
        return request.then(response => {
            if (requestId !== sliceRequestIdRef.current) return;
            setSliceRead({
                status: 'ready',
                result: { selectionKey: requestKey, response },
            });
        }).catch(err => {
            if (requestId !== sliceRequestIdRef.current) return;
            console.error('Failed to load forward curve slice', err);
            setSliceRead(current => ({
                status: 'failed',
                selectionKey: requestKey,
                previous: getLoadedSlice(current),
            }));
        });
    }, [ready]);

    useEffect(() => {
        if (!document.hidden) void fetchTable();
        return () => { tableRequestIdRef.current += 1; };
    }, [fetchTable]);

    useEffect(() => {
        if (!document.hidden) void fetchSlice(selectedForRead);
        return () => { sliceRequestIdRef.current += 1; };
    }, [fetchSlice, selectedForRead]);

    const refresh = useCallback(async (force = false) => {
        await Promise.all([
            fetchTable(force),
            fetchSlice(selectedForRead, force),
        ]);
    }, [fetchTable, fetchSlice, selectedForRead]);
    const refreshRef = useRef(refresh);
    useLayoutEffect(() => { refreshRef.current = refresh; }, [refresh]);

    const refreshFromPublicEvent = useCallback(() => {
        if (!ready || document.hidden) return Promise.resolve();
        return refresh(true);
    }, [ready, refresh]);
    usePublicMarketRefresh(refreshFromPublicEvent, ready);

    useEffect(() => {
        if (!ready) return;
        const refreshWhenVisible = () => {
            if (!document.hidden) void refreshRef.current();
        };
        const interval = window.setInterval(refreshWhenVisible, REFRESH_INTERVAL_MS);
        document.addEventListener('visibilitychange', refreshWhenVisible);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [ready]);

    const prepareSliceRefresh = (next: SelectedSlice) => {
        sliceRequestIdRef.current += 1;
        setSliceRead(current => ({
            status: 'loading',
            selectionKey: sliceKey(next),
            previous: getLoadedSlice(current),
        }));
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
        writeMarketplaceSlice({
            portName: cell.delivery_point_name,
            deliveryPointId: cell.delivery_point_id,
            marketProduct: cell.market_product,
            availabilityWindow: cell.availability_window,
        });
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
    const loadedSlice = getLoadedSlice(sliceRead);
    const activeSlice = loadedSlice?.selectionKey === selectedKey ? loadedSlice.response : null;
    const sliceFailed = sliceRead.status === 'failed' && sliceRead.selectionKey === selectedKey;
    const latestSignals = table?.latest_signals ?? [];
    const activeCell = activeSlice?.cell ?? selectedCell;
    const evidenceLoading = sliceRead.status === 'loading' || Boolean(activeCell && !activeSlice && !sliceFailed);

    if (!ready) return null;

    return (
        <div className="forward-curve-console min-h-full bg-[#05070b] font-mono text-slate-100">
            <div className="border-b border-slate-800 bg-[#080c13] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                            <Activity size={17} aria-hidden="true" />
                        </div>
                        <div>
                            <div className="forward-curve-console__label text-xs font-bold uppercase tracking-[0.22em]">{t('forwardCurve.title')}</div>
                            <div className="forward-curve-console__muted">{t('forwardCurve.subtitle')}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => refresh(true)}
                            className="inline-flex h-8 items-center gap-1 border border-slate-700 px-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                        >
                            <RefreshCw size={12} className={loadingTable ? 'animate-spin' : ''} aria-hidden="true" />
                            {t('common.refresh')}
                        </button>
                        <button
                            data-tour="forward-open-marketplace"
                            type="button"
                            onClick={openMarketplace}
                            disabled={!activeCell}
                            className="inline-flex h-8 items-center gap-1 bg-emerald-500 px-3 text-xs font-bold uppercase tracking-wider text-[#04110c] hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                        >
                            {t('forwardCurve.openMarketplace')}
                            <ArrowRight size={13} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            {error && table && (
                <div className="border-b border-rose-900/60 bg-rose-950/30 px-4 py-2 text-sm text-rose-300">{error}</div>
            )}
            {error && !table ? (
                <div className="p-6 text-sm text-rose-300">{error}</div>
            ) : !table ? (
                <div className="forward-curve-console__muted flex h-96 items-center justify-center">
                    <RefreshCw size={14} className="mr-2 animate-spin" aria-hidden="true" />
                    {t('forwardCurve.loading')}
                </div>
            ) : table.rows.length === 0 ? (
                <div className="forward-curve-console__muted flex h-96 items-center justify-center px-6 text-center">
                    {t('forwardCurve.emptyMarkets')}
                </div>
            ) : (
                <div className="forward-curve-console__layout grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_430px]">
                    <div className="min-w-0 space-y-3">
                    <ForwardCurveChart
                        table={table}
                        columns={table.columns}
                        selectedCell={selectedCell}
                        selectedKey={selectedKey}
                        onSelectCell={selectCell}
                        onOpenCell={openMarketplaceForCell}
                    />

                    <section data-tour="forward-market-matrix" className="forward-curve-console__panel min-w-0 overflow-hidden border bg-[#080c13]">
                        <div data-tour="forward-market-matrix-header" className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                            <div>
                                <div className="forward-curve-console__label font-bold uppercase tracking-[0.18em]">{t('forwardCurve.matrix.title')}</div>
                                <div className="forward-curve-console__muted">{t('forwardCurve.matrix.subtitle')}</div>
                            </div>
                            <div className="forward-curve-console__muted uppercase tracking-wider">
                                {t('forwardCurve.matrix.dimensions', { rows: table.rows.length, periods: visibleColumns.length })}
                                {hiddenColumnCount > 0 && (
                                    <span className="forward-curve-console__dim ml-1">· {t('forwardCurve.matrix.hidden', { count: hiddenColumnCount })}</span>
                                )}
                            </div>
                        </div>
                        <div className="max-h-[calc(100vh-540px)] min-h-[280px] overflow-auto">
                            <div
                                className="forward-curve-console__body grid gap-px bg-slate-900"
                                style={{
                                    gridTemplateColumns: `220px repeat(${visibleColumns.length}, minmax(118px, 1fr))`,
                                    minWidth: `${220 + visibleColumns.length * 118}px`,
                                }}
                            >
                                <div className="forward-curve-console__muted sticky left-0 top-0 z-20 bg-[#0b111a] px-3 py-2 font-bold uppercase tracking-widest">
                                    {t('forwardCurve.matrix.productPort')}
                                </div>
                                {visibleColumns.map(column => (
                                    <div key={column.availability_window} className="sticky top-0 z-10 bg-[#0b111a] px-2 py-2 text-center">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">{formatAvailabilityWindowPeriod(column.availability_window, locale)}</div>
                                        <div className="forward-curve-console__dim mt-0.5 uppercase">{t(`forwardCurve.group.${column.group.toLowerCase()}`, { defaultValue: t('forwardCurve.group.other') })}</div>
                                    </div>
                                ))}
                                {table.rows.map(row => (
                                    <React.Fragment key={row.row_key}>
                                        <div className="sticky left-0 z-10 min-w-0 border-t border-slate-900 bg-[#080c13] px-3 py-2">
                                            <div className="truncate text-xs font-bold text-slate-200">{formatMarketProduct(row.market_product)}</div>
                                            <div className="forward-curve-console__muted mt-0.5 truncate uppercase tracking-wider">{row.delivery_point_name}</div>
                                            <div className="forward-curve-console__dim mt-0.5">{row.region}</div>
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
                                                    } ${selectedState ? 'forward-curve-console__selected' : ''} ${empty ? 'forward-curve-console__dim' : 'text-slate-200'} disabled:cursor-not-allowed`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className={`font-mono text-base font-bold ${empty ? 'forward-curve-console__dim' : 'text-slate-100'}`}>
                                                            {currency(cell?.primary_value)}
                                                        </span>
                                                        {tone && tone.tone !== 'empty' && (
                                                        <span className={`forward-curve-console__badge font-bold uppercase ${marketActivityTextClass(tone.tone)}`}>
                                                                {tone.shortLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="forward-curve-console__dim mt-1 flex items-center justify-between gap-2 tracking-wider">
                                                        <span className="min-w-0 truncate">
                                                            {cell ? markSourceLabel(cell.public_source_label, t) : t('marketActivity.empty.label')}
                                                        </span>
                                                        {!empty && cell?.observed_at && (
                                                            <span className={`shrink-0 font-mono uppercase ${stale ? 'font-bold text-amber-400' : ''}`}>
                                                                {ageLabel(cell.observed_at, t)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="forward-curve-console__body mt-2 grid grid-cols-2 gap-2 font-mono">
                                                        <span className="text-emerald-300">{t('forwardCurve.layer.bid')} {currency(cell?.best_bid)}</span>
                                                        <span className="text-right text-rose-300">{t('forwardCurve.layer.ask')} {currency(cell?.best_ask)}</span>
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
                        <section data-tour="forward-latest-signals" className="forward-curve-console__panel shrink-0 order-2 min-w-0 overflow-hidden border bg-[#080c13]">
                            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={13} className="text-blue-300" aria-hidden="true" />
                                    <div>
                                        <div className="forward-curve-console__label font-bold uppercase tracking-[0.18em]">{t('forwardCurve.signals.title')}</div>
                                        <div className="forward-curve-console__dim">{t('forwardCurve.signals.subtitle')}</div>
                                    </div>
                                </div>
                                <div className="forward-curve-console__muted uppercase tracking-wider">{ageLabel(table.generated_at, t)}</div>
                            </div>
                            <div className="grid max-h-[238px] gap-px overflow-y-auto bg-slate-900 md:grid-cols-2 xl:grid-cols-1">
                                {latestSignals.length === 0 ? (
                                    <div className="forward-curve-console__muted bg-[#080c13] px-3 py-6 text-center md:col-span-2 xl:col-span-1">
                                        {t('forwardCurve.signals.empty')}
                                    </div>
                                ) : latestSignals.slice(0, 8).map(signal => {
                                    const tone = sourceTone(signal, t);
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
                                                <span className="forward-curve-console__label truncate font-bold uppercase tracking-wider">
                                                    {formatMarketProduct(signal.market_product)} · {signal.delivery_point_name}
                                                </span>
                                                <span className={`forward-curve-console__badge font-bold uppercase ${marketActivityTextClass(tone.tone)}`}>{tone.shortLabel}</span>
                                            </div>
                                            <div className="mt-0.5 flex items-baseline justify-between gap-2">
                                                <span className="font-mono text-sm font-bold text-slate-100">{currency(signal.primary_value)}</span>
                                                <span className="forward-curve-console__dim truncate uppercase tracking-wider">
                                                    {formatAvailabilityWindowPeriod(signal.availability_window, locale)} · {ageLabel(signal.observed_at, t)}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                    <aside data-tour="forward-focus-panel" className="forward-curve-console__panel shrink-0 order-1 min-w-0 border bg-[#080c13]">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-800 bg-[#080c13] px-3 py-2 xl:sticky xl:top-0 xl:z-10">
                            <div className="min-w-0">
                                <div className="forward-curve-console__label flex items-center gap-2 font-bold uppercase tracking-[0.18em]">
                                    <Target size={12} aria-hidden="true" />
                                    {t('forwardCurve.selectedPeriod')}
                                </div>
                                <div className="mt-1 truncate text-lg font-bold text-slate-100">
                                    {activeCell ? `${formatMarketProduct(activeCell.market_product)} · ${activeCell.delivery_point_name}` : t('forwardCurve.noPeriodSelected')}
                                </div>
                                <div className="forward-curve-console__muted mt-0.5 uppercase tracking-wider">
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

                        <div className="space-y-3 p-3">
                            {activeCell?.market_product === 'UCOME_B100' && (
                                <p className="text-xs leading-relaxed text-amber-200/90">{t('forwardCurve.specificationScope')}</p>
                            )}
                            <SelectedPeriodSummary
                                cell={activeCell}
                                slice={activeSlice}
                                loading={evidenceLoading}
                                failed={sliceFailed}
                            />
                            <div className="forward-curve-console__panel border bg-[#080c13]">
                                <div className="forward-curve-console__label border-b border-slate-800 px-3 py-2 font-bold uppercase tracking-[0.18em]">
                                    {t('forwardCurve.summary.latestPrint')}
                                </div>
                                <div>
                                    {evidenceLoading ? (
                                        <div className="forward-curve-console__muted flex min-h-16 items-center justify-center px-3 py-4">
                                            <RefreshCw size={13} className="mr-2 animate-spin" aria-hidden="true" />
                                            {t('forwardCurve.summary.refreshingPrint')}
                                        </div>
                                    ) : sliceFailed ? (
                                        <div role="alert" className="bg-rose-950/30 px-3 py-4 text-xs text-rose-300">
                                            {t('forwardCurve.summary.printError')}
                                        </div>
                                    ) : !activeSlice || activeSlice.trades.length === 0 ? (
                                        <div className="forward-curve-console__muted px-3 py-6 text-center">{t('forwardCurve.noPrints')}</div>
                                    ) : activeSlice.trades.slice(0, 1).map((trade, index) => {
                                        const tone = describeMarketActivity({ source_kind: trade.source_kind, demo_status: trade.demo_status }, t);
                                        return (
                                            <div key={`${trade.confirmed_at}-${index}`} className="forward-curve-console__body grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2">
                                                <span className="min-w-0 text-slate-300">
                                                    <span>{quantity(trade.quantity_mt, locale)} · {ageLabel(trade.confirmed_at, t)}</span>
                                                    <span className={`forward-curve-console__badge ml-2 font-bold uppercase ${marketActivityTextClass(tone.tone)}`}>{tone.shortLabel}</span>
                                                </span>
                                                <span className="text-right">
                                                    <span className="font-mono font-bold tabular-nums text-cyan-300">{preciseCurrency(trade.price_per_mt_usd, locale)}</span>
                                                    <span className="forward-curve-console__dim ml-1 uppercase">{t('forwardCurve.summary.priceUnit')}</span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={openMarketplace}
                                disabled={!activeCell}
                                className="inline-flex h-9 w-full items-center justify-center gap-1 border border-emerald-500/50 bg-emerald-500/10 px-3 text-xs font-bold uppercase tracking-wider text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-transparent disabled:text-slate-500"
                            >
                                {t('forwardCurve.viewOrderBook')}
                                <ArrowRight size={13} aria-hidden="true" />
                            </button>
                        </div>
                        </aside>
                    </div>
                </div>
            )}
            {table && (
                <div className="forward-curve-console__muted border-t border-slate-800 px-3 py-2">
                    {locale.startsWith('zh') ? t('forwardCurve.disclaimer') : table.disclaimer}
                </div>
            )}
        </div>
    );
};
