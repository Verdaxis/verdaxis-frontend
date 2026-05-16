import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowRight, PanelRightOpen, Loader2, TrendingUp, History, BarChart3, Anchor, Layers, Eye, EyeOff } from 'lucide-react';
import { Port, Page, OrderBookOrder, AggregatedOrderbook } from '../types';
import { Tooltip } from './ui/Tooltip';
import { IntelligencePanel } from './map/IntelligencePanel';
import { MarketWatchTicker } from './map/MarketWatchTicker';
import { api } from '../services/api';
import { MapLegend } from './map/MapLegend';
import { useCopilotContext } from '../context/CopilotContext';
import { useNamespace } from '../hooks/useNamespace';
import { calculateHeading } from '../utils';
import { useTheme } from '../context/ThemeContext';
import { computePortMarketData, PortMarketData } from '../utils/buyerMapMarket';
import { filterPortsByActiveDeliveryPoints } from '../utils/marketPorts';

interface BuyerMapProps {
    onPortSelect: (port: Port) => void;
    onNavigate: (page: Page) => void;
    onOrderClick?: (port: Port) => void;
}

type BuyerMapDataCache = {
    ports: Port[];
    listings: OrderBookOrder[];
    aggregatedData: AggregatedOrderbook[];
};

let buyerMapDataCache: BuyerMapDataCache | null = null;

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

export const BuyerMap: React.FC<BuyerMapProps> = ({ onPortSelect, onNavigate, onOrderClick }) => {
    const { t, ready } = useNamespace('dashboard');
    const { theme } = useTheme();
    const { setPageContext } = useCopilotContext();
    const [ports, setPorts] = useState<Port[]>(() => buyerMapDataCache?.ports ?? []);
    const [loading, setLoading] = useState(!buyerMapDataCache);
    const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [showOverlays, setShowOverlays] = useState(true);
    const [listings, setListings] = useState<OrderBookOrder[]>(() => buyerMapDataCache?.listings ?? []);
    const [aggregatedData, setAggregatedData] = useState<AggregatedOrderbook[]>(() => buyerMapDataCache?.aggregatedData ?? []);
    const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined);

    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const popupRef = useRef<maplibregl.Popup | null>(null);

    // Fetch ports first so the map can render, then refresh liquidity overlays.
    useEffect(() => {
        let cancelled = false;

        const applyData = (data: BuyerMapDataCache) => {
            if (cancelled) return;
            buyerMapDataCache = data;
            setPorts(data.ports);
            setListings(data.listings);
            setAggregatedData(data.aggregatedData);
            setPageContext({
                view: 'Global Intelligence Map',
                available_ports: data.ports.length,
                port_names: data.ports.map((p: Port) => p.name),
                summary: "User is viewing the global interactive map showing low-carbon fuel market depth and vessel movements."
            });
        };

        const fetchData = async () => {
            try {
                const [portsData, deliveryPointsData] = await Promise.all([
                    api.ports.list(),
                    api.catalog.deliveryPoints().catch(() => null),
                ]);
                const marketPorts = filterPortsByActiveDeliveryPoints(portsData, deliveryPointsData);
                if (!cancelled) {
                    setPorts(marketPorts);
                    setLoading(false);
                }

                const [listingsData, aggData] = await Promise.all([
                    api.orderbook.listAsks().catch(() => [] as OrderBookOrder[]),
                    api.orderbook.aggregated().catch(() => [] as AggregatedOrderbook[]),
                ]);
                applyData({ ports: marketPorts, listings: listingsData, aggregatedData: aggData });
            } catch (e) {
                console.error("Failed to load map data", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (buyerMapDataCache) {
            applyData(buyerMapDataCache);
            void fetchData();
        } else {
            void fetchData();
        }

        return () => {
            cancelled = true;
        };
    }, []);

    const selectedPort = ports.find(p => p.id === selectedPortId);

    const handleMarkerClick = useCallback((portId: string) => {
        setSelectedPortId(portId);
        setIsPanelOpen(true);
    }, []);

    // Pre-compute market data for each port
    const portMarketMap = useMemo(() => {
        const map: Record<string, PortMarketData> = {};
        ports.forEach(port => {
            map[port.id] = computePortMarketData(aggregatedData, port.name, port.country, selectedProduct);
        });
        return map;
    }, [ports, aggregatedData, selectedProduct]);

    // All distinct market products across all ports (for product filter selector)
    const availableProducts = useMemo(() => {
        const products = new Set<string>();
        Object.values(portMarketMap).forEach(mkt => {
            mkt.fuelRows.forEach(row => products.add(row.key));
        });
        return Array.from(products).sort();
    }, [portMarketMap]);

    // Max volume across all ports (for radius scaling)
    const maxVolume = useMemo(() => {
        return Math.max(1, ...Object.values(portMarketMap).map(d => d.totalVolume));
    }, [portMarketMap]);

    // Aggregate listings by region for Fuel Avails (all low-carbon fuels)
    const availsByRegion = useMemo(() => {
        const regionMap: Record<string, number> = {};
        listings.forEach(l => {
            const region = l.region;
            regionMap[region] = (regionMap[region] || 0) + Number(l.quantity_mt);
        });

        return Object.entries(regionMap)
            .map(([region, qty]) => ({ region, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 6);
    }, [listings]);

    const maxAvailQty = availsByRegion.length > 0 ? availsByRegion[0].qty : 1;

    // Last Done: derive from listings (most recent listing per region, all fuels)
    const lastDoneByRegion = useMemo(() => {
        const regionMap: Record<string, { price: number; qty: number; date: string; fuel: string }> = {};
        listings.forEach(l => {
            const region = l.region;
            if (!regionMap[region] || l.created_at > regionMap[region].date) {
                regionMap[region] = {
                    price: Number(l.price_per_mt_usd),
                    qty: Number(l.quantity_mt),
                    date: l.created_at,
                    fuel: l.fuel_type,
                };
            }
        });

        return Object.entries(regionMap)
            .map(([region, data]) => ({ region, ...data }))
            .slice(0, 6);
    }, [listings]);

    // Map initialization
    useEffect(() => {
        if (loading || !mapContainer.current || mapRef.current) return;

        const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'carto-base': {
                        type: 'raster',
                        tiles: [isDark
                            ? 'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png'
                            : 'https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png'],
                        tileSize: 256,
                    },
                    'carto-labels': {
                        type: 'raster',
                        tiles: [isDark
                            ? 'https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png'
                            : 'https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png'],
                        tileSize: 256,
                    },
                },
                layers: [
                    { id: 'carto-base', type: 'raster', source: 'carto-base' },
                    { id: 'carto-labels', type: 'raster', source: 'carto-labels' },
                ],
            },
            center: [10, 25],
            zoom: 2.5,
            attributionControl: false,
        });

        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

        mapRef.current = map;

        return () => { map.remove(); mapRef.current = null; };
    }, [loading, theme]);

    // Port markers layer
    useEffect(() => {
        const map = mapRef.current;
        if (!map || ports.length === 0) return;

        const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');

        const addPortLayers = () => {

            // Build GeoJSON for ports
            const portFeatures = ports.map(port => {
                const mkt = portMarketMap[port.id] || { totalVolume: 0, fuelRows: [], spreadPct: 999 };
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
                        priceMethanol: port.priceMethanol,
                        totalVolume: mkt.totalVolume,
                    },
                };
            });

            const geojson = { type: 'FeatureCollection' as const, features: portFeatures };

            if (map.getSource('ports')) {
                (map.getSource('ports') as maplibregl.GeoJSONSource).setData(geojson);
            } else {
                map.addSource('ports', { type: 'geojson', data: geojson });

                // Port fill circles
                map.addLayer({
                    id: 'port-fills',
                    type: 'circle',
                    source: 'ports',
                    paint: {
                        'circle-radius': ['get', 'radius'],
                        'circle-color': isDark ? '#1E293B' : '#FFFFFF',
                        'circle-opacity': 0.85,
                        'circle-stroke-width': 2,
                        'circle-stroke-color': ['get', 'color'],
                    },
                });

                // Hover tooltip popup
                const hoverPopup = new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    offset: 10,
                    className: 'verdaxis-port-popup',
                });

                map.on('mouseenter', 'port-fills', (e) => {
                    map.getCanvas().style.cursor = 'pointer';
                    if (!e.features?.length) return;
                    const f = e.features[0];
                    const props = f.properties;
                    const coords = (f.geometry as any).coordinates.slice();
                    const pricePart = props.priceMethanol
                        ? ' <span style="color:#10B981;font-family:\'IBM Plex Mono\',monospace">$' + props.priceMethanol + '</span>'
                        : '';
                    const volumePart = props.totalVolume > 0
                        ? '<div style="font-size:10px;color:#94A3B8;margin-top:2px">' + Math.round(props.totalVolume).toLocaleString() + ' MT open</div>'
                        : '';
                    const tooltipHtml = '<div style="background:#1E293B;color:#F8FAFC;border-radius:6px;padding:6px 10px;font-family:\'DM Sans\',\'Inter\',sans-serif;font-size:12px;white-space:nowrap">'
                        + '<span style="font-weight:700">' + props.name + '</span>'
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
                    const f = e.features[0];
                    const portId = f.properties.id;
                    handleMarkerClick(portId);

                    // Show popup
                    if (popupRef.current) popupRef.current.remove();

                    const mkt = portMarketMap[portId] || { totalVolume: 0, fuelRows: [], spreadPct: 999 };
                    const port = ports.find(p => p.id === portId);
                    if (!port) return;

                    // Build popup HTML
                    const fuelRowsHtml = mkt.fuelRows.length > 0
                        ? '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px">'
                            + '<thead><tr style="border-bottom:1px solid rgba(148,163,184,0.3)">'
                            + '<th style="text-align:left;padding:3px 0;color:#94A3B8;font-weight:600;font-size:10px;text-transform:uppercase">Fuel</th>'
                            + '<th style="text-align:right;padding:3px 4px;color:#94A3B8;font-weight:600;font-size:10px">Bid</th>'
                            + '<th style="text-align:right;padding:3px 4px;color:#94A3B8;font-weight:600;font-size:10px">Ask</th>'
                            + '<th style="text-align:right;padding:3px 0;color:#94A3B8;font-weight:600;font-size:10px">#</th>'
                            + '</tr></thead><tbody>'
                            + mkt.fuelRows.map((row, i) =>'<tr style="border-bottom:' + (i < mkt.fuelRows.length - 1 ? '1px solid rgba(148,163,184,0.1)' : 'none') + '">'
                                + '<td style="padding:4px 0;font-weight:600;color:#E2E8F0">' + row.label + '</td>'
                                + '<td style="text-align:right;padding:4px 4px;font-family:\'IBM Plex Mono\',monospace;color:#10B981;font-weight:600">' + (row.bestBid !== null ? '$' + row.bestBid.toFixed(0) : '--') + '</td>'
                                + '<td style="text-align:right;padding:4px 4px;font-family:\'IBM Plex Mono\',monospace;color:#EF4444;font-weight:600">' + (row.bestAsk !== null ? '$' + row.bestAsk.toFixed(0) : '--') + '</td>'
                                + '<td style="text-align:right;padding:4px 0;color:#94A3B8">' + row.orderCount + '</td>'
                                + '</tr>').join('')
                            + '</tbody></table>'
                        : '<div style="font-size:11px;color:#64748B;margin-bottom:10px;padding:8px 0;text-align:center">No live orders at this port</div>';

                    // Market intelligence section
                    const spotPrice = port.priceMethanol > 0 ? '$' + port.priceMethanol : '--';
                    const availabilityLabel = port.methanolSupply && port.methanolSupply !== 'Unknown' ? port.methanolSupply : '--';
                    const availColor = availabilityLabel === 'High'
                        ? '#10B981'
                        : availabilityLabel === 'Medium'
                            ? '#F59E0B'
                            : availabilityLabel === 'Low'
                                ? '#EF4444'
                                : '#94A3B8';
                    const plattsPrice = port.details?.plattsPrice ? '$' + port.details.plattsPrice.toFixed(2) : '--';
                    const swapPrice = port.details?.swapPrice ? '$' + port.details.swapPrice.toFixed(2) : '--';
                    const congestion = port.details?.congestionLevel && port.details.congestionLevel !== 'Unknown' ? port.details.congestionLevel : '--';
                    const congColor = congestion === 'Low' ? '#10B981' : congestion === 'Moderate' ? '#F59E0B' : congestion === 'High' ? '#EF4444' : '#94A3B8';
                    const lastDone = port.details?.lastDone || '';

                    const marketIntelHtml = '<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(148,163,184,0.15)">'
                        // Spot + Availability row
                        + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
                        + '<div><span style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-weight:600">Spot</span> <span style="font-size:16px;font-weight:700;color:#F8FAFC;font-family:\'IBM Plex Mono\',monospace;margin-left:4px">' + spotPrice + '</span></div>'
                        + '<div><span style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-weight:600">Avail</span> <span style="font-size:12px;font-weight:700;color:' + availColor + ';margin-left:4px">' + availabilityLabel + '</span></div>'
                        + '</div>'
                        // Platts & Swap box
                        + '<div style="background:rgba(148,163,184,0.08);padding:6px 8px;border-radius:6px;margin-bottom:6px">'
                        + '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">'
                        + '<span style="color:#E8373E;font-weight:600">Platts</span>'
                        + '<span style="font-weight:700;color:#E2E8F0;font-family:\'IBM Plex Mono\',monospace">' + plattsPrice + '</span>'
                        + '</div>'
                        + '<div style="display:flex;justify-content:space-between;font-size:11px">'
                        + '<span style="color:#94A3B8;font-weight:600">Swap</span>'
                        + '<span style="font-weight:700;color:#E2E8F0;font-family:\'IBM Plex Mono\',monospace">' + swapPrice + '</span>'
                        + '</div>'
                        + '</div>'
                        // Congestion + Last Done row
                        + '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px">'
                        + '<div><span style="color:#94A3B8;font-weight:600">Congestion</span> <span style="color:' + congColor + ';font-weight:700;margin-left:3px">' + congestion + '</span></div>'
                        + (lastDone ? '<div><span style="color:#94A3B8;font-weight:600">Last</span> <span style="color:#E2E8F0;font-weight:600;margin-left:3px">' + lastDone + '</span></div>' : '')
                        + '</div>'
                        + '</div>';

                    const html = '<div style="width:260px;background:' + (isDark ? '#0F172A' : '#1E293B') + ';color:#F8FAFC;border-radius:8px;padding:12px;font-family:\'DM Sans\',\'Inter\',sans-serif">'
                        + '<h3 style="font-family:\'Montserrat\',sans-serif;font-weight:700;font-size:15px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(148,163,184,0.2)">'
                        + (port.name || 'Unknown Port')
                        + '<span style="display:block;font-size:10px;font-weight:500;color:#94A3B8;margin-top:2px">' + (port.country || 'Global') + '</span>'
                        + '</h3>'
                        + fuelRowsHtml
                        + marketIntelHtml
                        + '<button onclick="window.__verdaxisTradeAt && window.__verdaxisTradeAt(\'' + port.id + '\')" style="width:100%;background:#10B981;color:#FFF;font-size:12px;font-weight:700;padding:8px 0;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">Trade at ' + port.name + ' \u2192</button>'
                        + '</div>';

                    const coords = (f.geometry as any).coordinates.slice();
                    popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '280px', className: 'verdaxis-port-popup' })
                        .setLngLat(coords)
                        .setHTML(html)
                        .addTo(map);
                });
            }
        };

        if (map.loaded()) {
            addPortLayers();
        } else {
            map.once('load', addPortLayers);
        }
    }, [ports, portMarketMap, maxVolume, handleMarkerClick]);

    // Vessel markers layer
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const addVessels = async () => {
            try {
                const vessels = await api.vessels.list();

                const addVesselLayers = () => {

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
                        (map.getSource('vessels') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features });
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

                            // Vessel hover tooltip
                            const vesselPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8, className: 'verdaxis-vessel-tooltip' });
                            map.on('mouseenter', 'vessels-layer', (e) => {
                                map.getCanvas().style.cursor = 'pointer';
                                if (!e.features?.length) return;
                                const p = e.features[0].properties;
                                const coords = (e.features[0].geometry as any).coordinates.slice();
                                const ciiColor = ['A','B'].includes(p.ciiGrade) ? '#10B981' : p.ciiGrade === 'C' ? '#F59E0B' : '#EF4444';
                                const html = '<div style="font-family:\'DM Sans\',sans-serif"><strong>' + p.name + '</strong>'
                                    + '<div style="font-size:10px;color:#94A3B8;margin-top:2px">' + p.vesselType
                                    + (p.ciiGrade ? ' <span style="color:' + ciiColor + ';font-weight:700">CII ' + p.ciiGrade + '</span>' : '')
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

                if (map.loaded()) {
                    addVesselLayers();
                } else {
                    map.once('load', addVesselLayers);
                }
            } catch (e) {
                console.error('Failed to load vessels', e);
            }
        };

        addVessels();
    }, [loading]);

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

    if (!ready || loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center">
                    <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-bold animate-pulse">{t('buyerMap.loading')}</p>
                </div>
            </div>
        );
    }

    const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');

    return (
        <div className="relative w-full h-full flex overflow-hidden">
            {/* The Map */}
            <div className="flex-1 relative z-0">
                <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

                {/* --- OVERLAY CONTROLS CONTAINER --- */}
                {showOverlays && (
                    <div className={`absolute bottom-6 left-6 z-[20] flex flex-col gap-3 transition-all duration-300 pointer-events-none ${isPanelOpen ? 'right-80 mr-6' : 'right-6'}`}>

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
                                            No live asks available yet.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Last Done Widget (Right) */}
                            <div className="pointer-events-auto w-48 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2.5 hidden lg:block ml-auto">
                                <div className="flex items-center space-x-1.5 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                    <History size={12} className="text-slate-500 dark:text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">{t('buyerMap.lastDone')}</span>
                                </div>
                                <div className="space-y-1">
                                    {lastDoneByRegion.length > 0 ? (
                                        lastDoneByRegion.map((item) => (
                                            <div key={item.region} className="flex justify-between items-center text-[10px] px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{item.region}</span>
                                                </div>
                                                <span className="font-mono text-emerald-600 text-[9px]">${item.price.toFixed(0)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        ports.filter(p => p.details).slice(0, 4).map((p) => (
                                            <div key={p.id} className="flex justify-between items-center text-[10px] px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors" onClick={() => handleMarkerClick(p.id)}>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{p.name}</span>
                                                </div>
                                                <span className="font-mono text-emerald-600 text-[9px]">{p.details?.lastDone || '--'}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overlay Toggle + Fuel Filter (Top-left) */}
                <div className="absolute top-6 left-6 z-[20] flex items-center gap-2">
                    <button
                        onClick={() => setShowOverlays(!showOverlays)}
                        className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2.5 flex items-center gap-2 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        title={showOverlays ? t('buyerMap.overlays') : t('buyerMap.overlays')}
                    >
                        {showOverlays ? (
                            <Eye size={16} className="text-emerald-500" />
                        ) : (
                            <EyeOff size={16} className="text-slate-400" />
                        )}
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {t('buyerMap.overlays')}
                        </span>
                    </button>

                    {/* Product filter — controls which product's spread colors the port circles */}
                    {availableProducts.length > 0 && (
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1.5 flex items-center gap-1">
                            <Layers size={14} className="text-slate-400 ml-1" />
                            <button
                                onClick={() => setSelectedProduct(undefined)}
                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                    !selectedProduct
                                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                All
                            </button>
                            {availableProducts.map(product => (
                                <button
                                    key={product}
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
                </div>
            </div>

            {/* Toggle Button (Visible when panel is closed) */}
            {!isPanelOpen && (
                <button
                    onClick={() => setIsPanelOpen(true)}
                    className="absolute top-4 right-4 z-[20] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-500 transition-colors"
                >
                    <Tooltip content={t('buyerMap.showInsights')} position="left">
                         <PanelRightOpen size={24} />
                    </Tooltip>
                </button>
            )}

            <MapLegend />

            <IntelligencePanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                selectedPort={selectedPort}
                onPortSelect={onPortSelect}
                onNavigate={onNavigate}
                ports={ports}
            />
        </div>
    );
};
