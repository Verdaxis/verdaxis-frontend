import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin } from 'lucide-react';
import { divIcon } from 'leaflet';
import { Port } from './types';

// Fix for Leaflet default marker
export const createCustomIcon = (supply: string) => {
    const color = supply === 'High' ? '#10b981' : supply === 'Medium' ? '#f59e0b' : '#ef4444';
    const pulseClass = supply === 'High' ? 'pulse-green' : supply === 'Medium' ? 'pulse-amber' : 'pulse-red';
    
    const iconMarkup = renderToStaticMarkup(
        React.createElement('div', { className: "relative group" },
            // Outer pulse ring
            React.createElement('div', { 
                className: `absolute inset-0 w-10 h-10 -left-1 -top-1 rounded-full opacity-40 ${pulseClass}`,
                style: { backgroundColor: color }
            }),
            // Main marker
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
        className: 'bg-transparent marker-animated',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
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