import React, { useState, useEffect, useMemo } from 'react';
// Fix: Alias imports to allow casting to any, solving type definition errors for standard props
import { MapContainer as LMapContainer, TileLayer as LTileLayer, Marker as LMarker, Popup as LPopup, Tooltip as LTooltip } from 'react-leaflet';
import { ArrowRight, PanelRightOpen, Loader2, TrendingUp, History, BarChart3, Anchor, Layers, Eye, EyeOff } from 'lucide-react';
import { Port, Page, OrderBookOrder } from '../types';
import { Tooltip } from './ui/Tooltip';
import { IntelligencePanel } from './map/IntelligencePanel';
import { MarketWatchTicker } from './map/MarketWatchTicker';
import { createCustomIcon } from '../utils';
import { api } from '../services/api';
import { VesselMarkers } from './map/VesselMarkers';
import { MapLegend } from './map/MapLegend';
import { useCopilotContext } from '../context/CopilotContext';

// Fix: Cast components to any to bypass "Property does not exist" errors on standard props like center, icon, attribution
const MapContainer = LMapContainer as any;
const TileLayer = LTileLayer as any;
const Marker = LMarker as any;
const Popup = LPopup as any;
const MapTooltip = LTooltip as any;

interface BuyerMapProps {
    onPortSelect: (port: Port) => void;
    onNavigate: (page: Page) => void;
    onOrderClick?: (port: Port) => void;
}

import { useTheme } from '../context/ThemeContext';

export const BuyerMap: React.FC<BuyerMapProps> = ({ onPortSelect, onNavigate, onOrderClick }) => {
    const { theme } = useTheme();
    const { setPageContext } = useCopilotContext();
    const [ports, setPorts] = useState<Port[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [showOverlays, setShowOverlays] = useState(true);
    const [listings, setListings] = useState<OrderBookOrder[]>([]);

    // Fetch Ports and Listings from Backend
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [portsData, listingsData] = await Promise.all([
                    api.ports.list(),
                    api.orderbook.listAsks().catch(() => [] as OrderBookOrder[]),
                ]);
                setPorts(portsData);
                setListings(listingsData);
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

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center">
                    <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-bold animate-pulse">Loading Intelligence Map...</p>
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

                    {ports.map((port) => (
                        <Marker
                            key={port.id}
                            position={[port.location.lat, port.location.lng]}
                            icon={createCustomIcon(port.methanolSupply)}
                            eventHandlers={{
                                click: () => handleMarkerClick(port.id),
                            }}
                        >
                            <MapTooltip direction="top" offset={[0, -30]} opacity={1}>
                                <div className="text-xs font-bold text-slate-700">
                                    {port.name} <span className="text-emerald-600 ml-1">${port.priceMethanol}</span>
                                    {port.details?.lastDone && (
                                        <div className="text-[10px] text-slate-500 font-normal">Last: {port.details.lastDone}</div>
                                    )}
                                    {port.details?.upcomingProjects && port.details.upcomingProjects.length > 0 && (
                                        <div className="text-[10px] text-indigo-600 font-bold mt-0.5 border-t border-slate-100 pt-0.5">
                                            Future: {port.details.upcomingProjects[0].capacity} ({port.details.upcomingProjects[0].year})
                                        </div>
                                    )}
                                </div>
                            </MapTooltip>
                            <Popup
                                className="verdaxis-popup"
                                maxWidth={300}
                                minWidth={260}
                                autoPanPadding={[100, 100]}
                                eventHandlers={{
                                    add: (e: any) => {
                                        setTimeout(() => {
                                            if (e.target && e.target.update) {
                                                e.target.update();
                                            }
                                        }, 100);
                                    }
                                }}
                            >
                                <div className="min-w-[240px]">
                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700">
                                        <h3 className="font-['Montserrat'] font-bold text-lg text-white">{port.name || 'Unknown Port'}</h3>
                                        <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">{port.country || 'Global'}</span>
                                    </div>

                                    <div className="space-y-3 mb-4">
                                        {/* Avails & Spot Price */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Spot Price</div>
                                                <div className="text-base font-bold text-white">${port.priceMethanol}</div>
                                            </div>
                                            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Availability</div>
                                                <div className={`text-base font-bold ${port.methanolSupply === 'High' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                    {port.methanolSupply}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Financials */}
                                        {port.details && (
                                            <div className="bg-slate-800/80 p-2 rounded border border-slate-700 space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">Platts:</span>
                                                    <span className="font-bold text-slate-100">${port.details.plattsPrice?.toFixed(2) || '--'}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">Swap:</span>
                                                    <span className="font-bold text-slate-100">${port.details.swapPrice?.toFixed(2) || '--'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onOrderClick) {
                                                onOrderClick(port);
                                            } else {
                                                onPortSelect(port);
                                            }
                                        }}
                                        className="w-full bg-verdaxis text-white text-sm font-bold py-2.5 rounded shadow-sm hover:bg-sky-400 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span>Click to Order</span>
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
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
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">Methanol Avails (Top Ports)</span>
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
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">Last Done</span>
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

                        {/* Bottom Row: Market Watch Ticker */}
                        <div className="pointer-events-auto w-full">
                             <MarketWatchTicker isPanelOpen={isPanelOpen} onOpenPanel={() => setIsPanelOpen(true)} />
                        </div>
                    </div>
                )}

                {/* Overlay Toggle (Top-left) */}
                <div className="absolute top-6 left-6 z-[20]">
                    <button
                        onClick={() => setShowOverlays(!showOverlays)}
                        className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2.5 flex items-center gap-2 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        title={showOverlays ? 'Hide Overlays' : 'Show Overlays'}
                    >
                        {showOverlays ? (
                            <Eye size={16} className="text-emerald-500" />
                        ) : (
                            <EyeOff size={16} className="text-slate-400" />
                        )}
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {showOverlays ? 'Overlays' : 'Overlays'}
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
                    <Tooltip content="Show Insights" position="left">
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
