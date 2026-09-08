import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ArrowRight, PanelRightOpen, Loader2, TrendingUp, History, BarChart3, Anchor, Layers, Shield, Fuel, LocateFixed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Port, Page, AggregatedOrderbook } from '../types';
import { Tooltip } from './ui/Tooltip';
import { IntelligencePanel } from './map/IntelligencePanel';
import { MarketWatchTicker } from './map/MarketWatchTicker';
import { api } from '../services/api';
import { VerdaxisSelect } from './ui/VerdaxisSelect';
import { MapLegend } from './map/MapLegend';
import { useNamespace } from '../hooks/useNamespace';
import { calculateHeading } from '../utils';
import { useTheme } from '../context/ThemeContext';
import { computePortMarketData, PortMarketData } from '../utils/buyerMapMarket';
import { resolveApprovedMapPorts } from '../utils/marketPorts';
import { PORTS as APPROVED_MAP_PORTS } from '../data';
import { addEcaLayers, setEcaLayersVisible } from '../map/addEcaLayers';
import { ACTIVE_MARKETPLACE_PRODUCT_OPTIONS } from '../utils/marketProducts';
import { useDashboardContentReady } from '../hooks/useDashboardContentReady';
import { useSSE } from '../hooks/useSSE';

interface BuyerMapProps {
    active?: boolean;
    onPortSelect: (port: Port) => void;
    onNavigate: (page: Page) => void;
    onOrderClick?: (port: Port) => void;
}

// Port circle radius: proportional to volume, clamped 6-20px
const getPortRadius = (volume: number, maxVolume: number): number => {
    if (maxVolume <= 0 || volume <= 0) return 6;
    const ratio = volume / maxVolume;
    return Math.round(6 + ratio * 14); // 6..20
};

// Border color by spread tightness
const getSpreadColor = (spreadPct: number): string => {
    if (spreadPct < 5) return '#10B981';  // green
    if (spreadPct < 15) return '#F59E0B'; // amber
    return '#EF4444';                      // red
};

const normalizeMarketLocation = (value?: string | null) => (value ?? '').trim().toLowerCase();
const translationKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}[character]!));
const MAP_UI_LOCALES = {
    en: {
        'AttributionControl.ToggleAttribution': 'Toggle attribution',
        'AttributionControl.MapFeedback': 'Map feedback',
        'NavigationControl.ZoomIn': 'Zoom in',
        'NavigationControl.ZoomOut': 'Zoom out',
        'NavigationControl.ResetBearing': 'Reset north',
    },
    zh: {
        'AttributionControl.ToggleAttribution': '切换地图版权信息',
        'AttributionControl.MapFeedback': '地图反馈',
        'NavigationControl.ZoomIn': '放大',
        'NavigationControl.ZoomOut': '缩小',
        'NavigationControl.ResetBearing': '恢复正北方向',
    },
} as const;

interface LayerSwitchProps {
    checked: boolean;
    description: string;
    label: string;
    onChange: () => void;
    children: React.ReactNode;
}

const LayerSwitch: React.FC<LayerSwitchProps> = ({ checked, description, label, onChange, children }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
    >
        <span className="mt-0.5 text-slate-400 dark:text-slate-500">{children}</span>
        <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">{label}</span>
            <span className="mt-0.5 block text-[10px] leading-4 text-slate-500 dark:text-slate-400">{description}</span>
        </span>
        <span
            aria-hidden="true"
            className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
                checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
        >
            <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    checked ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
            />
        </span>
    </button>
);

type MapRecentAsk = Awaited<ReturnType<typeof api.orderbook.mapSummary>>['recent_asks'][number];

export const BuyerMap: React.FC<BuyerMapProps> = ({ active = true, onPortSelect, onNavigate, onOrderClick }) => {
    const { t, ready } = useNamespace('dashboard');
    const { i18n } = useTranslation();
    const mapLanguage = (i18n.resolvedLanguage || i18n.language).toLowerCase().split('-')[0] === 'zh' ? 'zh' : 'en';
    const mapLocale = MAP_UI_LOCALES[mapLanguage];
    const translateRef = useRef(t);
    translateRef.current = t;
    const { theme } = useTheme();
    const [ports, setPorts] = useState<Port[]>(() => resolveApprovedMapPorts(APPROVED_MAP_PORTS, [], []));
    const [loadError, setLoadError] = useState(false);
    const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [showMarketWatch, setShowMarketWatch] = useState(true);
    const [showMarketWidgets, setShowMarketWidgets] = useState(false);
    const [showSecaZones, setShowSecaZones] = useState(true);
    const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false);
    const [recentAsks, setRecentAsks] = useState<MapRecentAsk[]>([]);
    const [aggregatedData, setAggregatedData] = useState<AggregatedOrderbook[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined);
    const [mapStyleLoaded, setMapStyleLoaded] = useState(false);
    const [mapCreated, setMapCreated] = useState(false);
    const [marketSummaryReady, setMarketSummaryReady] = useState(false);
    const [marketDataError, setMarketDataError] = useState(false);

    const mapContainer = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const layersMenuRef = useRef<HTMLDivElement>(null);
    const isDark = theme === 'dark' || (theme === 'system' && document.documentElement.classList.contains('dark'));

    const portHandlersInstalledRef = useRef(false);
    const vesselHandlersInstalledRef = useRef(false);
    const currentStyleRef = useRef<string | null>(null);
    const currentLanguageRef = useRef<string | null>(null);
    const languageIdleHandlerRef = useRef<(() => void) | null>(null);
    const marketLoadGenerationRef = useRef(0);
    const hasActivatedRef = useRef(false);
    const portsRef = useRef(ports);
    portsRef.current = ports;
    const isDarkRef = useRef(isDark);
    isDarkRef.current = isDark;

    useDashboardContentReady('MAP', active && mapStyleLoaded && marketSummaryReady);

    // Approved fallback ports let the map render while live reference data loads.
    useEffect(() => {
        let cancelled = false;
        const fetchPorts = async () => {
            try {
                const [portsData, deliveryPointsData] = await Promise.all([
                    api.ports.list(),
                    api.catalog.deliveryPoints().catch(() => []),
                ]);
                if (!cancelled) setPorts(resolveApprovedMapPorts(APPROVED_MAP_PORTS, portsData, deliveryPointsData));
            } catch (e) {
                console.error("Failed to load map data", e);
                if (!cancelled) setLoadError(true);
            }
        };

        void fetchPorts();
        return () => { cancelled = true; };
    }, []);

    const refreshMarketSummary = useCallback(async (force = false) => {
        const generation = ++marketLoadGenerationRef.current;
        try {
            const summary = await api.orderbook.mapSummary({ force });
            if (generation !== marketLoadGenerationRef.current) return;
            setAggregatedData(summary.groups);
            setRecentAsks(summary.recent_asks);
            setMarketSummaryReady(true);
            setMarketDataError(false);
        } catch (error) {
            console.warn('Map market summary unavailable', error);
            if (generation === marketLoadGenerationRef.current) setMarketDataError(true);
        }
    }, []);

    useEffect(() => {
        if (!active) {
            marketLoadGenerationRef.current += 1;
            return;
        }
        const force = hasActivatedRef.current;
        hasActivatedRef.current = true;
        void refreshMarketSummary(force);
        return () => { marketLoadGenerationRef.current += 1; };
    }, [active, refreshMarketSummary]);

    const handleOrderbookEvent = useCallback(() => {
        void refreshMarketSummary(true);
    }, [refreshMarketSummary]);
    useSSE('orderbook', handleOrderbookEvent, active, 'buyer-map');

    const approvedListingLocationMap = useMemo(() => {
        const map = new Map<string, string>();
        ports.forEach((port) => {
            [
                port.id,
                port.catalogDeliveryPointId,
                port.name,
            ].forEach((value) => {
                const normalized = normalizeMarketLocation(value);
                if (normalized) map.set(normalized, port.name);
            });
        });
        return map;
    }, [ports]);

    const approvedAskGroups = useMemo(() => (
        aggregatedData.reduce<Array<AggregatedOrderbook & { region: string }>>((approved, group) => {
            if (group.side !== 'ASK') return approved;
            const approvedPortName = [
                group.delivery_point_id,
                group.delivery_point_name,
                group.region,
            ].map((value) => approvedListingLocationMap.get(normalizeMarketLocation(value)))
                .find((value): value is string => Boolean(value));

            if (!approvedPortName) return approved;
            approved.push({ ...group, region: approvedPortName });
            return approved;
        }, [])
    ), [aggregatedData, approvedListingLocationMap]);

    const portBounds = useMemo<mapboxgl.LngLatBoundsLike | undefined>(() => {
        if (!ports.length) return undefined;
        return [
            [Math.min(...ports.map(port => port.location.lng)), Math.min(...ports.map(port => port.location.lat))],
            [Math.max(...ports.map(port => port.location.lng)), Math.max(...ports.map(port => port.location.lat))],
        ];
    }, [ports]);

    const mapPadding = useCallback((panelOpen = isPanelOpen) => {
        const mapRect = mapContainer.current?.getBoundingClientRect();
        const toolbarRect = toolbarRef.current?.getBoundingClientRect();
        const width = mapRect?.width || window.innerWidth;
        const height = mapRect?.height || window.innerHeight;
        // Reserve the 320px insights panel and toolbar. On short windows, leave
        // at least 20% of the map height available for camera fitting.
        return {
            top: Math.min(Math.max(180, (toolbarRect?.bottom ?? 0) - (mapRect?.top ?? 0) + 24), height * 0.45),
            bottom: Math.min(showMarketWidgets && window.innerWidth >= 1024 ? 320 : 32, height * 0.35),
            left: 24,
            right: Math.min(panelOpen ? 344 : 64, width * 0.75),
        };
    }, [isPanelOpen, showMarketWidgets]);

    const focusAllPorts = useCallback(() => {
        if (!portBounds) return;
        popupRef.current?.remove();
        setSelectedPortId(null);
        mapRef.current?.fitBounds(portBounds, {
            padding: mapPadding(),
            retainPadding: false,
            duration: 700,
            maxZoom: 3.6,
        });
    }, [mapPadding, portBounds]);

    const focusMapPort = useCallback((port: Port, options: { flyTo?: boolean } = {}) => {
        setSelectedPortId(port.id);
        setIsPanelOpen(true);
        if (options.flyTo) {
            mapRef.current?.flyTo({
                center: [port.location.lng, port.location.lat],
                zoom: Math.max(mapRef.current.getZoom(), 3.6),
                padding: mapPadding(true),
                retainPadding: false,
                duration: 700,
            });
        }
    }, [mapPadding]);

    const handlePanelPortSelect = useCallback((port: Port) => {
        focusMapPort(port, { flyTo: true });
        if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
        }
    }, [focusMapPort]);

    const focusEuropeanEcaZones = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        setShowSecaZones(true);
        setIsLayersMenuOpen(false);
        map.fitBounds([[-11, 29], [37, 67]], {
            padding: mapPadding(),
            retainPadding: false,
            duration: 850,
        });
    }, [mapPadding]);

    useEffect(() => {
        if (!isLayersMenuOpen) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!layersMenuRef.current?.contains(event.target as Node)) {
                setIsLayersMenuOpen(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsLayersMenuOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isLayersMenuOpen]);

    // Pre-compute market data for each port
    const portMarketMap = useMemo(() => {
        const map: Record<string, PortMarketData> = {};
        ports.forEach(port => {
            map[port.id] = computePortMarketData(aggregatedData, port, selectedProduct);
        });
        return map;
    }, [ports, aggregatedData, selectedProduct]);

    // Map listeners outlive React renders. Read the current product's market data.
    const portMarketRef = useRef(portMarketMap);
    portMarketRef.current = portMarketMap;

    useEffect(() => {
        popupRef.current?.remove();
        popupRef.current = null;
    }, [selectedProduct]);

    const selectedPort = useMemo(() => {
        const port = ports.find(item => item.id === selectedPortId);
        if (!port) return undefined;
        return {
            ...port,
            priceMethanol: portMarketMap[port.id]?.reference?.price ?? 0,
            priceTrend: undefined,
        };
    }, [portMarketMap, ports, selectedPortId]);

    const availableProducts = ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.map(option => option.label);

    // Max volume across all ports (for radius scaling)
    const maxVolume = useMemo(() => {
        return Math.max(1, ...Object.values(portMarketMap).map(d => d.totalVolume));
    }, [portMarketMap]);

    // Aggregate all eligible ASK groups by approved delivery point.
    const availsByRegion = useMemo(() => {
        const regionMap: Record<string, number> = {};
        approvedAskGroups.forEach(group => {
            regionMap[group.region] = (regionMap[group.region] || 0) + Number(group.total_quantity);
        });

        return Object.entries(regionMap)
            .map(([region, qty]) => ({ region, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 6);
    }, [approvedAskGroups]);

    const maxAvailQty = availsByRegion.length > 0 ? availsByRegion[0].qty : 1;

    // Recent listing indications come from the compact, eligible ASK summary.
    const recentListingsByRegion = useMemo(() => {
        const regionMap: Record<string, { price: number; qty: number; date: string; fuel: string }> = {};
        recentAsks.forEach(ask => {
            const region = [ask.delivery_point_id, ask.delivery_point_name, ask.region]
                .map(value => approvedListingLocationMap.get(normalizeMarketLocation(value)))
                .find((value): value is string => Boolean(value));
            if (region && (!regionMap[region] || ask.created_at > regionMap[region].date)) {
                regionMap[region] = {
                    price: Number(ask.price_per_mt_usd),
                    qty: Number(ask.remaining_quantity_mt),
                    date: ask.created_at,
                    fuel: ask.fuel_type,
                };
            }
        });

        return Object.entries(regionMap)
            .map(([region, data]) => ({ region, ...data }))
            .slice(0, 6);
    }, [approvedListingLocationMap, recentAsks]);

    // Map initialization
    useEffect(() => {
        if (!active || !ready || !mapContainer.current || mapRef.current) return;

        const style = isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';

        const map = new mapboxgl.Map({
            container: mapContainer.current,
            accessToken: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN,
            style,
            projection: 'mercator',
            language: mapLanguage === 'zh' ? 'zh-Hans' : 'en',
            bounds: portBounds,
            fitBoundsOptions: { padding: mapPadding(), maxZoom: 3.6, duration: 0, retainPadding: false },
            attributionControl: false,
            locale: mapLocale,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        const handleStyleLoad = () => setMapStyleLoaded(true);
        map.on('style.load', handleStyleLoad);
        mapRef.current = map;
        currentStyleRef.current = style;
        currentLanguageRef.current = mapLanguage;
        setMapCreated(true);

        // Creation is intentionally separate from unmount cleanup. Namespace
        // and visibility transitions must never destroy the retained map.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, ready]);

    useEffect(() => () => {
        const map = mapRef.current;
        if (!map) return;
        if (languageIdleHandlerRef.current) {
            map.off('idle', languageIdleHandlerRef.current);
            languageIdleHandlerRef.current = null;
        }
        map.remove();
        mapRef.current = null;
        currentStyleRef.current = null;
        currentLanguageRef.current = null;
        portHandlersInstalledRef.current = false;
        vesselHandlersInstalledRef.current = false;
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (!active) {
            map.stop();
            return;
        }

        const resizeFrame = requestAnimationFrame(() => map.resize());
        const style = isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
        if (currentLanguageRef.current !== mapLanguage) {
            if (languageIdleHandlerRef.current) {
                map.off('idle', languageIdleHandlerRef.current);
            }
            setMapStyleLoaded(false);
            currentLanguageRef.current = mapLanguage;
            const handleLanguageIdle = () => {
                languageIdleHandlerRef.current = null;
                setMapStyleLoaded(true);
            };
            // The map outlives route visibility. Keep this readiness listener
            // until Mapbox becomes idle or the map instance is destroyed.
            languageIdleHandlerRef.current = handleLanguageIdle;
            map.once('idle', handleLanguageIdle);
            map.setLanguage(mapLanguage === 'zh' ? 'zh-Hans' : 'en');
        }
        if (currentStyleRef.current !== style) {
            setMapStyleLoaded(false);
            currentStyleRef.current = style;
            map.setStyle(style);
        }

        const labels: Array<[string, string]> = [
            ['.mapboxgl-ctrl-zoom-in', mapLocale['NavigationControl.ZoomIn']],
            ['.mapboxgl-ctrl-zoom-out', mapLocale['NavigationControl.ZoomOut']],
            ['.mapboxgl-ctrl-compass', mapLocale['NavigationControl.ResetBearing']],
            ['.mapboxgl-ctrl-attrib-button', mapLocale['AttributionControl.ToggleAttribution']],
        ];
        labels.forEach(([selector, label]) => {
            const control = mapContainer.current?.querySelector<HTMLElement>(selector);
            control?.setAttribute('aria-label', label);
            control?.setAttribute('title', label);
        });

        return () => {
            cancelAnimationFrame(resizeFrame);
        };
    }, [active, isDark, mapLanguage, mapLocale]);

    // Keep native navigation below the toolbar when filters wrap or the ticker closes.
    useEffect(() => {
        const container = mapContainer.current;
        const toolbar = toolbarRef.current;
        if (!container || !toolbar) return;
        const positionControls = () => {
            const top = toolbar.getBoundingClientRect().bottom - container.getBoundingClientRect().top + 16;
            container.style.setProperty('--verdaxis-map-controls-top', `${top}px`);
        };
        const observer = new ResizeObserver(positionControls);
        observer.observe(container);
        observer.observe(toolbar);
        positionControls();
        return () => observer.disconnect();
    }, [ready, showMarketWatch]);

    // Port markers layer
    useEffect(() => {
        const map = mapRef.current;
        if (!map || ports.length === 0) return;

        const addPortLayers = () => {

            // Build GeoJSON for ports
            const portFeatures = ports.map(port => {
                const mkt = portMarketMap[port.id] || { totalVolume: 0, fuelRows: [], spreadPct: 999, reference: null };
                const radius = getPortRadius(mkt.totalVolume, maxVolume);
                const spreadColor = getSpreadColor(mkt.spreadPct);
                return {
                    type: 'Feature' as const,
                    geometry: { type: 'Point' as const, coordinates: [port.location.lng, port.location.lat] },
                    properties: {
                        id: port.id,
                        name: port.name,
                        country: port.country,
                        radius,
                        color: spreadColor,
                        referencePrice: mkt.reference?.price ?? 0,
                        referenceProduct: mkt.reference?.productLabel ?? '',
                        totalVolume: mkt.totalVolume,
                        selected: port.id === selectedPortId,
                    },
                };
            });

            const geojson = { type: 'FeatureCollection' as const, features: portFeatures };

            if (map.getSource('ports')) {
                (map.getSource('ports') as mapboxgl.GeoJSONSource).setData(geojson);
            } else {
                map.addSource('ports', { type: 'geojson', data: geojson });

                // Port fill circles
                map.addLayer({
                    id: 'port-fills',
                    type: 'circle',
                    source: 'ports',
                    paint: {
                        'circle-radius': ['get', 'radius'],
                        'circle-color': isDarkRef.current ? '#1E293B' : '#FFFFFF',
                        'circle-opacity': 0.85,
                        'circle-stroke-width': ['case', ['get', 'selected'], 4, 2],
                        'circle-stroke-color': ['get', 'color'],
                    },
                });

                if (portHandlersInstalledRef.current) return;
                portHandlersInstalledRef.current = true;

                // Hover tooltip popup
                const hoverPopup = new mapboxgl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    offset: 10,
                    className: 'verdaxis-port-popup',
                });

                map.on('mouseenter', 'port-fills', (e) => {
                    map.getCanvas().style.cursor = 'pointer';
                    if (!e.features?.length) return;
                    const translate = translateRef.current;
                    const f = e.features[0];
                    const props = f.properties;
                    const coords = (f.geometry as any).coordinates.slice();
                    const pricePart = props.referencePrice
                        ? ' <span style="color:#94A3B8">' + escapeHtml(props.referenceProduct) + '</span> <span style="color:#10B981;font-family:\'IBM Plex Mono\',monospace">$' + Number(props.referencePrice).toFixed(0) + '</span>'
                        : '';
                    const volumePart = props.totalVolume > 0
                        ? '<div style="font-size:10px;color:#94A3B8;margin-top:2px">' + escapeHtml(translate('buyerMap.openVolume', { volume: Math.round(props.totalVolume).toLocaleString() })) + '</div>'
                        : '';
                    const tooltipHtml = '<div style="background:#1E293B;color:#F8FAFC;border-radius:6px;padding:6px 10px;font-family:\'DM Sans\',\'Inter\',sans-serif;font-size:12px;white-space:nowrap">'
                        + '<span style="font-weight:700">' + escapeHtml(props.name) + '</span>'
                        + pricePart
                        + volumePart
                        + '</div>';
                    hoverPopup.setLngLat(coords).setHTML(tooltipHtml).addTo(map);
                });

                map.on('mouseleave', 'port-fills', () => {
                    map.getCanvas().style.cursor = '';
                    hoverPopup.remove();
                });

                // Click handler for port popups
                map.on('click', 'port-fills', (e) => {
                    if (!e.features?.length) return;
                    const translate = translateRef.current;
                    const f = e.features[0];
                    const portId = f.properties.id;
                    const port = portsRef.current.find(item => item.id === portId);
                    if (!port) return;
                    setSelectedPortId(port.id);
                    setIsPanelOpen(true);

                    // Show popup
                    if (popupRef.current) popupRef.current.remove();

                    const mkt = portMarketRef.current[portId] || { totalVolume: 0, fuelRows: [], spreadPct: 999, reference: null };
                    // Build popup HTML
                    const fuelRowsHtml = mkt.fuelRows.length > 0
                        ? '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px">'
                            + '<thead><tr style="border-bottom:1px solid rgba(148,163,184,0.3)">'
                            + '<th style="text-align:left;padding:3px 0;color:#94A3B8;font-weight:600;font-size:10px;text-transform:uppercase">' + escapeHtml(translate('buyerMap.popup.fuel')) + '</th>'
                            + '<th style="text-align:right;padding:3px 4px;color:#94A3B8;font-weight:600;font-size:10px">' + escapeHtml(translate('buyerMap.popup.bid')) + '</th>'
                            + '<th style="text-align:right;padding:3px 4px;color:#94A3B8;font-weight:600;font-size:10px">' + escapeHtml(translate('buyerMap.popup.ask')) + '</th>'
                            + '<th style="text-align:right;padding:3px 0;color:#94A3B8;font-weight:600;font-size:10px">#</th>'
                            + '</tr></thead><tbody>'
                            + mkt.fuelRows.map((row, i) =>'<tr style="border-bottom:' + (i < mkt.fuelRows.length - 1 ? '1px solid rgba(148,163,184,0.1)' : 'none') + '">'
                                + '<td style="padding:4px 0;font-weight:600;color:#E2E8F0">' + escapeHtml(row.label) + '</td>'
                                + '<td style="text-align:right;padding:4px 4px;font-family:\'IBM Plex Mono\',monospace;color:#10B981;font-weight:600">' + (row.bestBid !== null ? '$' + row.bestBid.toFixed(0) : '--') + '</td>'
                                + '<td style="text-align:right;padding:4px 4px;font-family:\'IBM Plex Mono\',monospace;color:#EF4444;font-weight:600">' + (row.bestAsk !== null ? '$' + row.bestAsk.toFixed(0) : '--') + '</td>'
                                + '<td style="text-align:right;padding:4px 0;color:#94A3B8">' + row.orderCount + '</td>'
                                + '</tr>').join('')
                            + '</tbody></table>'
                        : '<div style="font-size:11px;color:#64748B;margin-bottom:10px;padding:8px 0;text-align:center">' + escapeHtml(translate('buyerMap.popup.noOpenOrders')) + '</div>';

                    // Market intelligence section
                    const spotPrice = mkt.reference ? '$' + mkt.reference.price.toFixed(0) : '--';
                    const referenceLabel = mkt.reference
                        ? translate('buyerMap.spotIndication', { product: mkt.reference.productLabel })
                        : translate('buyerMap.spotIndicationUnavailable');
                    const referenceSource = !mkt.reference
                        ? '--'
                        : mkt.reference.source === 'DEMO'
                            ? translate('buyerMap.demoMarketplace')
                            : mkt.reference.source === 'MIXED'
                                ? translate('buyerMap.mixedMarketplace')
                                : translate('buyerMap.marketplace');
                    const plattsPrice = port.details?.plattsPrice ? '$' + port.details.plattsPrice.toFixed(2) : '--';
                    const swapPrice = port.details?.swapPrice ? '$' + port.details.swapPrice.toFixed(2) : '--';
                    const congestion = port.details?.congestionLevel && port.details.congestionLevel !== 'Unknown' ? port.details.congestionLevel : '--';
                    const congestionLabel = congestion === '--'
                        ? congestion
                        : translate(`intelligencePanel.congestionLevels.${translationKey(congestion)}`, { defaultValue: translate('intelligencePanel.congestionLevels.unknown') });
                    const congColor = congestion === 'Low' ? '#10B981' : congestion === 'Moderate' ? '#F59E0B' : congestion === 'High' ? '#EF4444' : '#94A3B8';
                    const externalReferencesHtml = plattsPrice !== '--' || swapPrice !== '--'
                        ? '<div style="background:rgba(148,163,184,0.08);padding:6px 8px;border-radius:6px;margin-bottom:6px">'
                            + '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">'
                            + '<span style="color:#E8373E;font-weight:600">' + escapeHtml(translate('buyerMap.benchmarkReference')) + '</span>'
                            + '<span style="font-weight:700;color:#E2E8F0;font-family:\'IBM Plex Mono\',monospace">' + plattsPrice + '</span>'
                            + '</div>'
                            + '<div style="display:flex;justify-content:space-between;font-size:11px">'
                            + '<span style="color:#94A3B8;font-weight:600">' + escapeHtml(translate('buyerMap.swapReference')) + '</span>'
                            + '<span style="font-weight:700;color:#E2E8F0;font-family:\'IBM Plex Mono\',monospace">' + swapPrice + '</span>'
                            + '</div>'
                            + '</div>'
                        : '';
                    const marketIntelHtml = '<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(148,163,184,0.15)">'
                        // Product-specific SPOT indication
                        + '<div style="margin-bottom:6px">'
                        + '<div style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-weight:600;margin-bottom:2px">' + escapeHtml(referenceLabel) + '</div>'
                        + '<div style="font-size:16px;font-weight:700;color:#F8FAFC;font-family:\'IBM Plex Mono\',monospace">' + spotPrice + '</div>'
                        + '</div>'
                        + externalReferencesHtml
                        // Congestion row
                        + '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px">'
                        + '<div><span style="color:#94A3B8;font-weight:600">' + escapeHtml(translate('intelligencePanel.congestion')) + '</span> <span style="color:' + congColor + ';font-weight:700;margin-left:3px">' + escapeHtml(congestionLabel) + '</span></div>'
                        + '<div><span style="color:#94A3B8;font-weight:600">' + escapeHtml(translate('buyerMap.source')) + '</span> <span style="color:#E2E8F0;font-weight:600;margin-left:3px">' + escapeHtml(referenceSource) + '</span></div>'
                        + '</div>'
                        + '</div>';

                    const html = '<div style="width:260px;background:' + (isDarkRef.current ? '#0F172A' : '#1E293B') + ';color:#F8FAFC;border-radius:8px;padding:12px;font-family:\'DM Sans\',\'Inter\',sans-serif">'
                        + '<h3 style="font-family:\'Montserrat\',sans-serif;font-weight:700;font-size:15px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(148,163,184,0.2)">'
                        + escapeHtml(port.name || translate('buyerMap.popup.unknownPort'))
                        + '<span style="display:block;font-size:10px;font-weight:500;color:#94A3B8;margin-top:2px">' + escapeHtml(port.country
                            ? translate(`countries.${translationKey(port.country)}`, { defaultValue: port.country })
                            : translate('buyerMap.popup.global')) + '</span>'
                        + '</h3>'
                        + fuelRowsHtml
                        + marketIntelHtml
                        + '<button onclick="window.__verdaxisTradeAt && window.__verdaxisTradeAt(' + escapeHtml(JSON.stringify(port.id)) + ')" style="width:100%;background:#10B981;color:#FFF;font-size:12px;font-weight:700;padding:8px 0;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">' + escapeHtml(translate('buyerMap.popup.tradeAt', { port: port.name })) + ' \u2192</button>'
                        + '</div>';

                    const coords = (f.geometry as any).coordinates.slice();
                    popupRef.current = new mapboxgl.Popup({ closeButton: true, maxWidth: '280px', className: 'verdaxis-port-popup' })
                        .setLngLat(coords)
                        .setHTML(html)
                        .addTo(map);
                    popupRef.current.getElement()?.querySelector('.mapboxgl-popup-close-button')?.setAttribute('aria-label', translate('buyerMap.popup.close'));
                });
            }
        };

        map.on('style.load', addPortLayers);
        if (map.getSource('ports') || map.loaded()) {
            addPortLayers();
        }
        return () => { map.off('style.load', addPortLayers); };
    }, [mapCreated, ready, ports, portMarketMap, maxVolume, selectedPortId]);

    // Versioned IMO ECA reference overlay generated from the shared geofence bundle.
    useEffect(() => {
        const map = mapRef.current;
        if (!active || !map) return;

        const install = () => addEcaLayers(map, {
            isDark,
            visible: showSecaZones,
        });

        map.on('style.load', install);
        if (map.loaded()) {
            install();
        }

        return () => {
            map.off('style.load', install);
        };
    }, [active, mapCreated, ready, isDark, showSecaZones]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        setEcaLayersVisible(map, showSecaZones);
    }, [showSecaZones]);

    // Vessel markers layer
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        let cancelled = false;
        let installVessels: (() => void) | null = null;
        const addVessels = async () => {
            try {
                const vessels = await api.vessels.list();
                if (cancelled) return;

                installVessels = () => {

                    const features = vessels.filter((v: any) => v.location).map((v: any) => {
                        const heading = calculateHeading(v.previousLocation, v.location);
                        const vt = (v.vesselType || '').toLowerCase();
                        const color = vt.includes('methanol') || vt.includes('dual') || vt.includes('green') || vt.includes('ammonia')
                            ? '#10B981' : vt.includes('lng') ? '#3B82F6' : '#94A3B8';
                        return {
                            type: 'Feature' as const,
                            geometry: { type: 'Point' as const, coordinates: [v.location.lng, v.location.lat] },
                            properties: { name: v.name, heading, color, vesselType: v.vesselType, ciiGrade: v.ciiGrade || '' },
                        };
                    });

                    if (map.getSource('vessels')) {
                        (map.getSource('vessels') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features });
                    } else {
                        map.addSource('vessels', { type: 'geojson', data: { type: 'FeatureCollection', features } });

                        // Vessel chevron arrows via SDF image
                        if (!map.hasImage('vessel-arrow')) {
                            const sz = 64;
                            const c = document.createElement('canvas');
                            c.width = sz; c.height = sz;
                            const x = c.getContext('2d')!;
                            // White filled chevron pointing up — will be tinted by icon-color
                            x.fillStyle = '#ffffff';
                            x.beginPath();
                            x.moveTo(sz * 0.5, sz * 0.1);   // top center
                            x.lineTo(sz * 0.85, sz * 0.8);  // bottom right
                            x.lineTo(sz * 0.5, sz * 0.6);   // notch center
                            x.lineTo(sz * 0.15, sz * 0.8);  // bottom left
                            x.closePath();
                            x.fill();
                            map.addImage('vessel-arrow', c.getContext('2d')!.getImageData(0, 0, sz, sz), { sdf: true });
                        }

                        if (!map.getLayer('vessels-layer')) {
                            map.addLayer({
                                id: 'vessels-layer',
                                type: 'symbol',
                                source: 'vessels',
                                layout: {
                                    'icon-image': 'vessel-arrow',
                                    'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 0.3, 5, 0.45, 8, 0.65],
                                    'icon-rotate': ['get', 'heading'],
                                    'icon-allow-overlap': true,
                                    'icon-rotation-alignment': 'map',
                                    'icon-pitch-alignment': 'map',
                                },
                                paint: {
                                    'icon-color': ['get', 'color'],
                                    'icon-halo-color': 'rgba(0,0,0,0.6)',
                                    'icon-halo-width': 1,
                                },
                            });

                            if (vesselHandlersInstalledRef.current) return;
                            vesselHandlersInstalledRef.current = true;

                            // Vessel hover tooltip
                            const vesselPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 8, className: 'verdaxis-vessel-tooltip' });
                            map.on('mouseenter', 'vessels-layer', (e) => {
                                map.getCanvas().style.cursor = 'pointer';
                                if (!e.features?.length) return;
                                const translate = translateRef.current;
                                const p = e.features[0].properties;
                                const coords = (e.features[0].geometry as any).coordinates.slice();
                                const ciiColor = ['A','B'].includes(p.ciiGrade) ? '#10B981' : p.ciiGrade === 'C' ? '#F59E0B' : '#EF4444';
                                const vesselType = translate(`buyerMap.vesselTypes.${translationKey(p.vesselType || '')}`, { defaultValue: translate('buyerMap.vesselTypes.other') });
                                const html = '<div style="font-family:\'DM Sans\',sans-serif"><strong>' + escapeHtml(p.name) + '</strong>'
                                    + '<div style="font-size:10px;color:#94A3B8;margin-top:2px">' + escapeHtml(vesselType)
                                    + (p.ciiGrade ? ' <span style="color:' + ciiColor + ';font-weight:700">CII ' + escapeHtml(p.ciiGrade) + '</span>' : '')
                                    + '</div></div>';
                                vesselPopup.setLngLat(coords).setHTML(html).addTo(map);
                            });
                            map.on('mouseleave', 'vessels-layer', () => {
                                map.getCanvas().style.cursor = '';
                                vesselPopup.remove();
                            });
                        }
                    }
                };

                map.on('style.load', installVessels);
                if (map.loaded()) installVessels();
            } catch (e) {
                console.error('Failed to load vessels', e);
            }
        };

        addVessels();
        return () => {
            cancelled = true;
            if (installVessels) map.off('style.load', installVessels);
        };
    }, [mapCreated, ready]);

    // Window trade-at handler for popup button
    useEffect(() => {
        (window as any).__verdaxisTradeAt = (portId: string) => {
            const port = ports.find(p => p.id === portId);
            if (port) {
                if (onOrderClick) onOrderClick(port);
                else onPortSelect(port);
            }
        };
        return () => { delete (window as any).__verdaxisTradeAt; };
    }, [ports, onOrderClick, onPortSelect]);

    if (!ready) {
        return (
            <div className="relative flex h-full w-full overflow-hidden">
                <div className="relative z-0 flex-1">
                    <div ref={mapContainer} className="verdaxis-buyer-map h-full w-full" />
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                        <div className="flex flex-col items-center">
                            <Loader2 size={40} className="mb-4 animate-spin text-emerald-500" />
                            <p className="animate-pulse font-bold text-slate-500">{t('buyerMap.loading')}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const mapChromeStyle = {
        '--verdaxis-map-rail-offset': isPanelOpen ? '344px' : '24px',
    } as React.CSSProperties;
    const activeLayerCount = [showMarketWatch, showMarketWidgets, showSecaZones].filter(Boolean).length;

    return (
        <div className="relative w-full h-full flex overflow-hidden" style={mapChromeStyle}>
            {/* The Map */}
            <div className="flex-1 relative z-0">
                <div ref={mapContainer} className="verdaxis-buyer-map" role="region" aria-label={t('buyerMap.mapLabel')} style={{ width: '100%', height: '100%' }} />
                {(loadError || marketDataError) && (
                    <div className="pointer-events-none absolute left-1/2 top-16 z-[25] -translate-x-1/2 rounded-lg border border-amber-200 bg-white/95 px-4 py-2 text-center text-xs text-slate-600 shadow-lg backdrop-blur-sm dark:border-amber-800 dark:bg-slate-900/95 dark:text-slate-300" role="alert">
                        {t('buyerMap.error')}
                    </div>
                )}

                {/* --- OVERLAY CONTROLS CONTAINER --- */}
                {showMarketWidgets && (
                    <div className={`absolute bottom-6 left-6 z-[8] flex flex-col gap-3 transition-all duration-300 pointer-events-none ${isPanelOpen ? 'right-80 mr-6' : 'right-6'}`}>

                        {/* Top Row: Widgets */}
                        <div className="flex justify-between items-end flex-wrap-reverse gap-4">
                            {/* 1. Fuel Availability from Marketplace Data */}
                            <div className="pointer-events-auto w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 hidden lg:block">
                                <div className="flex items-center space-x-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <BarChart3 size={16} className="text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{t('buyerMap.marketAvails')}</span>
                                </div>
                                <div className="space-y-3">
                                    {availsByRegion.length > 0 ? (
                                        availsByRegion.map((item) => (
                                            <div key={item.region}>
                                                <div className="flex justify-between text-[10px] mb-1 font-bold text-slate-500 dark:text-slate-400">
                                                    <span>{item.region}</span>
                                                    <span className="font-mono">{item.qty.toLocaleString()} MT</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                                                    <div
                                                        className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
                                                        style={{ width: `${Math.max(10, (item.qty / maxAvailQty) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {t('buyerMap.noOpenAsks')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Recent Listings Widget (Right) */}
                            <div className="pointer-events-auto w-48 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2.5 hidden lg:block ml-auto">
                                <div className="flex items-center space-x-1.5 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                    <History size={12} className="text-slate-500 dark:text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">{t('buyerMap.lastDone')}</span>
                                </div>
                                <div className="space-y-1">
                                    {recentListingsByRegion.length > 0 ? (
                                        recentListingsByRegion.map((item) => (
                                            <div key={item.region} className="flex justify-between items-center text-[10px] px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{item.region}</span>
                                                </div>
                                                <span className="font-mono text-emerald-600 text-[9px]">${item.price.toFixed(0)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {t('buyerMap.noOpenListingIndications')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showMarketWatch && (
                    <div className="pointer-events-auto absolute left-6 right-[var(--verdaxis-map-rail-offset)] top-6 z-[30] transition-all duration-300">
                        <MarketWatchTicker
                            active={active}
                            isPanelOpen={isPanelOpen}
                            onOpenPanel={() => setIsPanelOpen(true)}
                            ports={ports}
                            aggregatedData={aggregatedData}
                        />
                    </div>
                )}

                {/* Layer controls + fuel filter (Top-left) */}
                <div ref={toolbarRef} className={`absolute ${showMarketWatch ? 'top-20' : 'top-6'} left-6 right-[var(--verdaxis-map-rail-offset)] z-[20] flex flex-wrap items-center gap-2`}>
                    <div ref={layersMenuRef} className="relative">
                        <button
                            type="button"
                            aria-haspopup="dialog"
                            aria-expanded={isLayersMenuOpen}
                            onClick={() => setIsLayersMenuOpen(current => !current)}
                            className={`flex items-center gap-2 rounded-lg border bg-white/90 px-3 py-2.5 text-xs font-bold shadow-lg backdrop-blur-sm transition-colors dark:bg-slate-900/90 ${
                                isLayersMenuOpen
                                    ? 'border-emerald-400 text-emerald-700 dark:border-emerald-500/60 dark:text-emerald-300'
                                    : 'border-slate-200 text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Layers size={16} />
                            <span>{t('buyerMap.layers.button')}</span>
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 font-mono text-[10px] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                {activeLayerCount}
                            </span>
                        </button>

                        {isLayersMenuOpen && (
                            <div
                                role="dialog"
                                aria-label={t('buyerMap.layers.dialogLabel')}
                                className="absolute left-0 top-full z-[40] mt-2 w-72 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95"
                            >
                                <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                                    {t('buyerMap.layers.section')}
                                </div>
                                <LayerSwitch
                                    checked={showMarketWatch}
                                    label={t('buyerMap.layers.marketWatch')}
                                    description={t('buyerMap.layers.marketWatchDescription')}
                                    onChange={() => setShowMarketWatch(current => !current)}
                                >
                                    <TrendingUp size={16} />
                                </LayerSwitch>
                                <LayerSwitch
                                    checked={showMarketWidgets}
                                    label={t('buyerMap.layers.marketActivity')}
                                    description={t('buyerMap.layers.marketActivityDescription')}
                                    onChange={() => setShowMarketWidgets(current => !current)}
                                >
                                    <BarChart3 size={16} />
                                </LayerSwitch>
                                <LayerSwitch
                                    checked={showSecaZones}
                                    label={t('buyerMap.layers.ecaZones')}
                                    description={t('buyerMap.layers.ecaZonesDescription')}
                                    onChange={() => setShowSecaZones(current => !current)}
                                >
                                    <Shield size={16} />
                                </LayerSwitch>

                                <div className="mx-2 mb-2 flex items-center gap-3 pl-7 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-sky-400" />{t('buyerMap.layers.active')}</span>
                                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" />{t('buyerMap.layers.transition')}</span>
                                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-violet-500" />{t('buyerMap.layers.adopted')}</span>
                                </div>

                                <div className="border-t border-slate-100 px-2 pt-2 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={focusEuropeanEcaZones}
                                        className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"
                                    >
                                        <LocateFixed size={14} />
                                        {t('buyerMap.layers.focusEurope')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Product filter — controls which product's spread colors the port circles */}
                    {availableProducts.length > 0 && (
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1.5 flex flex-wrap items-center gap-1">
                            <Fuel size={14} className="text-slate-400 ml-1" />
                            <button
                                aria-pressed={!selectedProduct}
                                onClick={() => setSelectedProduct(undefined)}
                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                    !selectedProduct
                                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {t('buyerMap.allProducts')}
                            </button>
                            {availableProducts.map(product => (
                                <button
                                    key={product}
                                    aria-pressed={selectedProduct === product}
                                    onClick={() => setSelectedProduct(product)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                        selectedProduct === product
                                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    {product}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="relative flex w-full flex-wrap items-center gap-2">
                        <VerdaxisSelect
                            value={selectedPortId ?? ''}
                            ariaLabel={t('buyerMap.navigation.choosePort')}
                            placeholder={t('buyerMap.navigation.choosePort')}
                            options={ports.map(port => ({ value: port.id, label: port.name }))}
                            onChange={portId => {
                                const port = ports.find(item => item.id === portId);
                                if (port) handlePanelPortSelect(port);
                            }}
                            className="w-48"
                            triggerClassName="min-h-11 bg-white/95 dark:bg-slate-900/95 shadow-sm"
                        />
                        <button type="button" onClick={focusAllPorts} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800">
                            <LocateFixed size={16} />
                            {t('buyerMap.navigation.allPorts')}
                        </button>
                        <MapLegend />
                    </div>
                </div>
            </div>

            {/* Toggle Button (Visible when panel is closed) */}
            {!isPanelOpen && (
                <button
                    onClick={() => setIsPanelOpen(true)}
                    aria-label={t('buyerMap.showInsights')}
                    className="absolute top-4 right-4 z-[20] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-500 transition-colors"
                >
                    <Tooltip content={t('buyerMap.showInsights')} position="left">
                         <PanelRightOpen size={24} />
                    </Tooltip>
                </button>
            )}

            <IntelligencePanel
                active={active}
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                selectedPort={selectedPort}
                portOptions={ports}
                onMapPortSelect={handlePanelPortSelect}
                onPortSelect={onPortSelect}
            />
        </div>
    );
};
