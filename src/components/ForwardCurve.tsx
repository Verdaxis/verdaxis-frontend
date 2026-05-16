import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createChart, LineSeries, AreaSeries, CrosshairMode, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { Download, RefreshCw, TrendingUp, Lock } from 'lucide-react';
import { useToast } from './Toast';
import { api } from '../services/api';
import { Product, ForwardCurveResponse, Subscription, MarketProduct } from '../types';
import { useNamespace } from '../hooks/useNamespace';
import { useTheme } from '../context/ThemeContext';
import {
    formatAvailabilityWindow,
    formatAvailabilityWindowPeriod,
    normalizeAvailabilityWindow,
} from '../utils/availabilityWindow';
import { availabilityWindowToChartTime, serializeChartTime } from '../utils/curveChart';

interface ForwardCurveProps {
    initialProductId?: string;
    /** When set, auto-select the product matching this fuel type and hide the product selector */
    fuelType?: string;
    /** When set, auto-select the canonical market product and hide the product selector */
    marketProductCode?: MarketProduct;
    /** When set, pass as delivery_point filter to the forward curve API */
    deliveryPointName?: string;
    /** Called when user clicks a period on the chart */
    onPeriodClick?: (availabilityWindow: string) => void;
    embedded?: boolean;
}

const REFRESH_INTERVAL_MS = 30_000;

const addMonthOffset = (year: number, month: number, offset: number) => {
    const zeroBased = month - 1 + offset;
    return {
        year: year + Math.floor(zeroBased / 12),
        month: (zeroBased % 12) + 1,
    };
};

const formatMonthWindow = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

const formatQuarterWindow = (year: number, quarter: number) => `${year}-Q${quarter}`;

const formatCalendarWindow = (year: number) => `${year}-CAL`;

const MONTH_WINDOW_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const QUARTER_WINDOW_RE = /^(\d{4})-Q([1-4])$/;
const CALENDAR_WINDOW_RE = /^(\d{4})-CAL$/;

const getCurveWindowRank = (window: string) => {
    if (window === 'SPOT') return [0, 0, 0];
    const monthMatch = window.match(MONTH_WINDOW_RE);
    if (monthMatch) return [1, Number(monthMatch[1]), Number(monthMatch[2])];
    const quarterMatch = window.match(QUARTER_WINDOW_RE);
    if (quarterMatch) return [2, Number(quarterMatch[1]), Number(quarterMatch[2])];
    const calendarMatch = window.match(CALENDAR_WINDOW_RE);
    if (calendarMatch) return [3, Number(calendarMatch[1]), 0];
    return [4, Number.MAX_SAFE_INTEGER, 0];
};

const compareCurveWindows = (left: string, right: string) => {
    const a = getCurveWindowRank(left);
    const b = getCurveWindowRank(right);
    for (let index = 0; index < a.length; index += 1) {
        if (a[index] !== b[index]) return a[index] - b[index];
    }
    return 0;
};

export function selectVisibleCurvePoints(points: ForwardCurveResponse['curve'], now: Date = new Date()) {
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();
    const currentQuarter = Math.floor((month - 1) / 3) + 1;

    const allowedMonths = new Set<string>();
    for (let index = 1; index <= 6; index += 1) {
        const nextMonth = addMonthOffset(year, month, index);
        allowedMonths.add(formatMonthWindow(nextMonth.year, nextMonth.month));
    }

    const allowedQuarters = new Set<string>();
    for (let index = 1; index <= 4; index += 1) {
        const absoluteQuarter = (year * 4) + (currentQuarter - 1) + index;
        const quarterYear = Math.floor(absoluteQuarter / 4);
        const quarter = (absoluteQuarter % 4) + 1;
        allowedQuarters.add(formatQuarterWindow(quarterYear, quarter));
    }

    const allowedCalendars = new Set<string>([formatCalendarWindow(year + 1), formatCalendarWindow(year + 2)]);

    return [...points]
        .map((point) => ({ ...point, availability_window: normalizeAvailabilityWindow(point.availability_window) }))
        .sort((left, right) => compareCurveWindows(left.availability_window, right.availability_window))
        .filter((point) => point.availability_window === 'SPOT' || allowedMonths.has(point.availability_window) || allowedQuarters.has(point.availability_window) || allowedCalendars.has(point.availability_window));
}

export const ForwardCurve: React.FC<ForwardCurveProps> = ({ initialProductId, fuelType, marketProductCode, deliveryPointName, onPeriodClick, embedded = false }) => {
    const { t, ready } = useNamespace('dashboard');
    const { addToast } = useToast();
    const { theme } = useTheme();
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
    const [curveData, setCurveData] = useState<ForwardCurveResponse | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(false);
    const [deliveryPoints, setDeliveryPoints] = useState<{ id: string; name: string }[]>([]);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const isProductControlled = Boolean(fuelType || marketProductCode);

    // TradingView lightweight-charts refs
    const fcChartContainerRef = useRef<HTMLDivElement>(null);
    const fcChartRef = useRef<IChartApi | null>(null);
    const fcBidSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
    const fcAskSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
    const fcMidSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    // Custom tooltip element ref
    const fcTooltipRef = useRef<HTMLDivElement>(null);
    const curveRequestRef = useRef(0);

    // Load products on mount
    useEffect(() => {
        api.catalog.products()
            .then(prods => {
                const active = prods.filter(p => p.is_active);
                setProducts(active);
                if (active.length > 0) {
                    const controlledMatch = marketProductCode
                        ? active.find((product) => product.market_product === marketProductCode)
                        : fuelType
                        ? active.find((product) => product.fuel_type.toLowerCase() === fuelType.toLowerCase())
                        : undefined;
                    setSelectedProductId((previous) => controlledMatch?.id || previous || active[0].id);
                }
            })
            .catch(console.error);

        // Load delivery points for filtering
        api.catalog.deliveryPoints()
            .then((dps: any[]) => setDeliveryPoints(dps))
            .catch(console.error);

        // Load subscription tier
        api.subscriptions.me()
            .then(setSubscription)
            .catch(() => setSubscription({ id: '', org_id: '', tier: 'free', is_active: true }));
    }, [fuelType, marketProductCode]);

    // When marketProductCode prop changes, auto-select the matching product
    useEffect(() => {
        if (marketProductCode && products.length > 0) {
            const match = products.find((p) => p.market_product === marketProductCode);
            if (match && match.id !== selectedProductId) {
                setSelectedProductId(match.id);
            }
        }
    }, [marketProductCode, products, selectedProductId]);

    // When fuelType prop changes, auto-select the matching product
    useEffect(() => {
        if (marketProductCode) return;
        if (fuelType && products.length > 0) {
            const match = products.find(p =>
                p.fuel_type.toLowerCase() === fuelType.toLowerCase()
            );
            if (match && match.id !== selectedProductId) {
                setSelectedProductId(match.id);
            }
        }
    }, [fuelType, products]);

    // Resolve deliveryPointName to ID
    const resolvedDpId = deliveryPointName
        ? deliveryPoints.find(dp => dp.name.toLowerCase() === deliveryPointName.toLowerCase())?.id
        : undefined;

    const fetchCurve = useCallback(async () => {
        if (!selectedProductId) return;
        if (deliveryPointName && !resolvedDpId) {
            curveRequestRef.current += 1;
            setCurveData(null);
            setLastRefresh(null);
            setLoading(false);
            return;
        }
        const requestId = curveRequestRef.current + 1;
        curveRequestRef.current = requestId;
        setLoading(true);
        try {
            const data = await api.curves.forward({
                product_id: selectedProductId,
                delivery_point_id: resolvedDpId,
            });
            if (curveRequestRef.current !== requestId) return;
            setCurveData(data);
            setLastRefresh(new Date());
        } catch (e) {
            if (curveRequestRef.current === requestId) {
                console.error('Failed to load forward curve', e);
            }
        } finally {
            if (curveRequestRef.current === requestId) {
                setLoading(false);
            }
        }
    }, [selectedProductId, resolvedDpId]);

    // Fetch on product change
    useEffect(() => {
        fetchCurve();
    }, [fetchCurve]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(fetchCurve, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchCurve]);

    const handleExport = () => {
        if (!selectedProductId) return;
        const isFree = !subscription || subscription.tier === 'free';
        if (isFree) {
            // Show upgrade CTA — open in new tab pointing to a pricing page
            addToast({ type: 'info', message: 'To upgrade your plan, go to Settings → Billing. Contact sales@verdaxis.exchange for Enterprise plans.' });
            return;
        }
        const url = api.curves.exportCsvUrl(selectedProductId, resolvedDpId);
        window.open(url, '_blank');
    };

    const isFree = !subscription || subscription.tier === 'free';
    const selectedProductName = products.find(p => p.id === selectedProductId)?.name || fuelType || marketProductCode || '';
    const chartPoints = useMemo(() => selectVisibleCurvePoints(curveData?.curve ?? []), [curveData?.curve]);
    const chartPointLookup = useMemo(() => new Map(
        chartPoints.map((point) => [
            serializeChartTime(availabilityWindowToChartTime(point.availability_window)),
            point,
        ]),
    ), [chartPoints]);

    // Stable refs for click handler closure
    const chartPointLookupRef = useRef(chartPointLookup);
    chartPointLookupRef.current = chartPointLookup;
    const onPeriodClickRef = useRef(onPeriodClick);
    onPeriodClickRef.current = onPeriodClick;

    // Helper: build tooltip content safely (no innerHTML)
    const updateTooltipContent = useCallback((
        tooltip: HTMLDivElement,
        item: any,
        bidVal: number | null,
        askVal: number | null,
        midVal: number | null,
    ) => {
        // Clear previous content
        while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);

        const addLine = (text: string, color: string, fontSize = 11, bold = false, marginTop = 0) => {
            const div = document.createElement('div');
            div.textContent = text;
            div.style.color = color;
            div.style.fontSize = `${fontSize}px`;
            if (bold) div.style.fontWeight = '700';
            if (marginTop) div.style.marginTop = `${marginTop}px`;
            tooltip.appendChild(div);
        };

        if (selectedProductName) addLine(selectedProductName, '#e5e5e5', 11, true);
        if (deliveryPointName) addLine(deliveryPointName, '#94a3b8', 10, false, 2);
        addLine(formatAvailabilityWindow(item.availability_window), '#e5e5e5', 11, true, selectedProductName || deliveryPointName ? 6 : 0);
        if (bidVal != null) addLine(`Bid: $${bidVal.toFixed(2)}`, '#00D4AA', 11, true, 2);
        if (askVal != null) addLine(`Ask: $${askVal.toFixed(2)}`, '#FF3B3B', 11, true, 2);
        if (midVal != null) addLine(`Mid: $${midVal.toFixed(2)}`, '#0066FF', 11, true, 2);
        if (item.spread != null) addLine(`Spread: $${Number(item.spread).toFixed(2)}`, '#888', 10, false, 4);
        if (item.volume_mt != null) {
            let volText = `Vol: ${Number(item.volume_mt).toLocaleString()} MT`;
            if (item.order_count != null) volText += ` \u00b7 ${item.order_count} orders`;
            addLine(volText, '#888', 10, false, 0);
        }
    }, [deliveryPointName, selectedProductName]);

    // TradingView chart: create once when container appears
    const chartCreated = useRef(false);
    useEffect(() => {
        const container = fcChartContainerRef.current;
        if (!container || chartCreated.current) return;
        if (loading && chartPoints.length === 0) return; // don't create while loading with no data

        const chartBg = isDark ? '#0A1628' : '#EFF6FF';
        const chartGrid = isDark ? '#1a1a2e' : '#DBEAFE';
        const chartText = isDark ? '#888888' : '#6B7280';

        const chart = createChart(container, {
            autoSize: true,
            layout: {
                background: { type: ColorType.Solid, color: chartBg },
                textColor: chartText,
                fontFamily: "'IBM Plex Mono', monospace",
            },
            grid: {
                vertLines: { color: chartGrid, style: 0 },
                horzLines: { color: chartGrid, style: 0 },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    labelVisible: false,
                },
                horzLine: {
                    labelVisible: false,
                },
            },
            rightPriceScale: {
                borderColor: chartGrid,
            },
            timeScale: {
                borderColor: chartGrid,
                tickMarkFormatter: (time) => {
                    const item = chartPointLookupRef.current.get(serializeChartTime(time));
                    return item ? formatAvailabilityWindowPeriod(item.availability_window) : '';
                },
            },
            handleScroll: false,
            handleScale: false,
        });

        // Bid area (green, translucent)
        const bidSeries = chart.addSeries(AreaSeries, {
            lineColor: '#00D4AA',
            lineWidth: 1,
            topColor: 'rgba(0, 212, 170, 0.35)',
            bottomColor: 'rgba(0, 212, 170, 0.05)',
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            crosshairMarkerBackgroundColor: '#00D4AA',
            title: 'Bid',
        });

        // Ask area (red, translucent)
        const askSeries = chart.addSeries(AreaSeries, {
            lineColor: '#FF3B3B',
            lineWidth: 1,
            topColor: 'rgba(255, 59, 59, 0.25)',
            bottomColor: 'rgba(255, 59, 59, 0.05)',
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            crosshairMarkerBackgroundColor: '#FF3B3B',
            title: 'Ask',
        });

        // Mid-price line (blue)
        const midSeries = chart.addSeries(LineSeries, {
            color: '#0066FF',
            lineWidth: 2,
            pointMarkersVisible: true,
            pointMarkersRadius: 3,
            crosshairMarkerRadius: 6,
            crosshairMarkerBorderColor: '#050A14',
            crosshairMarkerBorderWidth: 2,
            crosshairMarkerBackgroundColor: '#0066FF',
            lastValueVisible: false,
            priceLineVisible: false,
            title: 'Mid',
        });

        fcChartRef.current = chart;
        fcBidSeriesRef.current = bidSeries;
        fcAskSeriesRef.current = askSeries;
        fcMidSeriesRef.current = midSeries;

        const hideTradingViewAttribution = () => {
            container.querySelectorAll('a').forEach((node) => {
                const anchor = node as HTMLAnchorElement;
                if (anchor.href?.includes('tradingview')) {
                    (anchor as HTMLElement).style.display = 'none';
                    (anchor as HTMLElement).style.pointerEvents = 'none';
                }
            });
        };
        hideTradingViewAttribution();
        const observer = new MutationObserver(hideTradingViewAttribution);
        observer.observe(container, { childList: true, subtree: true });

        chartCreated.current = true;

        // Custom tooltip via crosshair move
        chart.subscribeCrosshairMove((param) => {
            hideTradingViewAttribution();
            const tooltip = fcTooltipRef.current;
            if (!tooltip) return;
            if (!param.time) {
                tooltip.style.display = 'none';
                return;
            }
            const item = chartPointLookupRef.current.get(serializeChartTime(param.time));
            if (!item) { tooltip.style.display = 'none'; return; }

            const bidVal = (param.seriesData.get(bidSeries) as any)?.value ?? null;
            const askVal = (param.seriesData.get(askSeries) as any)?.value ?? null;
            const midValRaw = (param.seriesData.get(midSeries) as any)?.value ?? null;

            updateTooltipContent(tooltip, item, bidVal, askVal, midValRaw);
            tooltip.style.display = 'block';

            // Position tooltip near cursor
            if (param.point) {
                const containerRect = container.getBoundingClientRect();
                const left = param.point.x + 12;
                const top = param.point.y - 12;
                tooltip.style.left = `${Math.min(left, containerRect.width - 200)}px`;
                tooltip.style.top = `${Math.max(top, 0)}px`;
            }
        });

        // Click handler: navigate to period
        chart.subscribeClick((param) => {
            if (!param.time) return;
            const item = chartPointLookupRef.current.get(serializeChartTime(param.time));
            if (item?.availability_window && onPeriodClickRef.current) {
                onPeriodClickRef.current(normalizeAvailabilityWindow(item.availability_window));
            }
        });

        return () => {
            observer.disconnect();
            chart.remove();
            fcChartRef.current = null;
            fcBidSeriesRef.current = null;
            fcAskSeriesRef.current = null;
            fcMidSeriesRef.current = null;
            chartCreated.current = false;
        };
    }, [loading, chartPoints.length, updateTooltipContent]);

    // Update chart theme when light/dark mode changes
    useEffect(() => {
        if (!fcChartRef.current) return;
        const chartBg = isDark ? '#0A1628' : '#EFF6FF';
        const chartGrid = isDark ? '#1a1a2e' : '#DBEAFE';
        const chartText = isDark ? '#888888' : '#6B7280';
        fcChartRef.current.applyOptions({
            layout: { background: { type: ColorType.Solid, color: chartBg }, textColor: chartText },
            grid: { vertLines: { color: chartGrid }, horzLines: { color: chartGrid } },
            rightPriceScale: { borderColor: chartGrid },
            timeScale: { borderColor: chartGrid },
        });
    }, [isDark]);

    // Update chart data when chartPoints change
    useEffect(() => {
        if (!fcChartRef.current || !fcBidSeriesRef.current || !fcAskSeriesRef.current || !fcMidSeriesRef.current) return;
        if (chartPoints.length === 0) return;

        const bidData = chartPoints
            .map((pt) => ({
                time: availabilityWindowToChartTime(pt.availability_window),
                value: pt.best_bid != null ? Number(pt.best_bid) : null,
            }))
            .filter((d): d is { time: number; value: number } => d.value != null);

        const askData = chartPoints
            .map((pt) => ({
                time: availabilityWindowToChartTime(pt.availability_window),
                value: pt.best_ask != null ? Number(pt.best_ask) : null,
            }))
            .filter((d): d is { time: number; value: number } => d.value != null);

        const midData = chartPoints
            .map((pt) => ({
                time: availabilityWindowToChartTime(pt.availability_window),
                value: pt.mid_price != null ? Number(pt.mid_price) : null,
            }))
            .filter((d): d is { time: number; value: number } => d.value != null);

        fcBidSeriesRef.current.setData(bidData);
        fcAskSeriesRef.current.setData(askData);
        fcMidSeriesRef.current.setData(midData);
        fcChartRef.current.timeScale().fitContent();
    }, [chartPoints]);

    if (!ready) return null;

    const chartHeight = embedded ? '100%' : 220;

    return (
        <div style={{
            background: embedded ? 'transparent' : 'var(--ocean)',
            border: embedded ? 'none' : '1px solid var(--ocean-border)',
            borderRadius: embedded ? 0 : 8,
            padding: embedded ? 0 : '16px',
            fontFamily: "'IBM Plex Mono', monospace",
            height: embedded ? '100%' : undefined,
        }}>
            {!embedded && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <TrendingUp size={14} color="var(--bio, #00D4AA)" style={{ marginTop: 2 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--terminal-muted)' }}>
                                    {t('forwardCurve.title')}
                                </span>
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: 'var(--sonar, #0066FF)',
                                    background: 'rgba(0, 102, 255, 0.10)',
                                    border: '1px solid rgba(0, 102, 255, 0.22)',
                                    borderRadius: 999,
                                    padding: '2px 8px',
                                }}>
                                    {t('forwardCurve.indicativeOnly')}
                                </span>
                                {lastRefresh && (
                                    <span style={{ fontSize: 10, color: 'var(--terminal-dim)' }}>
                                        {lastRefresh.toLocaleTimeString('en-US', { hour12: false })}
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--terminal-dim)' }}>
                                {t('forwardCurve.subtitle')}
                            </span>
                            {onPeriodClick && (
                                <span style={{ fontSize: 10, color: 'var(--sonar, #0066FF)' }}>
                                    {t('forwardCurve.clickHint')}
                                </span>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isProductControlled ? (
                            <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'var(--bio, #00D4AA)',
                                fontFamily: "'IBM Plex Mono', monospace",
                            }}>
                                {selectedProductName}
                                {deliveryPointName && <span style={{ color: 'var(--terminal-muted)', fontWeight: 400 }}> — {deliveryPointName}</span>}
                            </span>
                        ) : (
                            <select
                                value={selectedProductId}
                                onChange={e => setSelectedProductId(e.target.value)}
                                style={{
                                    background: 'var(--terminal-input-bg)',
                                    border: '1px solid var(--terminal-input-border)',
                                    borderRadius: 4,
                                    color: 'var(--terminal-text)',
                                    fontSize: 11,
                                    padding: '4px 8px',
                                    fontFamily: "'IBM Plex Mono', monospace",
                                }}
                            >
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        )}

                        <button
                            onClick={fetchCurve}
                            disabled={loading}
                            title={t('forwardCurve.refresh')}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--terminal-input-border)',
                                borderRadius: 4,
                                color: 'var(--terminal-muted)',
                                padding: '4px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        </button>

                        <button
                            onClick={handleExport}
                            style={{
                                background: isFree ? 'rgba(255,176,32,0.1)' : 'rgba(0,102,255,0.1)',
                                border: `1px solid ${isFree ? 'rgba(255,176,32,0.3)' : 'rgba(0,102,255,0.3)'}`,
                                borderRadius: 4,
                                color: isFree ? 'var(--amber, #FFB020)' : 'var(--sonar, #0066FF)',
                                fontSize: 10,
                                padding: '4px 10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontWeight: 700,
                            }}
                        >
                            {isFree ? <Lock size={10} /> : <Download size={10} />}
                            {isFree ? t('forwardCurve.upgrade') : t('forwardCurve.exportCsv')}
                        </button>
                    </div>
                </div>
            )}

            {loading && chartPoints.length === 0 ? (
                <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--terminal-dim)' }}>
                    <span style={{ fontSize: 12 }}>{t('forwardCurve.loading')}</span>
                </div>
            ) : chartPoints.length === 0 ? (
                <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--terminal-dim)', textAlign: 'center', padding: '0 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--terminal-text)' }}>{t('forwardCurve.noData')}</span>
                        <span style={{ fontSize: 10 }}>{t('forwardCurve.noDataHint')}</span>
                    </div>
                </div>
            ) : (
                <div style={{ position: 'relative', height: chartHeight, minHeight: embedded ? 150 : undefined, cursor: onPeriodClick ? 'pointer' : undefined }}>
                    <div
                        ref={fcChartContainerRef}
                        className="verdaxis-chart-container"
                        style={{ width: '100%', height: '100%' }}
                    />
                    <div
                        ref={fcTooltipRef}
                        style={{
                            display: 'none',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            background: 'var(--ocean)',
                            border: '1px solid #0066FF',
                            borderRadius: 6,
                            padding: '10px 14px',
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 11,
                            color: '#00D4AA',
                            minWidth: 180,
                            pointerEvents: 'none',
                            zIndex: 10,
                        }}
                    />
                    {!embedded && (
                        <div style={{
                            display: 'flex',
                            gap: 16,
                            justifyContent: 'center',
                            paddingTop: 8,
                            fontSize: 10,
                            fontFamily: "'IBM Plex Mono', monospace",
                            color: '#888',
                        }}>
                            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#00D4AA', marginRight: 4 }} />{t('forwardCurve.bestBid')}</span>
                            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#FF3B3B', marginRight: 4 }} />{t('forwardCurve.bestAsk')}</span>
                            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0066FF', marginRight: 4 }} />{t('forwardCurve.midPrice')}</span>
                        </div>
                    )}
                </div>
            )}

            {!embedded && curveData && (
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 10, color: '#555' }}>
                    <span>{selectedProductName || curveData.product_name}{deliveryPointName ? ` · ${deliveryPointName}` : ''}</span>
                    <span>updated {new Date(curveData.generated_at).toLocaleTimeString('en-US', { hour12: false })}</span>
                </div>
            )}
        </div>
    );
};
