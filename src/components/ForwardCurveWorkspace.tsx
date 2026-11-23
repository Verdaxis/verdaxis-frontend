import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './ForwardCurveWorkspace.css';
import { createPortal } from 'react-dom';
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

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
import { getForwardCurveHorizon, getForwardCurveTicks, getPriceTicks, type ForwardCurveHorizon } from '../utils/forwardCurveAxis';
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

// Chart plot margins in pixels: room for price labels (left) and the two-line period axis (bottom).
const CHART_MARGIN = { top: 12, right: 16, bottom: 44, left: 60 };
// Used until the chart container is measured (and in tests, where it never is).
const DEFAULT_CHART_HEIGHT = 300;
const MATRIX_LABEL_WIDTH = 176;
const MATRIX_PERIOD_MIN_WIDTH = 92;

const getForwardCurveTableWindows = () => getAvailabilityWindowOptions().map(option => option.value);

// Every curve value reaches this screen as a number: the curve boundary
// converts each wire decimal once (see `src/api/mappers.ts`). A malformed value
// is already NaN, so these helpers only have to test for it.
const currency = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return '--';
    return `$${value.toFixed(0)}`;
};

const preciseCurrency = (value: number | null | undefined, locale = 'en') => {
    const parsed = numericValue(value);
    if (parsed == null) return '--';
    return `$${parsed.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
};

const numericValue = (value: number | null | undefined) => (
    value != null && Number.isFinite(value) ? value : null
);

const quantity = (value: number | null | undefined, locale = 'en') => {
    if (value == null || !Number.isFinite(value) || value <= 0) return '--';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k MT`;
    return `${value.toLocaleString(locale)} MT`;
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
    const price = (input: number | null | undefined) => {
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
            className="forward-curve-console__point-tooltip fixed z-[140] w-max max-w-[calc(100vw-24px)] rounded-lg border px-3.5 py-2.5 text-xs shadow-lg"
            style={position}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="flex items-baseline justify-between gap-6">
                <div className="flex min-w-0 items-baseline gap-2">
                    <span className="text-sm font-bold">{formatAvailabilityWindow(cell.availability_window, locale)}</span>
                    <span className="forward-curve-console__dim truncate">{t('forwardCurve.chart.tooltip.observed', { age: ageLabel(cell.observed_at, t) })}</span>
                </div>
                <span className={`shrink-0 font-semibold ${marketActivityTextClass(tone.tone)}`}>{tone.label}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-4">
                <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-bold leading-6 tabular-nums">{price(value)}</span>
                        <span className="forward-curve-console__dim">USD/MT</span>
                    </div>
                    <div className="forward-curve-console__dim sm:whitespace-nowrap">{priceSource}</div>
                </div>
                <dl className="forward-curve-console__rule grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 border-l pl-4">
                    {[
                        [t('forwardCurve.chart.tooltip.bestBid'), price(cell.best_bid)],
                        [t('forwardCurve.chart.tooltip.bestAsk'), price(cell.best_ask)],
                        [t('orderBook.spread'), price(cell.spread)],
                        [t('forwardCurve.chart.tooltip.volume'), numericValue(cell.volume_mt)?.toLocaleString(locale, { maximumFractionDigits: 2 }) ?? '--'],
                    ].map(([label, detail]) => (
                        <div key={label} className="flex items-baseline justify-between gap-2">
                            <dt className="forward-curve-console__dim whitespace-nowrap">{label}</dt>
                            <dd className="font-semibold tabular-nums">{detail}</dd>
                        </div>
                    ))}
                </dl>
            </div>
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
    const [chartHeight, setChartHeight] = useState(DEFAULT_CHART_HEIGHT);
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
    const { top, right, bottom, left } = CHART_MARGIN;
    const plotHeight = Math.max(chartHeight - top - bottom, 1);
    const baselineY = top + plotHeight;
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
            if (entry.contentRect.height > 0) setChartHeight(entry.contentRect.height);
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
            return { cells, points: [], priceTicks: [] };
        }

        const rawMin = Math.min(...priceValues);
        const rawMax = Math.max(...priceValues);
        const padding = Math.max((rawMax - rawMin) * 0.16, 8);
        const min = rawMin - padding;
        const max = rawMax + padding;
        const range = Math.max(max - min, 1);
        const yForValue = (value: number | null | undefined) => {
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

        const priceTicks = getPriceTicks(min, max).map(value => ({ value, y: yForValue(value) }));

        return { cells, points, priceTicks };
    }, [chartColumns, curveRow, xForIndex, top, plotHeight]);

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
        <section data-tour="forward-curve-chart" className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
                <p className="forward-curve-console__muted min-w-0">
                    <span className="forward-curve-console__ink-2 font-bold">{t('forwardCurve.chart.scope', { market: curveLabel })}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{t('forwardCurve.chart.periodCount', { count: chartColumns.length })} · USD/MT</span>
                    {chartColumns.length > 1 && (
                        <span> · {formatAvailabilityWindowPeriod(chartColumns[0].availability_window, locale)} — {formatAvailabilityWindowPeriod(chartColumns[chartColumns.length - 1].availability_window, locale)}</span>
                    )}
                </p>
                <div role="group" aria-label={t('forwardCurve.chart.horizon')} className="flex shrink-0 gap-1">
                    {(['1Y', '3Y', 'All'] as const).map(value => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={horizon === value}
                            onClick={() => setHorizon(value)}
                            className={`forward-curve-console__tab h-8 min-w-10 px-2.5 text-[13px] font-bold ${
                                horizon === value ? 'forward-curve-console__tab--active' : ''
                            }`}
                        >
                            {t(`forwardCurve.chart.horizon${value}`)}
                        </button>
                    ))}
                </div>
            </div>
            {curveRow?.market_product === 'UCOME_B100' && (
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-amber-700 dark:text-amber-300">{t('forwardCurve.specificationScope')}</p>
            )}
            {selectionOutsideHorizon && (
                <p className="forward-curve-console__muted mt-1" role="status">{t('forwardCurve.chart.outsideHorizon')}</p>
            )}

            <div ref={plotRef} className="forward-curve-console__chart-scroll mt-2">
                {graph.points.length === 0 ? (
                    <div className="forward-curve-console__muted flex h-full items-center justify-center px-4 text-center">
                        {t('forwardCurve.chart.empty')}
                    </div>
                ) : (
                    <svg className="forward-curve-console__chart h-full w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="group" aria-label={t('forwardCurve.chart.aria', { market: curveLabel })}>
                        {graph.priceTicks.map(tick => (
                            <g key={`price-${tick.value}`}>
                                <line className="forward-curve-console__chart-grid" x1={left} x2={chartWidth - right} y1={tick.y} y2={tick.y} />
                                <text className="forward-curve-console__chart-axis" x={left - 12} y={tick.y + 4} textAnchor="end">{currency(tick.value)}</text>
                            </g>
                        ))}
                        <line className="forward-curve-console__chart-baseline" x1={left} x2={chartWidth - right} y1={baselineY} y2={baselineY} />
                        {graph.cells.map(point => (
                            <line className="forward-curve-console__chart-baseline" key={`tick-${point.index}`} x1={xForIndex(point.index)} x2={xForIndex(point.index)} y1={baselineY} y2={baselineY + 4} />
                        ))}
                        {ticks.map(tick => (
                            <text
                                key={`label-${tick.index}`}
                                x={xForIndex(tick.index)}
                                y={baselineY + 20}
                                className="forward-curve-console__chart-label"
                                textAnchor="middle"
                            >
                                <tspan x={xForIndex(tick.index)}>{tick.label}</tspan>
                                {tick.year && <tspan x={xForIndex(tick.index)} dy="16" className="forward-curve-console__chart-axis">{tick.year}</tspan>}
                            </text>
                        ))}
                        {pathSegments.map((segment, index) => (
                            <path className="forward-curve-console__chart-line" key={`segment-${index}`} d={segment} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                                        y={top - 8}
                                        width={pointTargetWidth}
                                        height={plotHeight + 8}
                                        fill="transparent"
                                    />
                                    {selected && (
                                        <line className="forward-curve-console__chart-selected-guide" x1={point.x} x2={point.x} y1={point.y} y2={baselineY} />
                                    )}
                                    {bandY1 != null && bandY2 != null && (
                                        <line className="forward-curve-console__chart-band" x1={point.x} x2={point.x} y1={bandY1} y2={bandY2} strokeWidth="3" strokeLinecap="round" />
                                    )}
                                    <circle
                                        className={selected ? 'forward-curve-console__chart-dot--selected' : 'forward-curve-console__chart-dot'}
                                        cx={point.x}
                                        cy={point.y}
                                        r={selected ? 5.5 : 3.5}
                                        strokeWidth="2"
                                    />
                                    <circle className={`forward-curve-console__chart-ring ${selected ? '' : 'forward-curve-console__point-ring'}`} cx={point.x} cy={point.y} r="10" fill="none" strokeWidth="1.5" />
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
            <div className="forward-curve-console__dim mt-1 flex flex-wrap items-center gap-x-5 gap-y-1" style={{ paddingLeft: left }}>
                <span className="flex items-center gap-1.5">
                    <span className="forward-curve-console__legend-line h-0.5 w-4 rounded-full" aria-hidden="true" />
                    {t('forwardCurve.chart.midPrimary')}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="forward-curve-console__legend-band h-3 w-[3px] rounded-full" aria-hidden="true" />
                    {t('forwardCurve.chart.bidAskRange')}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="forward-curve-console__legend-selected h-2.5 w-2.5 rounded-full" aria-hidden="true" />
                    {t('forwardCurve.selectedPeriod')}
                </span>
                <span>{t('forwardCurve.chart.gaps')}</span>
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
            <div data-tour="forward-period-detail" className="forward-curve-console__muted flex min-h-40 items-center">
                {t('forwardCurve.summary.select')}
            </div>
        );
    }

    const formatPrice = (value: number | null | undefined) => preciseCurrency(value, locale);
    const publicSource = markSourceLabel(cell.public_source_label, t);
    const cellTone = sourceTone(cell, t);
    const bestBid = slice?.depth_bids[0] ?? null;
    const bestAsk = slice?.depth_asks[0] ?? null;
    const bidScope = quoteScope(bestBid);
    const askScope = quoteScope(bestAsk);
    const comparableQuotes = Boolean(bestBid && bestAsk && bidScope && bidScope === askScope);
    const spread = comparableQuotes && bestBid && bestAsk
        ? bestAsk.price_per_mt_usd - bestBid.price_per_mt_usd
        : null;

    const quoteColumn = (
        label: string,
        level: ForwardCurveBoardDepthLevel | null,
        labelClass: string,
        emptyText: string,
    ) => {
        const scope = quoteScope(level);
        const tone = level
            ? signalTone(scope === 'live' ? 'LIVE_ORDER' : level.source_kind, t, level.demo_status)
            : null;
        const toneLabel = tone?.shortLabel ?? t('marketActivity.unknown.short');
        // The curve mark already names its source once. A quote repeats it for
        // screen readers only, and shows it when its source is different.
        const sameSourceAsMark = toneLabel === cellTone.shortLabel;
        return (
            <div className="min-w-0">
                <div className={`forward-curve-console__body font-bold ${labelClass}`}>{label}</div>
                {level ? (
                    <>
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                            <span className="forward-curve-console__ink text-lg font-bold leading-6 tabular-nums">{formatPrice(level.price_per_mt_usd)}</span>
                            <span className={sameSourceAsMark
                                ? 'sr-only'
                                : `forward-curve-console__badge font-bold ${tone ? marketActivityTextClass(tone.tone) : 'forward-curve-console__muted'}`}
                            >
                                {toneLabel}
                            </span>
                        </div>
                        <div className="forward-curve-console__dim">
                            {t('forwardCurve.summary.availableQuantity', { quantity: quantity(level.quantity_mt, locale) })}
                        </div>
                    </>
                ) : (
                    <div className="forward-curve-console__dim mt-1">{emptyText}</div>
                )}
            </div>
        );
    };

    return (
        <div data-tour="forward-period-detail">
            <div data-curve-mark>
                <div className="forward-curve-console__muted">{t('forwardCurve.summary.mark')}</div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="forward-curve-console__headline tabular-nums">{formatPrice(cell.primary_value)}</span>
                    <span className="forward-curve-console__muted">{t('forwardCurve.summary.priceUnit')}</span>
                    <span className={`forward-curve-console__badge font-bold ${marketActivityTextClass(cellTone.tone)}`}>
                        {cellTone.shortLabel}
                    </span>
                </div>
                <dl className="forward-curve-console__muted mt-1.5 flex flex-wrap gap-x-1.5">
                    <dt className="sr-only">{t('forwardCurve.source')}</dt>
                    <dd className="forward-curve-console__ink-2 break-words">{publicSource}</dd>
                    <span aria-hidden="true">·</span>
                    <dt className="sr-only">{t('forwardCurve.summary.sourceUpdated')}</dt>
                    <dd className="tabular-nums" title={t('forwardCurve.summary.sourceUpdated')}>{ageLabel(cell.observed_at, t)}</dd>
                </dl>
                <p className="forward-curve-console__dim mt-0.5">{t('forwardCurve.summary.notOffer')}</p>
            </div>

            <div className="forward-curve-console__rule mt-3 border-t pt-3">
                <h3 className="sr-only">{t('forwardCurve.summary.quotes')}</h3>
                {loading ? (
                    <div className="forward-curve-console__muted flex min-h-[92px] items-center">
                        <RefreshCw size={13} className="mr-2 animate-spin" aria-hidden="true" />
                        {t('forwardCurve.summary.refreshing')}
                    </div>
                ) : failed ? (
                    <div role="alert" className="min-h-[92px] text-xs text-rose-700 dark:text-rose-300">
                        {t('forwardCurve.summary.quoteError')}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-x-6">
                            {quoteColumn(t('forwardCurve.summary.bestBid'), bestBid, 'forward-curve-console__bid', t('forwardCurve.summary.noBid'))}
                            {quoteColumn(t('forwardCurve.summary.bestAsk'), bestAsk, 'forward-curve-console__ask', t('forwardCurve.summary.noAsk'))}
                        </div>
                        {spread != null ? (
                            <div className="forward-curve-console__body mt-2 flex items-baseline justify-between">
                                <span className="forward-curve-console__muted">{t(spread < 0 ? 'forwardCurve.summary.crossedBy' : 'forwardCurve.summary.spread')}</span>
                                <span className="forward-curve-console__ink font-bold tabular-nums">{formatPrice(Math.abs(spread))}</span>
                            </div>
                        ) : bestBid && bestAsk ? (
                            <div className="forward-curve-console__dim mt-2">
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
    // One legend entry per source kind in the matrix; each cell then needs only a dot.
    const matrixTones = useMemo(() => {
        const tones = new Map<string, ReturnType<typeof sourceTone>>();
        allCells.filter(cellHasSignal).forEach(cell => {
            const tone = sourceTone(cell, t);
            if (tone.tone !== 'empty') tones.set(tone.shortLabel, tone);
        });
        return [...tones.values()];
    }, [allCells, t]);
    // When every mark has the same source, the legend says so once and the cells stay plain.
    const showCellSourceDots = matrixTones.length > 1;

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
        <div className="forward-curve-console min-h-full">
            <header className="forward-curve-console__gutter flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3 pt-4">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                    <h1 className="forward-curve-console__ink text-lg font-semibold leading-7">{t('forwardCurve.title')}</h1>
                    <p className="forward-curve-console__muted">{t('forwardCurve.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => refresh(true)}
                        className="forward-curve-console__quiet-button inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-bold"
                    >
                        <RefreshCw size={14} className={loadingTable ? 'animate-spin' : ''} aria-hidden="true" />
                        {t('common.refresh')}
                    </button>
                    <button
                        data-tour="forward-open-marketplace"
                        type="button"
                        onClick={openMarketplace}
                        disabled={!activeCell}
                        title={activeCell
                            ? t('forwardCurve.openMarketplaceHint', {
                                market: `${formatMarketProduct(activeCell.market_product)} · ${activeCell.delivery_point_name}`,
                            })
                            : undefined}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-[13px] font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                    >
                        {t('forwardCurve.openMarketplace')}
                        <ArrowRight size={14} aria-hidden="true" />
                    </button>
                </div>
            </header>

            {error && table && (
                <div className="forward-curve-console__gutter border-y border-rose-200 bg-rose-50 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>
            )}
            {error && !table ? (
                <div className="forward-curve-console__gutter py-6 text-sm text-rose-700 dark:text-rose-300">{error}</div>
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
                <>
                    {/* The selected period comes first, in reading and keyboard order; on wide screens it is the left column. */}
                    <div className="forward-curve-console__gutter forward-curve-console__rule grid gap-x-12 gap-y-6 border-t pb-5 pt-4 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
                        <aside data-tour="forward-focus-panel" className="min-w-0">
                            <div className="flex items-center justify-between gap-3">
                                <div className="forward-curve-console__muted">{t('forwardCurve.selectedPeriod')}</div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => selectWindow(activeSlice?.previous_window)}
                                        disabled={!activeSlice?.previous_window}
                                        className="forward-curve-console__step-button flex h-7 w-7 items-center justify-center rounded-full border"
                                        aria-label={t('forwardCurve.previousPeriod')}
                                    >
                                        <ChevronLeft size={14} aria-hidden="true" />
                                    </button>
                                    <span className="forward-curve-console__ink-2 min-w-[4.5rem] px-1.5 text-center text-sm font-bold" aria-live="polite">
                                        {activeCell ? formatAvailabilityWindowPeriod(activeCell.availability_window, locale) : t('forwardCurve.selectMatrixCell')}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => selectWindow(activeSlice?.next_window)}
                                        disabled={!activeSlice?.next_window}
                                        className="forward-curve-console__step-button flex h-7 w-7 items-center justify-center rounded-full border"
                                        aria-label={t('forwardCurve.nextPeriod')}
                                    >
                                        <ChevronRight size={14} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                            <h2 className="forward-curve-console__ink mt-1 break-words text-xl font-semibold leading-7">
                                {activeCell ? `${formatMarketProduct(activeCell.market_product)} · ${activeCell.delivery_point_name}` : t('forwardCurve.noPeriodSelected')}
                            </h2>
                            {activeCell?.market_product === 'UCOME_B100' && (
                                <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-300">{t('forwardCurve.specificationScope')}</p>
                            )}
                            <div className="mt-3">
                                <SelectedPeriodSummary
                                    cell={activeCell}
                                    slice={activeSlice}
                                    loading={evidenceLoading}
                                    failed={sliceFailed}
                                />
                            </div>

                            <div className="forward-curve-console__rule mt-3 border-t pt-3">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="forward-curve-console__muted">{t('forwardCurve.summary.latestPrint')}</span>
                                    <button
                                        type="button"
                                        onClick={openMarketplace}
                                        disabled={!activeCell}
                                        className="forward-curve-console__link inline-flex shrink-0 items-center gap-1 text-[13px] font-bold"
                                    >
                                        {t('forwardCurve.viewOrderBook')}
                                        <ArrowRight size={13} aria-hidden="true" />
                                    </button>
                                </div>
                                {evidenceLoading ? (
                                    <div className="forward-curve-console__dim mt-0.5 flex items-center">
                                        <RefreshCw size={12} className="mr-2 animate-spin" aria-hidden="true" />
                                        {t('forwardCurve.summary.refreshingPrint')}
                                    </div>
                                ) : sliceFailed ? (
                                    <div role="alert" className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">
                                        {t('forwardCurve.summary.printError')}
                                    </div>
                                ) : !activeSlice || activeSlice.trades.length === 0 ? (
                                    <div className="forward-curve-console__dim mt-0.5">{t('forwardCurve.noPrints')}</div>
                                ) : activeSlice.trades.slice(0, 1).map((trade, index) => {
                                    const tone = describeMarketActivity({ source_kind: trade.source_kind, demo_status: trade.demo_status }, t);
                                    return (
                                        <div key={`${trade.confirmed_at}-${index}`} className="forward-curve-console__body mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3">
                                            <span>
                                                <span className="forward-curve-console__ink font-bold tabular-nums">{preciseCurrency(trade.price_per_mt_usd, locale)}</span>
                                                <span className="forward-curve-console__dim ml-1">{t('forwardCurve.summary.priceUnit')}</span>
                                            </span>
                                            <span className="forward-curve-console__muted">
                                                <span>{quantity(trade.quantity_mt, locale)} · {ageLabel(trade.confirmed_at, t)}</span>
                                                <span className={`forward-curve-console__badge ml-2 font-bold ${marketActivityTextClass(tone.tone)}`}>{tone.shortLabel}</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </aside>

                        <div className="min-w-0">
                            <ForwardCurveChart
                                table={table}
                                columns={table.columns}
                                selectedCell={selectedCell}
                                selectedKey={selectedKey}
                                onSelectCell={selectCell}
                                onOpenCell={openMarketplaceForCell}
                            />
                        </div>
                    </div>

                    <section data-tour="forward-market-matrix" className="forward-curve-console__rule min-w-0 border-t pt-4">
                        <div data-tour="forward-market-matrix-header" className="forward-curve-console__gutter flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-2">
                            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                                <h2 className="forward-curve-console__ink text-base font-semibold">{t('forwardCurve.matrix.title')}</h2>
                                <p className="forward-curve-console__dim">{t('forwardCurve.matrix.subtitle')}</p>
                            </div>
                            <div className="forward-curve-console__muted flex flex-wrap items-center gap-x-4">
                                {matrixTones.map(tone => (
                                    <span key={tone.shortLabel} className="flex items-center gap-1.5" title={tone.detail}>
                                        <span className={`h-1.5 w-1.5 rounded-full bg-current ${marketActivityTextClass(tone.tone)}`} aria-hidden="true" />
                                        {matrixTones.length === 1 ? t('forwardCurve.matrix.singleSource', { source: tone.label }) : tone.label}
                                    </span>
                                ))}
                                <span>
                                    {t('forwardCurve.matrix.dimensions', { rows: table.rows.length, periods: visibleColumns.length })}
                                    {hiddenColumnCount > 0 && (
                                        <span className="forward-curve-console__dim ml-1">· {t('forwardCurve.matrix.hidden', { count: hiddenColumnCount })}</span>
                                    )}
                                </span>
                            </div>
                        </div>
                        <div className="forward-curve-console__gutter overflow-auto [@media(min-height:900px)]:max-h-[calc(100vh-690px)] [@media(min-height:900px)]:min-h-[300px]">
                            <div
                                className="grid"
                                style={{
                                    gridTemplateColumns: `${MATRIX_LABEL_WIDTH}px repeat(${visibleColumns.length}, minmax(${MATRIX_PERIOD_MIN_WIDTH}px, 1fr))`,
                                    minWidth: `${MATRIX_LABEL_WIDTH + visibleColumns.length * MATRIX_PERIOD_MIN_WIDTH}px`,
                                }}
                            >
                                <div className="forward-curve-console__matrix-head forward-curve-console__muted sticky left-0 top-0 z-20 py-2 pr-3">
                                    {t('forwardCurve.matrix.productPort')}
                                </div>
                                {visibleColumns.map(column => (
                                    <div
                                        key={column.availability_window}
                                        title={t(`forwardCurve.group.${column.group.toLowerCase()}`, { defaultValue: t('forwardCurve.group.other') })}
                                        className={`forward-curve-console__matrix-head forward-curve-console__body sticky top-0 z-10 px-3 py-2 text-right font-bold ${
                                            column.availability_window === selected?.availabilityWindow ? 'forward-curve-console__ink' : 'forward-curve-console__muted'
                                        }`}
                                    >
                                        {formatAvailabilityWindowPeriod(column.availability_window, locale)}
                                        <div className="forward-curve-console__dim text-[11px] font-normal">
                                            {t(`forwardCurve.group.${column.group.toLowerCase()}`, { defaultValue: t('forwardCurve.group.other') })}
                                        </div>
                                    </div>
                                ))}
                                {table.rows.map(row => {
                                    const selectedRow = row.market_product === selected?.marketProduct
                                        && row.delivery_point_id === selected?.deliveryPointId;
                                    return (
                                        <React.Fragment key={row.row_key}>
                                            <div className={`forward-curve-console__matrix-label sticky left-0 z-10 min-w-0 border-t py-1.5 pr-3 ${selectedRow ? 'forward-curve-console__matrix-label--selected' : ''}`}>
                                                <div className="forward-curve-console__ink truncate text-[13px] font-bold">{formatMarketProduct(row.market_product)}</div>
                                                <div className="forward-curve-console__dim truncate"><span>{row.delivery_point_name}</span> · <span>{row.region}</span></div>
                                            </div>
                                            {visibleColumns.map(column => {
                                                const cell = row.cells[column.availability_window];
                                                const selectedCellKey = sliceKey(cell ? cellToSlice(cell) : null);
                                                const selectedState = Boolean(cell && selectedCellKey === selectedKey);
                                                const tone = cell ? sourceTone(cell, t) : null;
                                                const empty = !cell || !cellHasSignal(cell);
                                                const stale = cell?.staleness_status === 'STALE';
                                                const bid = numericValue(cell?.best_bid);
                                                const ask = numericValue(cell?.best_ask);
                                                return (
                                                    <button
                                                        key={`${row.row_key}-${column.availability_window}`}
                                                        type="button"
                                                        onClick={() => cell && selectCell(cell)}
                                                        onDoubleClick={() => cell && openMarketplaceForCell(cell)}
                                                        disabled={!cell}
                                                        aria-pressed={selectedState}
                                                        title={cell
                                                            ? `${markSourceLabel(cell.public_source_label, t)}${!empty && cell.observed_at ? ` · ${ageLabel(cell.observed_at, t)}` : ''}\n${t('forwardCurve.matrix.cellTitle')}`
                                                            : undefined}
                                                        className={`forward-curve-console__matrix-cell min-h-[44px] border-t px-3 py-1.5 text-right disabled:cursor-not-allowed ${
                                                            selectedState ? 'forward-curve-console__selected' : ''
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {tone && tone.tone !== 'empty' && (
                                                                <span className={`inline-flex items-center ${marketActivityTextClass(tone.tone)}`}>
                                                                    {/* Mixed sources: show the label as text, so it never depends on colour alone. */}
                                                                    <span className={showCellSourceDots ? 'text-[10px] font-bold uppercase tracking-wide' : 'sr-only'}>{tone.shortLabel}</span>
                                                                </span>
                                                            )}
                                                            <span className={`text-sm font-bold tabular-nums ${empty ? 'forward-curve-console__dim' : 'forward-curve-console__ink'}`}>
                                                                {currency(cell?.primary_value)}
                                                            </span>
                                                        </div>
                                                        <div className="forward-curve-console__dim tabular-nums">
                                                            {empty && bid == null && ask == null ? (
                                                                <span>{cell ? markSourceLabel(cell.public_source_label, t) : t('marketActivity.empty.label')}</span>
                                                            ) : (
                                                                <span aria-label={`${t('forwardCurve.layer.bid')} ${currency(cell?.best_bid)}, ${t('forwardCurve.layer.ask')} ${currency(cell?.best_ask)}`}>
                                                                    {bid?.toFixed(0) ?? '--'} / {ask?.toFixed(0) ?? '--'}
                                                                </span>
                                                            )}
                                                            {stale && !empty && cell?.observed_at && (
                                                                <span className="ml-1.5 font-bold text-amber-700 dark:text-amber-400">{ageLabel(cell.observed_at, t)}</span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                        <p className="forward-curve-console__gutter forward-curve-console__dim pt-2">
                            {t('forwardCurve.chart.midPrimary')} · {t('forwardCurve.layer.bid')} / {t('forwardCurve.layer.ask')} · USD/MT
                        </p>
                    </section>

                    <section data-tour="forward-latest-signals" className="forward-curve-console__gutter forward-curve-console__rule mt-6 min-w-0 border-t pb-2 pt-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-2">
                            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                                <h2 className="forward-curve-console__ink text-base font-semibold">{t('forwardCurve.signals.title')}</h2>
                                <p className="forward-curve-console__dim">{t('forwardCurve.signals.subtitle')}</p>
                            </div>
                            <div className="forward-curve-console__muted">{ageLabel(table.generated_at, t)}</div>
                        </div>
                        {latestSignals.length === 0 ? (
                            <div className="forward-curve-console__muted py-6">
                                {t('forwardCurve.signals.empty')}
                            </div>
                        ) : (
                            <div className="grid gap-x-10 sm:grid-cols-2 xl:grid-cols-4">
                                {latestSignals.slice(0, 8).map(signal => {
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
                                            className="forward-curve-console__signal forward-curve-console__rule min-w-0 border-t py-2 text-left"
                                        >
                                            <div className="flex min-w-0 items-baseline justify-between gap-2">
                                                <span className="forward-curve-console__ink-2 truncate text-[13px] font-bold">
                                                    {formatMarketProduct(signal.market_product)} · {signal.delivery_point_name}
                                                </span>
                                                <span className="forward-curve-console__ink text-sm font-bold tabular-nums">{currency(signal.primary_value)}</span>
                                            </div>
                                            <div className="flex items-baseline justify-between gap-2">
                                                <span className="forward-curve-console__dim truncate">
                                                    {formatAvailabilityWindowPeriod(signal.availability_window, locale)} · {ageLabel(signal.observed_at, t)}
                                                </span>
                                                <span className={`forward-curve-console__badge font-bold ${marketActivityTextClass(tone.tone)}`}>{tone.shortLabel}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            )}
            {table && (
                <div className="forward-curve-console__gutter forward-curve-console__dim py-4">
                    {locale.startsWith('zh') ? t('forwardCurve.disclaimer') : table.disclaimer}
                </div>
            )}
        </div>
    );
};
