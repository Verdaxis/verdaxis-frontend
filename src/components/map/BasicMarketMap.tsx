import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Port } from '../../types';
import type { EcaDisplayStatus, EcaZoneFeatureCollection } from '../../data/secaZones';

/**
 * The basic Intelligence Map for browsers that cannot start WebGL.
 *
 * Leaflet draws Mapbox's image tiles of the same light and dark styles, so
 * the base map looks like the full map; ports, ECA zones and vessels are SVG.
 * It shows the same tooltips and pop-ups (`mapMarkup.ts`). Zoom moves in
 * steps and place names are those baked into the tiles.
 */

export interface BasicPortMarker {
    port: Port;
    radius: number;
    color: string;
    selected: boolean;
    tooltipHtml: string;
}

export interface BasicVesselMarker {
    id: string;
    lat: number;
    lng: number;
    heading: number;
    color: string;
    tooltipHtml: string;
}

/** Longitude-latitude corners, as the full map's camera takes them. */
export type LngLatCorners = [[number, number], [number, number]];

/** The camera moves the map toolbar and panel ask for. */
export interface BasicMapCamera {
    fitBounds: (corners: LngLatCorners, maxZoom?: number) => void;
    flyTo: (lng: number, lat: number, minZoom: number) => void;
    closePopup: () => void;
}

interface BasicMarketMapProps {
    isDark: boolean;
    ports: BasicPortMarker[];
    vessels: BasicVesselMarker[];
    ecaZones: EcaZoneFeatureCollection | null;
    showEcaZones: boolean;
    initialBounds: LngLatCorners | undefined;
    /** Selects the port and returns its pop-up HTML. */
    onPortClick: (port: Port) => string;
    cameraRef: React.MutableRefObject<BasicMapCamera | null>;
    ariaLabel: string;
}

const MAPBOX_ATTRIBUTION = '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Mapbox's 512-pixel image tiles of one of its styles. */
const tileUrl = (isDark: boolean) =>
    `https://api.mapbox.com/styles/v1/mapbox/${isDark ? 'dark' : 'light'}-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN}`;

/** The full map's ECA fill and outline colours by display status. */
const ECA_STYLE: Record<EcaDisplayStatus, { fill: string; fillOpacity: number; line: string }> = {
    active: { fill: '#38BDF8', fillOpacity: 0.13, line: '#0284C7' },
    transition: { fill: '#F59E0B', fillOpacity: 0.16, line: '#D97706' },
    adopted: { fill: '#8B5CF6', fillOpacity: 0.1, line: '#7C3AED' },
};

const toLatLngBounds = ([[west, south], [east, north]]: LngLatCorners) =>
    L.latLngBounds([south, west], [north, east]);

const vesselIcon = (vessel: BasicVesselMarker) => L.divIcon({
    className: 'verdaxis-basic-vessel',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: `<svg width="14" height="14" viewBox="0 0 14 14" style="transform:rotate(${vessel.heading}deg)">`
        + `<path d="M7 1 L12 13 L7 10 L2 13 Z" fill="${vessel.color}" stroke="#0F172A" stroke-width="0.8"/></svg>`,
});

export function BasicMarketMap({
    isDark,
    ports,
    vessels,
    ecaZones,
    showEcaZones,
    initialBounds,
    onPortClick,
    cameraRef,
    ariaLabel,
}: BasicMarketMapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const tilesRef = useRef<L.TileLayer | null>(null);
    const portLayerRef = useRef<L.LayerGroup | null>(null);
    const vesselLayerRef = useRef<L.LayerGroup | null>(null);
    const ecaLayerRef = useRef<L.GeoJSON | null>(null);
    const onPortClickRef = useRef(onPortClick);
    onPortClickRef.current = onPortClick;

    // Create the map once; later effects only change its layers.
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
            zoomControl: false,
            worldCopyJump: true,
            minZoom: 1,
            attributionControl: true,
        });
        L.control.zoom({ position: 'topright' }).addTo(map);
        if (initialBounds) map.fitBounds(toLatLngBounds(initialBounds), { maxZoom: 4 });
        else map.setView([20, 0], 2);
        portLayerRef.current = L.layerGroup().addTo(map);
        vesselLayerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        cameraRef.current = {
            fitBounds: (corners, maxZoom = 4) => map.flyToBounds(toLatLngBounds(corners), { maxZoom, duration: 0.7 }),
            flyTo: (lng, lat, minZoom) => map.flyTo([lat, lng], Math.max(map.getZoom(), minZoom), { duration: 0.7 }),
            closePopup: () => map.closePopup(),
        };
        return () => {
            cameraRef.current = null;
            map.remove();
            mapRef.current = null;
            tilesRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        tilesRef.current?.remove();
        tilesRef.current = L.tileLayer(tileUrl(isDark), {
            tileSize: 512,
            zoomOffset: -1,
            maxZoom: 18,
            attribution: MAPBOX_ATTRIBUTION,
        }).addTo(map);
    }, [isDark]);

    useEffect(() => {
        const map = mapRef.current;
        ecaLayerRef.current?.remove();
        ecaLayerRef.current = null;
        if (!map || !ecaZones || !showEcaZones) return;
        ecaLayerRef.current = L.geoJSON(ecaZones as unknown as GeoJSON.GeoJsonObject, {
            interactive: false,
            style: (feature) => {
                const status = (feature?.properties?.displayStatus ?? 'active') as EcaDisplayStatus;
                const style = ECA_STYLE[status] ?? ECA_STYLE.active;
                return { color: style.line, weight: 1.2, opacity: 0.82, fillColor: style.fill, fillOpacity: style.fillOpacity };
            },
        }).addTo(map);
        ecaLayerRef.current.bringToBack();
    }, [ecaZones, showEcaZones]);

    useEffect(() => {
        const layer = portLayerRef.current;
        if (!layer) return;
        layer.clearLayers();
        for (const marker of ports) {
            L.circleMarker([marker.port.location.lat, marker.port.location.lng], {
                radius: marker.radius,
                color: marker.color,
                weight: marker.selected ? 4 : 2,
                fillColor: isDark ? '#1E293B' : '#FFFFFF',
                fillOpacity: 0.85,
            })
                .bindTooltip(marker.tooltipHtml, { direction: 'top', offset: [0, -6], className: 'verdaxis-port-popup', opacity: 1 })
                .on('click', (event) => {
                    const map = mapRef.current;
                    if (!map) return;
                    const html = onPortClickRef.current(marker.port);
                    L.popup({ maxWidth: 280, className: 'verdaxis-port-popup' })
                        .setLatLng(event.latlng)
                        .setContent(html)
                        .openOn(map);
                })
                .addTo(layer);
        }
    }, [ports, isDark]);

    useEffect(() => {
        const layer = vesselLayerRef.current;
        if (!layer) return;
        layer.clearLayers();
        for (const vessel of vessels) {
            L.marker([vessel.lat, vessel.lng], { icon: vesselIcon(vessel), keyboard: false })
                .bindTooltip(vessel.tooltipHtml, { direction: 'top', offset: [0, -6], className: 'verdaxis-vessel-tooltip' })
                .addTo(layer);
        }
    }, [vessels]);

    return (
        <div
            ref={containerRef}
            className="verdaxis-buyer-map verdaxis-basic-map"
            role="region"
            aria-label={ariaLabel}
            style={{ width: '100%', height: '100%' }}
        />
    );
}
