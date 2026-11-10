import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Port } from '../../types';
import type { EcaDisplayStatus, EcaZoneFeatureCollection } from '../../data/secaZones';

/**
 * The basic Intelligence Map for browsers that cannot start WebGL.
 *
 * Leaflet draws Mapbox's image tiles of the same light and dark styles, so
 * the base map looks like the full map. Ports, ECA zones and vessels are SVG
 * with the full map's colours, sizes and layer order, and the same tooltips
 * and pop-ups (`mapMarkup.ts`). The camera takes Mapbox zoom levels and
 * padding, and the zoom controls reuse Mapbox's control markup, so both maps
 * open on the same view and look alike. Place names are those baked into the
 * tiles, so they do not follow the app language.
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

/** Screen space kept clear of the map's overlays, as Mapbox camera padding. */
export interface CameraPadding {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

/** The camera moves the map toolbar and panel ask for, in Mapbox zoom levels. */
export interface BasicMapCamera {
    fitBounds: (corners: LngLatCorners, options: { padding: CameraPadding; maxZoom?: number; durationMs: number }) => void;
    flyTo: (lng: number, lat: number, options: { padding: CameraPadding; minZoom: number; durationMs: number }) => void;
    closePopup: () => void;
}

/** The view the map opens on: the full map's constructor `bounds` and `fitBoundsOptions`. */
export interface BasicInitialView {
    bounds: LngLatCorners;
    padding: CameraPadding;
    maxZoom: number;
}

/** Accessible names of the map controls, from the full map's control locale. */
export interface BasicMapLabels {
    zoomIn: string;
    zoomOut: string;
    resetBearing: string;
    closePopup: string;
}

interface BasicMarketMapProps {
    isDark: boolean;
    ports: BasicPortMarker[];
    vessels: BasicVesselMarker[];
    ecaZones: EcaZoneFeatureCollection | null;
    showEcaZones: boolean;
    /** Read once, when the map is created and its container has a size. */
    getInitialView: () => BasicInitialView | undefined;
    /** Selects the port and returns its pop-up HTML. */
    onPortClick: (port: Port) => string;
    cameraRef: React.MutableRefObject<BasicMapCamera | null>;
    ariaLabel: string;
    labels: BasicMapLabels;
}

const MAPBOX_ATTRIBUTION = '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Mapbox zoom 0 shows the world as one 512-pixel tile; Leaflet zoom 0 shows
 * it as one 256-pixel tile. So Leaflet zoom = Mapbox zoom + 1, and the
 * 512-pixel tiles load with `zoomOffset: -1`.
 */
const LEAFLET_ZOOM_OFFSET = 1;
export const toLeafletZoom = (mapboxZoom: number) => mapboxZoom + LEAFLET_ZOOM_OFFSET;
export const toMapboxZoom = (leafletZoom: number) => leafletZoom - LEAFLET_ZOOM_OFFSET;

/** Mapbox GL's default zoom range. */
const MAPBOX_MIN_ZOOM = 0;
const MAPBOX_MAX_ZOOM = 22;

/** Mapbox's 512-pixel image tiles of one of its styles. */
const tileUrl = (isDark: boolean) =>
    `https://api.mapbox.com/styles/v1/mapbox/${isDark ? 'dark' : 'light'}-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN}`;

/**
 * Mapbox zooms one level per 450 wheel pixels (`wheelZoomRate`). Leaflet
 * divides the browser's wheel pixels by a platform factor first (see
 * `getWheelDelta` in Leaflet's DomEvent), so the same rate needs
 * 450 / factor Leaflet pixels per level.
 */
const MAPBOX_WHEEL_PX_PER_ZOOM_LEVEL = 450;
export const leafletWheelPxPerZoomLevel = (): number => {
    const ratio = window.devicePixelRatio || 1;
    // Leaflet 1.9 sets these flags; its type definitions omit them.
    const browser = L.Browser as typeof L.Browser & { linux?: boolean; mac?: boolean };
    const leafletPxFactor = browser.linux && browser.chrome ? ratio
        : browser.mac ? ratio * 3
            : ratio > 0 ? 2 * ratio : 1;
    return MAPBOX_WHEEL_PX_PER_ZOOM_LEVEL / leafletPxFactor;
};

/** Mapbox's `['interpolate', ['linear'], ['zoom'], ...stops]`, clamped at both ends. */
export const interpolateByZoom = (stops: Array<[number, number]>, zoom: number): number => {
    if (zoom <= stops[0][0]) return stops[0][1];
    for (let index = 1; index < stops.length; index += 1) {
        const [zoomB, valueB] = stops[index];
        if (zoom <= zoomB) {
            const [zoomA, valueA] = stops[index - 1];
            return valueA + ((zoom - zoomA) / (zoomB - zoomA)) * (valueB - valueA);
        }
    }
    return stops[stops.length - 1][1];
};

// The full map's zoom-dependent sizes (src/map/addEcaLayers.ts and BuyerMap's vessel layer).
const ECA_LINE_WIDTH_STOPS: Array<[number, number]> = [[1, 0.8], [5, 1.5], [9, 2.2]];
const ECA_LABEL_SIZE_STOPS: Array<[number, number]> = [[2, 9], [5, 11]];
const VESSEL_ICON_SCALE_STOPS: Array<[number, number]> = [[2, 0.3], [5, 0.45], [8, 0.65]];
/** The full map draws the vessel chevron on a 64-pixel image. */
const VESSEL_ICON_PX = 64;
/** Mapbox's 1-pixel icon halo: half of a 2-pixel stroke drawn under the fill. */
const VESSEL_HALO_STROKE_PX = 2;

/** The full map's ECA fill and outline colours by display status. */
const ECA_STYLE: Record<EcaDisplayStatus, { fill: string; fillOpacity: number; line: string }> = {
    active: { fill: '#38BDF8', fillOpacity: 0.13, line: '#0284C7' },
    transition: { fill: '#F59E0B', fillOpacity: 0.16, line: '#D97706' },
    adopted: { fill: '#8B5CF6', fillOpacity: 0.1, line: '#7C3AED' },
};

/**
 * Leaflet panes, bottom to top, in the full map's layer order: tiles, ECA
 * zones, ECA labels, ports (overlay pane), vessels (marker pane).
 */
const ECA_PANE = 'verdaxisEca';
const ECA_LABEL_PANE = 'verdaxisEcaLabels';
/**
 * Mapbox pop-ups sit outside the map canvas and stack above the toolbar and
 * ticker (`.verdaxis-port-popup`, z-index 31). Leaflet keeps pop-ups inside
 * its moving map pane, so this pane is placed on the container and follows
 * the map pane's position instead.
 */
const FLOATING_PANE = 'verdaxisFloating';

const toLatLngBounds = ([[west, south], [east, north]]: LngLatCorners) =>
    L.latLngBounds([south, west], [north, east]);

const fitOptions = (padding: CameraPadding) => ({
    paddingTopLeft: L.point(padding.left, padding.top),
    paddingBottomRight: L.point(padding.right, padding.bottom),
});

/**
 * Mapbox stroke circles outside their radius; SVG strokes are centred on the
 * outline. Half the stroke goes on the radius so the circles match.
 */
export const leafletPortRadius = (marker: BasicPortMarker) => marker.radius + portStrokeWeight(marker) / 2;
const portStrokeWeight = (marker: BasicPortMarker) => (marker.selected ? 4 : 2);

const portStyle = (marker: BasicPortMarker, isDark: boolean): L.CircleMarkerOptions => ({
    radius: leafletPortRadius(marker),
    color: marker.color,
    opacity: 1,
    weight: portStrokeWeight(marker),
    fillColor: isDark ? '#1E293B' : '#FFFFFF',
    fillOpacity: 0.85,
});

/** The full map's vessel chevron (BuyerMap's 'vessel-arrow' image), pointing north before rotation. */
const VESSEL_CHEVRON = 'M32 6.4 L54.4 51.2 L32 38.4 L9.6 51.2 Z';

const vesselIcon = (vessel: BasicVesselMarker) => L.divIcon({
    className: 'verdaxis-basic-vessel',
    iconSize: [VESSEL_ICON_PX, VESSEL_ICON_PX],
    iconAnchor: [VESSEL_ICON_PX / 2, VESSEL_ICON_PX / 2],
    html: `<svg viewBox="0 0 ${VESSEL_ICON_PX} ${VESSEL_ICON_PX}" style="transform:translate(-50%,-50%) rotate(${vessel.heading}deg)">`
        + `<path d="${VESSEL_CHEVRON}" fill="${vessel.color}"/></svg>`,
});

const ecaLabelIcon = (label: string, status: EcaDisplayStatus) => {
    const text = document.createElement('span');
    text.className = `verdaxis-basic-eca-label verdaxis-basic-eca-label--${status}`;
    text.textContent = label;
    return L.divIcon({ className: 'verdaxis-basic-eca-label-anchor', iconSize: [0, 0], html: text });
};

/** Shows each zoom-dependent size for the current zoom, as Mapbox's interpolate expressions do. */
const applyZoomSizes = (map: L.Map, ecaLayer: L.GeoJSON | null) => {
    const zoom = toMapboxZoom(map.getZoom());
    const container = map.getContainer();
    const vesselSize = VESSEL_ICON_PX * interpolateByZoom(VESSEL_ICON_SCALE_STOPS, zoom);
    container.style.setProperty('--verdaxis-vessel-size', `${vesselSize}px`);
    container.style.setProperty('--verdaxis-vessel-halo', String((VESSEL_HALO_STROKE_PX * VESSEL_ICON_PX) / vesselSize));
    container.style.setProperty('--verdaxis-eca-label-size', `${interpolateByZoom(ECA_LABEL_SIZE_STOPS, zoom)}px`);
    ecaLayer?.setStyle({ weight: interpolateByZoom(ECA_LINE_WIDTH_STOPS, zoom) });
};

/** Mapbox's NavigationControl markup, so Mapbox's own control styles apply. */
const NavigationControl = L.Control.extend({
    onAdd(this: L.Control & { buttons?: Record<string, HTMLButtonElement> }, map: L.Map) {
        const group = L.DomUtil.create('div', 'mapboxgl-ctrl mapboxgl-ctrl-group verdaxis-basic-navigation');
        const button = (className: string, onClick: () => void) => {
            const element = L.DomUtil.create('button', className, group);
            element.type = 'button';
            L.DomUtil.create('span', 'mapboxgl-ctrl-icon', element).setAttribute('aria-hidden', 'true');
            L.DomEvent.on(element, 'click', onClick);
            return element;
        };
        this.buttons = {
            zoomIn: button('mapboxgl-ctrl-zoom-in', () => map.zoomIn(1)),
            zoomOut: button('mapboxgl-ctrl-zoom-out', () => map.zoomOut(1)),
            // The basic map never rotates, so north is always up already.
            resetBearing: button('mapboxgl-ctrl-compass', () => undefined),
        };
        L.DomEvent.disableClickPropagation(group);
        L.DomEvent.disableScrollPropagation(group);
        return group;
    },
});
type NavigationControlInstance = L.Control & { buttons?: Record<'zoomIn' | 'zoomOut' | 'resetBearing', HTMLButtonElement> };

export function BasicMarketMap({
    isDark,
    ports,
    vessels,
    ecaZones,
    showEcaZones,
    getInitialView,
    onPortClick,
    cameraRef,
    ariaLabel,
    labels,
}: BasicMarketMapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const tilesRef = useRef<L.TileLayer | null>(null);
    const portLayerRef = useRef<L.LayerGroup | null>(null);
    const portMarkersRef = useRef(new Map<string, L.CircleMarker>());
    const portsByIdRef = useRef(new Map<string, Port>());
    const vesselLayerRef = useRef<L.LayerGroup | null>(null);
    const ecaLayerRef = useRef<L.GeoJSON | null>(null);
    const ecaLabelLayerRef = useRef<L.LayerGroup | null>(null);
    const navigationRef = useRef<NavigationControlInstance | null>(null);
    const onPortClickRef = useRef(onPortClick);
    onPortClickRef.current = onPortClick;
    const labelsRef = useRef(labels);
    labelsRef.current = labels;

    // Create the map once; later effects only change its layers.
    useEffect(() => {
        const container = containerRef.current;
        if (!container || mapRef.current) return;
        const map = L.map(container, {
            zoomControl: false,
            attributionControl: false,
            worldCopyJump: true,
            minZoom: toLeafletZoom(MAPBOX_MIN_ZOOM),
            maxZoom: toLeafletZoom(MAPBOX_MAX_ZOOM),
            // Mapbox zoom is continuous: fit, wheel and pinch stop at any level.
            zoomSnap: 0,
            zoomDelta: 1,
            wheelPxPerZoomLevel: leafletWheelPxPerZoomLevel(),
        });
        L.control.attribution({ prefix: false }).addTo(map);
        navigationRef.current = new NavigationControl({ position: 'topright' }) as NavigationControlInstance;
        navigationRef.current.addTo(map);

        map.createPane(ECA_PANE);
        map.createPane(ECA_LABEL_PANE);
        const floatingPane = map.createPane(FLOATING_PANE, container);
        const followMapPane = () => L.DomUtil.setPosition(floatingPane, L.DomUtil.getPosition(map.getPane('mapPane')!));
        map.on('move zoom viewreset zoomanim resize', followMapPane);

        const initialView = getInitialView();
        if (initialView) {
            map.fitBounds(toLatLngBounds(initialView.bounds), {
                ...fitOptions(initialView.padding),
                maxZoom: toLeafletZoom(initialView.maxZoom),
                animate: false,
            });
        } else {
            map.setView([0, 0], toLeafletZoom(MAPBOX_MIN_ZOOM));
        }
        followMapPane();

        const updateZoomState = () => {
            applyZoomSizes(map, ecaLayerRef.current);
            const buttons = navigationRef.current?.buttons;
            if (!buttons) return;
            buttons.zoomIn.disabled = map.getZoom() >= map.getMaxZoom();
            buttons.zoomOut.disabled = map.getZoom() <= map.getMinZoom();
        };
        map.on('zoom', updateZoomState);
        updateZoomState();

        map.on('popupopen', (event) => {
            const element = event.popup.getElement();
            const close = element?.querySelector('.leaflet-popup-close-button');
            close?.setAttribute('aria-label', labelsRef.current.closePopup);
            close?.setAttribute('title', labelsRef.current.closePopup);
            // Mapbox focuses the pop-up's first control (the Trade-at button),
            // which also scrolls a long pop-up to show it.
            element?.querySelector<HTMLElement>('.leaflet-popup-content button, .leaflet-popup-content a[href]')?.focus();
        });

        // Mapbox follows its container's size; Leaflet follows only the window.
        const resizeObserver = new ResizeObserver(() => map.invalidateSize());
        resizeObserver.observe(container);

        ecaLabelLayerRef.current = L.layerGroup().addTo(map);
        portLayerRef.current = L.layerGroup().addTo(map);
        vesselLayerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        cameraRef.current = {
            fitBounds: (corners, { padding, maxZoom, durationMs }) => map.flyToBounds(toLatLngBounds(corners), {
                ...fitOptions(padding),
                maxZoom: maxZoom === undefined ? undefined : toLeafletZoom(maxZoom),
                duration: durationMs / 1000,
            }),
            flyTo: (lng, lat, { padding, minZoom, durationMs }) => {
                const zoom = Math.max(map.getZoom(), toLeafletZoom(minZoom));
                // Mapbox puts the target at the centre of the padded area, so the
                // map centre sits half the padding difference away from it.
                const shift = L.point((padding.right - padding.left) / 2, (padding.bottom - padding.top) / 2);
                const center = map.unproject(map.project([lat, lng], zoom).add(shift), zoom);
                map.flyTo(center, zoom, { duration: durationMs / 1000 });
            },
            closePopup: () => map.closePopup(),
        };
        return () => {
            resizeObserver.disconnect();
            cameraRef.current = null;
            map.remove();
            mapRef.current = null;
            tilesRef.current = null;
            portMarkersRef.current.clear();
            ecaLayerRef.current = null;
            navigationRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const buttons = navigationRef.current?.buttons;
        if (!buttons) return;
        (Object.keys(buttons) as Array<keyof typeof buttons>).forEach((name) => {
            buttons[name].setAttribute('aria-label', labels[name]);
            buttons[name].setAttribute('title', labels[name]);
        });
    }, [labels]);

    // Swap tiles after the new style has loaded, as Mapbox's setStyle does, without a blank frame.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const previous = tilesRef.current;
        const tiles = L.tileLayer(tileUrl(isDark), {
            tileSize: 512,
            zoomOffset: -1,
            minZoom: toLeafletZoom(MAPBOX_MIN_ZOOM),
            maxZoom: toLeafletZoom(MAPBOX_MAX_ZOOM),
            attribution: MAPBOX_ATTRIBUTION,
        });
        if (previous) tiles.once('load', () => previous.remove());
        tiles.addTo(map);
        tilesRef.current = tiles;
        return () => {
            // A newer style replaced this one before it loaded.
            if (tilesRef.current !== tiles) tiles.off('load');
        };
    }, [isDark]);

    useEffect(() => {
        const map = mapRef.current;
        ecaLayerRef.current?.remove();
        ecaLayerRef.current = null;
        ecaLabelLayerRef.current?.clearLayers();
        if (!map || !ecaZones || !showEcaZones) return;
        const renderer = L.svg({ pane: ECA_PANE });
        ecaLayerRef.current = L.geoJSON(ecaZones as unknown as GeoJSON.GeoJsonObject, {
            interactive: false,
            pane: ECA_PANE,
            style: (feature) => {
                const status = (feature?.properties?.displayStatus ?? 'active') as EcaDisplayStatus;
                const style = ECA_STYLE[status] ?? ECA_STYLE.active;
                return { renderer, color: style.line, opacity: 0.82, fillColor: style.fill, fillOpacity: style.fillOpacity };
            },
        }).addTo(map);
        for (const zone of ecaZones.features) {
            const [lng, lat] = zone.properties.labelPoint;
            L.marker([lat, lng], {
                icon: ecaLabelIcon(zone.properties.shortLabel, zone.properties.displayStatus),
                interactive: false,
                keyboard: false,
                pane: ECA_LABEL_PANE,
            }).addTo(ecaLabelLayerRef.current!);
        }
        applyZoomSizes(map, ecaLayerRef.current);
    }, [ecaZones, showEcaZones]);

    // Update markers in place, so an open tooltip survives selection changes as on the full map.
    useEffect(() => {
        const layer = portLayerRef.current;
        if (!layer) return;
        const markers = portMarkersRef.current;
        const portsById = portsByIdRef.current;
        portsById.clear();
        ports.forEach(marker => portsById.set(marker.port.id, marker.port));
        for (const [id, circle] of markers) {
            if (!portsById.has(id)) {
                layer.removeLayer(circle);
                markers.delete(id);
            }
        }
        for (const marker of ports) {
            const latLng = L.latLng(marker.port.location.lat, marker.port.location.lng);
            const existing = markers.get(marker.port.id);
            if (existing) {
                existing.setLatLng(latLng).setStyle(portStyle(marker, isDark)).setRadius(leafletPortRadius(marker));
                existing.setTooltipContent(marker.tooltipHtml);
                continue;
            }
            const id = marker.port.id;
            const circle = L.circleMarker(latLng, portStyle(marker, isDark))
                .bindTooltip(marker.tooltipHtml, {
                    direction: 'top',
                    offset: [0, -10],
                    className: 'verdaxis-port-popup',
                    opacity: 1,
                    pane: FLOATING_PANE,
                })
                .on('click', () => {
                    const map = mapRef.current;
                    const port = portsById.get(id);
                    if (!map || !port) return;
                    const html = onPortClickRef.current(port);
                    // Anchored on the port itself, as the full map's pop-up is.
                    L.popup({ maxWidth: 280, offset: [0, 0], className: 'verdaxis-port-popup', pane: FLOATING_PANE })
                        .setLatLng([port.location.lat, port.location.lng])
                        .setContent(html)
                        .openOn(map);
                })
                .addTo(layer);
            markers.set(id, circle);
        }
    }, [ports, isDark]);

    useEffect(() => {
        const layer = vesselLayerRef.current;
        if (!layer) return;
        layer.clearLayers();
        let coveredPort: L.CircleMarker | undefined;
        for (const vessel of vessels) {
            L.marker([vessel.lat, vessel.lng], { icon: vesselIcon(vessel), keyboard: false })
                .bindTooltip(vessel.tooltipHtml, {
                    direction: 'top',
                    offset: [0, -8],
                    className: 'verdaxis-vessel-tooltip',
                    opacity: 1,
                    pane: FLOATING_PANE,
                })
                .on('click', (event) => portUnder(event.containerPoint)?.fire('click'))
                .on('mouseover', (event) => {
                    coveredPort = portUnder(event.containerPoint);
                    coveredPort?.openTooltip();
                })
                .on('mouseout', () => {
                    coveredPort?.closeTooltip();
                    coveredPort = undefined;
                })
                .addTo(layer);
        }

        // Mapbox delivers pointer events to the port layer even when a vessel
        // icon covers the port; pass them through the same way.
        function portUnder(point: L.Point): L.CircleMarker | undefined {
            const map = mapRef.current;
            if (!map) return undefined;
            for (const circle of portMarkersRef.current.values()) {
                if (map.latLngToContainerPoint(circle.getLatLng()).distanceTo(point) <= circle.getRadius()) return circle;
            }
            return undefined;
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
