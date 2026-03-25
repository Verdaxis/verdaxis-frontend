import React, { useState, useEffect, useMemo } from 'react';
// Fix: Alias imports to allow casting to any, solving type definition errors for standard props
import { MapContainer as LMapContainer, TileLayer as LTileLayer, Popup as LPopup, Tooltip as LTooltip, CircleMarker as LCircleMarker } from 'react-leaflet';
import { ArrowRight, PanelRightOpen, Loader2, TrendingUp, History, BarChart3, Anchor, Layers, Eye, EyeOff } from 'lucide-react';
import { Port, Page, OrderBookOrder, AggregatedOrderbook } from '../types';
import { Tooltip } from './ui/Tooltip';
import { IntelligencePanel } from './map/IntelligencePanel';
import { MarketWatchTicker } from './map/MarketWatchTicker';
import { api } from '../services/api';
import { VesselMarkers } from './map/VesselMarkers';
import { MapLegend } from './map/MapLegend';
import { useCopilotContext } from '../context/CopilotContext';
import { useNamespace } from '../hooks/useNamespace';

// Fix: Cast components to any to bypass "Property does not exist" errors on standard props like center, icon, attribution
const MapContainer = LMapContainer as any;
const TileLayer = LTileLayer as any;
const Popup = LPopup as any;
const MapTooltip = LTooltip as any;
const CircleMarker = LCircleMarker as any;

interface BuyerMapProps {
    onPortSelect: (port: Port) => void;
    onNavigate: (page: Page) => void;
    onOrderClick?: (port: Port) => void;
}

import { useTheme } from '../context/ThemeContext';

// Aggregate port market data from the orderbook aggregated endpoint
interface PortMarketData {
    totalVolume: number;
    fuelRows: Array<{
        fuel_type: string;
        bestBid: number | null;
        bestAsk: number | null;
        orderCount: number;
    }>;
    avgSpreadPct: number; // Average spread as % of mid-price
}

const computePortMarketData = (
    aggregated: AggregatedOrderbook[],
    portName: string,
    portCountry: string
): PortMarketData => {
    // Match by region (could be port name or country)
    const portRows = aggregated.filter(
        a => a.region === portName || a.region === portCountry
    );

    // Group by fuel_type
    const byFuel: Record<string, { bids: AggregatedOrderbook[]; asks: AggregatedOrderbook[] }> = {};
    portRows.forEach(row => {
        if (!byFuel[row.fuel_type]) byFuel[row.fuel_type] = { bids: [], asks: [] };
        if (row.side === 'BID') byFuel[row.fuel_type].bids.push(row);
        else byFuel[row.fuel_type].asks.push(row);
    });

    let totalVolume = 0;
    const spreads: number[] = [];
    const fuelRows = Object.entries(byFuel).map(([fuel_type, { bids, asks }]) => {
        const bestBid = bids.length > 0 ? Math.max(...bids.map(b => b.max_price)) : null;
        const bestAsk = asks.length > 0 ? Math.min(...asks.map(a => a.min_price)) : null;
        const orderCount = bids.reduce((s, b) => s + b.order_count, 0) + asks.reduce((s, a) => s + a.order_count, 0);
        totalVolume += bids.reduce((s, b) => s + b.total_quantity, 0) + asks.reduce((s, a) => s + a.total_quantity, 0);

        if (bestBid !== null && bestAsk !== null) {
            const mid = (bestBid + bestAsk) / 2;
            if (mid > 0) spreads.push(((bestAsk - bestBid) / mid) * 100);
        }

        return { fuel_type, bestBid, bestAsk, orderCount };
    }).filter(r => r.orderCount > 0);

    const avgSpreadPct = spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 999;

    return { totalVolume, fuelRows, avgSpreadPct };
};

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
    const [ports, setPorts] = useState<Port[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [showOverlays, setShowOverlays] = useState(true);
    const [listings, setListings] = useState<OrderBookOrder[]>([]);
    const [aggregatedData, setAggregatedData] = useState<AggregatedOrderbook[]>([]);

    // Fetch Ports, Listings, and Aggregated data from Backend
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [portsData, listingsData, aggData] = await Promise.all([
                    api.ports.list(),
                    api.orderbook.listAsks().catch(() => [] as OrderBookOrder[]),
                    api.orderbook.aggregated().catch(() => [] as AggregatedOrderbook[]),
                ]);
                setPorts(portsData);
                setListings(listingsData);
                setAggregatedData(aggData);
                setPageContext({
                    view: 'Global Intelligence Map',
                    available_ports: portsData.length,
                    port_names: portsData.map((p: Port) => p.name),
                    summary: "User is viewing the global interactive map showing methanol availability and vessel movements."
                });
            } catch (e) {
                console.error("Failed to load map data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const selectedPort = ports.find(p => p.id === selectedPortId);

    const handleMarkerClick = (portId: string) => {
        setSelectedPortId(portId);
        setIsPanelOpen(true);
    };

    // Pre-compute market data for each port
    const portMarketMap = useMemo(() => {
        const map: Record<string, PortMarketData> = {};
        ports.forEach(port => {
            map[port.id] = computePortMarketData(aggregatedData, port.name, port.country);
        });
        return map;
    }, [ports, aggregatedData]);

    // Max volume across all ports (for radius scaling)
    const maxVolume = useMemo(() => {
        return Math.max(1, ...Object.values(portMarketMap).map(d => d.totalVolume));
    }, [portMarketMap]);

    // Aggregate listings by region for Methanol Avails
    const availsByRegion = useMemo(() => {
        const regionMap: Record<string, number> = {};
        listings
            .filter(l => l.fuel_type.toLowerCase().includes('methanol'))
            .forEach(l => {
                const region = l.region;
                regionMap[region] = (regionMap[region] || 0) + Number(l.quantity_mt);
            });

        return Object.entries(regionMap)
            .map(([region, qty]) => ({ region, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [listings]);

    const maxAvailQty = availsByRegion.length > 0 ? availsByRegion[0].qty : 1;

    // Last Done: derive from listings (most recent listing per region)
    const lastDoneByRegion = useMemo(() => {
        const regionMap: Record<string, { price: number; qty: number; date: string }> = {};
        listings
            .filter(l => l.fuel_type.toLowerCase().includes('methanol'))
            .forEach(l => {
                const region = l.region;
                if (!regionMap[region] || l.created_at > regionMap[region].date) {
                    regionMap[region] = {
                        price: Number(l.price_per_mt_usd),
                        qty: Number(l.quantity_mt),
                        date: l.created_at,
                    };
                }
            });

        return Object.entries(regionMap)
            .map(([region, data]) => ({ region, ...data }))
            .slice(0, 4);
    }, [listings]);

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

    const isDark = document.documentElement.classList.contains('dark');

    return (
        <div className="relative w-full h-full flex overflow-hidden">
            {/* The Map */}
            <div className="flex-1 relative z-0">
                <MapContainer
                    center={[25, 10]}
                    zoom={3}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%', background: isDark ? '#0f172a' : '#F8FAFC' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url={isDark
                             ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                             : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                    />

                    {/* Fleet Layer */}
                    <VesselMarkers />

                    {ports.map((port) => {
                        const mkt = portMarketMap[port.id] || { totalVolume: 0, fuelRows: [], avgSpreadPct: 999 };
                        const radius = getPortRadius(mkt.totalVolume, maxVolume);
                        const spreadColor = getSpreadColor(mkt.avgSpreadPct);

                        return (
                            <CircleMarker
                                className="port-pulse"
                                key={port.id}
                                center={[port.location.lat, port.location.lng]}
                                radius={radius}
                                pathOptions={{
                                    color: spreadColor,
                                    weight: 2,
                                    fillColor: isDark ? '#1E293B' : '#FFFFFF',
                                    fillOpacity: 0.85,
                                }}
                                eventHandlers={{
                                    click: () => handleMarkerClick(port.id),
                                }}
                            >
                                <MapTooltip direction="top" offset={[0, -radius]} opacity={1}>
                                    <div className="text-xs font-bold text-slate-700">
                                        {port.name} <span className="text-emerald-600 ml-1">${port.priceMethanol}</span>
                                        {mkt.totalVolume > 0 && (
                                            <div className="text-[10px] text-slate-500 font-normal">
                                                {Math.round(mkt.totalVolume).toLocaleString()} MT open
                                            </div>
                                        )}
                                    </div>
                                </MapTooltip>
                                <Popup
                                    className="verdaxis-port-popup"
                                    maxWidth={280}
                                    minWidth={260}
                                    autoPanPadding={[100, 100]}
                                >
                                    <div className="w-[260px]" style={{
                                        background: isDark ? '#0F172A' : '#1E293B',
                                        color: '#F8FAFC',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        fontFamily: "'DM Sans', 'Inter', sans-serif",
                                    }}>
                                        {/* Port Header */}
                                        <h3 style={{
                                            fontFamily: "'Montserrat', sans-serif",
                                            fontWeight: 700,
                                            fontSize: '15px',
                                            marginBottom: '8px',
                                            paddingBottom: '6px',
                                            borderBottom: '1px solid rgba(148,163,184,0.2)',
                                        }}>
                                            {port.name || 'Unknown Port'}
                                            <span style={{ display: 'block', fontSize: '10px', fontWeight: 500, color: '#94A3B8', marginTop: '2px' }}>
                                                {port.country || 'Global'}
                                            </span>
                                        </h3>

                                        {/* Live Bid/Ask Table */}
                                        {mkt.fuelRows.length > 0 ? (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '10px' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.3)' }}>
                                                        <th style={{ textAlign: 'left', padding: '3px 0', color: '#94A3B8', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>Fuel Type</th>
                                                        <th style={{ textAlign: 'right', padding: '3px 4px', color: '#94A3B8', fontWeight: 600, fontSize: '10px' }}>Bid</th>
                                                        <th style={{ textAlign: 'right', padding: '3px 4px', color: '#94A3B8', fontWeight: 600, fontSize: '10px' }}>Ask</th>
                                                        <th style={{ textAlign: 'right', padding: '3px 0', color: '#94A3B8', fontWeight: 600, fontSize: '10px' }}>#</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {mkt.fuelRows.map((row, i) => (
                                                        <tr key={i} style={{ borderBottom: i < mkt.fuelRows.length - 1 ? '1px solid rgba(148,163,184,0.1)' : 'none' }}>
                                                            <td style={{ padding: '4px 0', fontWeight: 600, color: '#E2E8F0' }}>{row.fuel_type}</td>
                                                            <td style={{ textAlign: 'right', padding: '4px 4px', fontFamily: "'IBM Plex Mono', monospace", color: '#10B981', fontWeight: 600 }}>
                                                                {row.bestBid !== null ? `$${row.bestBid.toFixed(0)}` : '--'}
                                                            </td>
                                                            <td style={{ textAlign: 'right', padding: '4px 4px', fontFamily: "'IBM Plex Mono', monospace", color: '#EF4444', fontWeight: 600 }}>
                                                                {row.bestAsk !== null ? `$${row.bestAsk.toFixed(0)}` : '--'}
                                                            </td>
                                                            <td style={{ textAlign: 'right', padding: '4px 0', color: '#94A3B8' }}>{row.orderCount}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '10px', padding: '8px 0', textAlign: 'center' }}>
                                                No live orders at this port
                                            </div>
                                        )}

                                        {/* Trade CTA Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onOrderClick) {
                                                    onOrderClick(port);
                                                } else {
                                                    onPortSelect(port);
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                background: '#10B981',
                                                color: '#FFFFFF',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                padding: '8px 0',
                                                borderRadius: '6px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            Trade at {port.name} →
                                        </button>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>

                {/* --- OVERLAY CONTROLS CONTAINER --- */}
                {showOverlays && (
                    <div className={`absolute bottom-6 left-6 z-[20] flex flex-col gap-3 transition-all duration-300 pointer-events-none ${isPanelOpen ? 'right-80 mr-6' : 'right-6'}`}>

                        {/* Top Row: Widgets */}
                        <div className="flex justify-between items-end flex-wrap-reverse gap-4">
                            {/* 1. Methanol Availability from Marketplace Data */}
                            <div className="pointer-events-auto w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 hidden lg:block">
                                <div className="flex items-center space-x-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <BarChart3 size={16} className="text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{t('buyerMap.methanolAvails')}</span>
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
                                        // Fallback to port-based display when no listings
                                        ports.filter(p => p.details).slice(0, 5).map((p) => (
                                            <div key={p.id}>
                                                <div className="flex justify-between text-[10px] mb-1 font-bold text-slate-500 dark:text-slate-400">
                                                    <span>{p.name}</span>
                                                    <span>{p.methanolSupply}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full ${p.methanolSupply === 'High' ? 'bg-emerald-500' : p.methanolSupply === 'Medium' ? 'bg-amber-400' : 'bg-red-400'}`}
                                                        style={{ width: p.methanolSupply === 'High' ? '90%' : p.methanolSupply === 'Medium' ? '60%' : '30%' }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))
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

                {/* Overlay Toggle (Top-left) */}
                <div className="absolute top-6 left-6 z-[20]">
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
