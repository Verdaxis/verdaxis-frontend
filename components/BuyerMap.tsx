import React, { useState, useEffect } from 'react';
// Fix: Alias imports to allow casting to any, solving type definition errors for standard props
import { MapContainer as LMapContainer, TileLayer as LTileLayer, Marker as LMarker, Popup as LPopup, Polyline as LPolyline } from 'react-leaflet';
import { ArrowRight, PanelRightOpen, Loader2, TrendingUp, History, BarChart3, Anchor } from 'lucide-react';
import { Port, Page } from '../types';
import { Tooltip } from './ui/Tooltip';
import { IntelligencePanel } from './map/IntelligencePanel';
import { MarketWatchTicker } from './map/MarketWatchTicker';
import { createCustomIcon } from '../utils';
import { api } from '../services/api';

// Fix: Cast components to any to bypass "Property does not exist" errors on standard props like center, icon, attribution
const MapContainer = LMapContainer as any;
const TileLayer = LTileLayer as any;
const Marker = LMarker as any;
const Popup = LPopup as any;
const Polyline = LPolyline as any;

interface BuyerMapProps {
    onPortSelect: (port: Port) => void;
    onNavigate: (page: Page) => void;
}

// Major Methanol Trade Routes (Digital Lines)
// Coordinates approximate: Start -> End
const TRADE_ROUTES: { positions: [number, number][]; label: string }[] = [
    { positions: [[1.29027, 103.851959], [51.9225, 4.47917]], label: "Singapore to Rotterdam (Main Trunk)" },
    { positions: [[29.7604, -95.3698], [51.9225, 4.47917]], label: "Houston to Rotterdam (Atlantic)" },
    { positions: [[29.7604, -95.3698], [31.2304, 121.4737]], label: "Houston to Shanghai (Pacific)" },
];

export const BuyerMap: React.FC<BuyerMapProps> = ({ onPortSelect, onNavigate }) => {
    const [ports, setPorts] = useState<Port[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [showArbitrage, setShowArbitrage] = useState(false); // Can be repurposed as "Show Routes" toggle if needed
    
    // Fetch Ports from "Backend"
    useEffect(() => {
        const fetchPorts = async () => {
            try {
                const data = await api.ports.list();
                setPorts(data);
            } catch (e) {
                console.error("Failed to load ports", e);
            } finally {
                setLoading(false);
            }
        };
        fetchPorts();
    }, []);

    const selectedPort = ports.find(p => p.id === selectedPortId);

    const handleMarkerClick = (portId: string) => {
        setSelectedPortId(portId);
        setIsPanelOpen(true);
    };

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center">
                    <Loader2 size={40} className="text-verdaxis animate-spin mb-4" />
                    <p className="text-slate-500 font-bold animate-pulse">Loading Intelligence Map...</p>
                </div>
            </div>
        );
    }

    // Prepare chart data (Top 5 container ports by Methanol Supply for simplicity)
    const topPorts = ports.filter(p => p.details).slice(0, 5);

    return (
        <div className="relative w-full h-full flex overflow-hidden">
            {/* The Map */}
            <div className="flex-1 relative z-0">
                <MapContainer 
                    center={[25, 10]} 
                    zoom={3} 
                    scrollWheelZoom={true} 
                    style={{ height: '100%', width: '100%', background: '#eef2f6' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    
                    {/* Common Trade Routes (Digital Lines) */}
                    {showArbitrage && TRADE_ROUTES.map((route, idx) => (
                        // Fix: Use pathOptions for Polyline styling in react-leaflet v3+
                        <Polyline 
                            key={idx}
                            positions={route.positions}
                            pathOptions={{
                                color: "#334155",
                                dashArray: "5, 10",
                                weight: 2,
                                opacity: 0.6
                            }}
                        >
                             <Popup>
                                <div className="text-xs font-bold text-slate-700">
                                    {route.label}<br/>
                                    <span className="text-verdaxis">Active Methanol Lifting Route</span>
                                </div>
                            </Popup>
                        </Polyline>
                    ))}

                    {ports.map((port) => (
                        <Marker 
                            key={port.id} 
                            position={[port.location.lat, port.location.lng]}
                            icon={createCustomIcon(port.methanolSupply)}
                            eventHandlers={{
                                click: () => handleMarkerClick(port.id),
                            }}
                        >
                            <Popup className="verdaxis-popup" maxWidth={300}>
                                <div className="p-1 min-w-[240px]">
                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                                        <h3 className="font-['Montserrat'] font-bold text-lg text-verdaxis-dark">{port.name}</h3>
                                        <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{port.country}</span>
                                    </div>
                                    
                                    <div className="space-y-3 mb-4">
                                        {/* Avails & Spot Price */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Spot Price</div>
                                                <div className="text-base font-bold text-[#334155]">${port.priceMethanol}</div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Availability</div>
                                                <div className={`text-base font-bold ${port.methanolSupply === 'High' ? 'text-green-600' : 'text-amber-500'}`}>
                                                    {port.methanolSupply}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Financials */}
                                        {port.details && (
                                            <div className="bg-blue-50/50 p-2 rounded border border-blue-100 space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500">Platts:</span>
                                                    <span className="font-bold text-slate-700">${port.details.plattsPrice?.toFixed(2) || '--'}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500">FFA:</span>
                                                    <span className="font-bold text-slate-700">${port.details.ffaPrice?.toFixed(2) || '--'}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500">Swap:</span>
                                                    <span className="font-bold text-slate-700">${port.details.swapPrice?.toFixed(2) || '--'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPortSelect(port);
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
                {/* This flex container manages the Bottom Widgets and the Market Watch Ticker */}
                <div className={`absolute bottom-6 left-6 z-[20] flex flex-col gap-3 transition-all duration-300 pointer-events-none ${isPanelOpen ? 'right-80 mr-6' : 'right-6'}`}>
                    
                    {/* Top Row: Widgets */}
                    <div className="flex justify-between items-end flex-wrap-reverse gap-4">
                        {/* 1. Real Time Methanol Availability (Left) */}
                        <div className="pointer-events-auto w-64 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 p-4 hidden lg:block">
                            <div className="flex items-center space-x-2 mb-3 border-b border-slate-100 pb-2">
                                <BarChart3 size={16} className="text-verdaxis" />
                                <span className="text-xs font-bold text-[#334155] uppercase">Methanol Avails (Top Ports)</span>
                            </div>
                            <div className="space-y-3">
                                {topPorts.map((p, i) => (
                                    <div key={p.id}>
                                        <div className="flex justify-between text-[10px] mb-1 font-bold text-slate-600">
                                            <span>{p.name}</span>
                                            <span>{p.methanolSupply}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div 
                                                className={`h-1.5 rounded-full ${p.methanolSupply === 'High' ? 'bg-green-500' : p.methanolSupply === 'Medium' ? 'bg-amber-400' : 'bg-red-400'}`} 
                                                style={{ width: p.methanolSupply === 'High' ? '90%' : p.methanolSupply === 'Medium' ? '60%' : '30%' }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Last Done Widget (Right) */}
                        <div className="pointer-events-auto w-64 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 p-4 hidden lg:block ml-auto">
                            <div className="flex items-center space-x-2 mb-3 border-b border-slate-100 pb-2">
                                <History size={16} className="text-[#334155]" />
                                <span className="text-xs font-bold text-[#334155] uppercase">Last Done at Key Ports</span>
                            </div>
                            <div className="space-y-2">
                                {topPorts.slice(0, 4).map((p, i) => (
                                    <div key={p.id} className="flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 rounded cursor-pointer" onClick={() => handleMarkerClick(p.id)}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                            <span className="font-bold text-slate-600">{p.name}</span>
                                        </div>
                                        <span className="font-mono text-[#334155]">{p.details?.lastDone || '--'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Market Watch Ticker */}
                    <div className="pointer-events-auto w-full">
                         <MarketWatchTicker isPanelOpen={isPanelOpen} onOpenPanel={() => setIsPanelOpen(true)} />
                    </div>
                </div>

                <div className="absolute top-6 left-6 z-[20] bg-white rounded-lg shadow-md p-2 space-y-2">
                    <div className="flex items-center space-x-2">
                        <div className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${showArbitrage ? 'bg-indigo-500' : 'bg-slate-300'}`} onClick={() => setShowArbitrage(!showArbitrage)}>
                             <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${showArbitrage ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-600">Highlight Routes</span>
                    </div>
                </div>
            </div>

            {/* Toggle Button (Visible when panel is closed) */}
            {!isPanelOpen && (
                <button
                    onClick={() => setIsPanelOpen(true)}
                    className="absolute top-4 right-4 z-[20] bg-white p-2 rounded-lg shadow-lg border border-slate-200 text-slate-500 hover:text-verdaxis transition-colors"
                >
                    <Tooltip content="Show Insights" position="left">
                         <PanelRightOpen size={24} />
                    </Tooltip>
                </button>
            )}

            <IntelligencePanel 
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                selectedPort={selectedPort}
                onPortSelect={onPortSelect}
                onNavigate={onNavigate}
                onShowArbitrage={() => setShowArbitrage(true)}
                ports={ports}
            />
        </div>
    );
};