import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin } from 'lucide-react';
import { divIcon } from 'leaflet';
import { Port } from './types';

// Fix for Leaflet default marker
export const createCustomIcon = (supply: string) => {
    const color = supply === 'High' ? '#10b981' : supply === 'Medium' ? '#f59e0b' : '#ef4444';

    const iconMarkup = renderToStaticMarkup(
        React.createElement('div', { className: "relative group" },
            // Main marker (no pulse)
            React.createElement('div', {
                className: "relative w-8 h-8 rounded-full bg-slate-900 border-2 shadow-lg flex items-center justify-center transform transition-transform group-hover:scale-110 z-10",
                style: { borderColor: color }
            },
                React.createElement(MapPin, { size: 16, color: color, fill: color })
            )
        )
    );

    return divIcon({
        html: iconMarkup,
        className: 'bg-transparent',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};

export const calculateHeading = (prev?: { lat: number, lng: number }, curr?: { lat: number, lng: number }): number => {
    if (!prev || !curr) return 0;
    
    const lat1 = prev.lat * Math.PI / 180;
    const lat2 = curr.lat * Math.PI / 180;
    const dLon = (curr.lng - prev.lng) * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    const brng = Math.atan2(y, x);
    return (brng * 180 / Math.PI + 360) % 360;
};

export const getArbitrageRoute = (ports: Port[]): [number, number][] => {
    const sgPort = ports.find(p => p.id === 'sg-sin');
    const rtmPort = ports.find(p => p.id === 'nl-rtm');
    
    if (sgPort && rtmPort) {
        return [
            [sgPort.location.lat, sgPort.location.lng],
            [rtmPort.location.lat, rtmPort.location.lng]
        ];
    }
    return [];
};

export const formatTierLabel = (tier: string): string => {
    return tier
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};