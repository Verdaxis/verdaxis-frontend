import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin } from 'lucide-react';
import { divIcon } from 'leaflet';
import { Port } from './types';

// Fix for Leaflet default marker
export const createCustomIcon = (supply: string) => {
    const color = supply === 'High' ? '#4CAF50' : supply === 'Medium' ? '#FFC107' : '#EF4444';
    
    const iconMarkup = renderToStaticMarkup(
        React.createElement('div', { className: "relative group" },
            React.createElement('div', { 
                className: "w-8 h-8 rounded-full bg-white border-2 shadow-lg flex items-center justify-center transform transition-transform group-hover:scale-110", 
                style: { borderColor: color } 
            },
                React.createElement(MapPin, { size: 16, color: color, fill: color })
            ),
            React.createElement('div', { className: "absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-black opacity-20 rounded-full blur-[1px]" })
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