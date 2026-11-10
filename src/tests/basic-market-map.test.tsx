import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import L from 'leaflet';

import {
    BasicMarketMap,
    interpolateByZoom,
    leafletPortRadius,
    toLeafletZoom,
    toMapboxZoom,
    type BasicMapCamera,
    type BasicPortMarker,
    type BasicVesselMarker,
} from '../components/map/BasicMarketMap';
import type { EcaZoneFeatureCollection } from '../data/secaZones';
import type { Port } from '../types';

let createdMaps: L.Map[] = [];
beforeAll(() => {
    L.Map.addInitHook(function (this: L.Map) { createdMaps.push(this); });
});
afterEach(() => {
    cleanup();
    createdMaps = [];
    vi.restoreAllMocks();
});

const singapore = { id: 'sg-sin', name: 'Singapore', location: { lat: 1.29, lng: 103.85 } } as Port;
const rotterdam = { id: 'nl-rtm', name: 'Rotterdam', location: { lat: 51.92, lng: 4.48 } } as Port;

const portMarker = (port: Port, overrides: Partial<BasicPortMarker> = {}): BasicPortMarker => ({
    port,
    radius: 6,
    color: '#10B981',
    selected: false,
    tooltipHtml: `<b>${port.name}</b>`,
    ...overrides,
});

const vessel: BasicVesselMarker = {
    id: 'aurora', lat: 3.5, lng: 100.5, heading: 135, color: '#10B981', tooltipHtml: 'MV Aurora',
};

const ecaZones = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: { shortLabel: 'North Sea ECA', displayStatus: 'active', labelPoint: [3, 56] },
        geometry: { type: 'Polygon', coordinates: [[[0, 50], [8, 50], [8, 60], [0, 60], [0, 50]]] },
    }, {
        type: 'Feature',
        properties: { shortLabel: 'Norwegian Sea ECA', displayStatus: 'transition', labelPoint: [5, 66] },
        geometry: { type: 'Polygon', coordinates: [[[0, 62], [10, 62], [10, 70], [0, 70], [0, 62]]] },
    }],
} as unknown as EcaZoneFeatureCollection;

const padding = { top: 180, bottom: 320, left: 24, right: 344 };
const labels = { zoomIn: '放大', zoomOut: '缩小', resetBearing: '恢复正北方向', closePopup: '关闭' };

function renderMap(props: Partial<React.ComponentProps<typeof BasicMarketMap>> = {}) {
    const cameraRef: React.MutableRefObject<BasicMapCamera | null> = { current: null };
    const onPortClick = vi.fn((port: Port) => `<div class="popup-body"><button>Trade at ${port.name}</button></div>`);
    const view = render(
        <BasicMarketMap
            isDark={false}
            ports={[portMarker(singapore), portMarker(rotterdam, { selected: true, color: '#F59E0B', radius: 12 })]}
            vessels={[vessel]}
            ecaZones={ecaZones}
            showEcaZones
            getInitialView={() => ({ bounds: [[4.48, 1.29], [103.85, 51.92]], padding, maxZoom: 3.6 })}
            onPortClick={onPortClick}
            cameraRef={cameraRef}
            ariaLabel="Intelligence map"
            labels={labels}
            {...props}
        />,
    );
    const map = createdMaps[createdMaps.length - 1];
    return { ...view, cameraRef, onPortClick, map };
}

const layersOf = <T extends L.Layer>(map: L.Map, type: new (...args: never[]) => T): T[] => {
    const found: T[] = [];
    map.eachLayer(layer => { if (layer instanceof type) found.push(layer as T); });
    return found;
};

describe('basic map zoom and size rules', () => {
    it('converts Mapbox 512-pixel zoom levels to Leaflet 256-pixel levels', () => {
        expect(toLeafletZoom(3.6)).toBeCloseTo(4.6);
        expect(toMapboxZoom(toLeafletZoom(1.608))).toBeCloseTo(1.608);
    });

    it('interpolates like a Mapbox zoom expression and clamps at both ends', () => {
        const stops: Array<[number, number]> = [[2, 0.3], [5, 0.45], [8, 0.65]];
        expect(interpolateByZoom(stops, 0)).toBe(0.3);
        expect(interpolateByZoom(stops, 3.5)).toBeCloseTo(0.375);
        expect(interpolateByZoom(stops, 6.5)).toBeCloseTo(0.55);
        expect(interpolateByZoom(stops, 12)).toBe(0.65);
    });

    it('adds half the stroke to the radius, as Mapbox strokes outside the circle', () => {
        expect(leafletPortRadius(portMarker(singapore))).toBe(7);
        expect(leafletPortRadius(portMarker(singapore, { selected: true, radius: 12 }))).toBe(14);
    });
});

describe('BasicMarketMap', () => {
    it('opens on the full map view: same bounds, padding and maximum zoom, with continuous zoom', () => {
        const fitBounds = vi.spyOn(L.Map.prototype, 'fitBounds');
        const { map } = renderMap();

        expect(map.options.zoomSnap).toBe(0);
        expect(map.options.zoomDelta).toBe(1);
        expect(map.getMinZoom()).toBe(toLeafletZoom(0));
        expect(map.getMaxZoom()).toBe(toLeafletZoom(22));
        expect(map.options.wheelPxPerZoomLevel).toBeGreaterThan(0);

        const [bounds, options] = fitBounds.mock.calls[0];
        expect((bounds as L.LatLngBounds).equals(L.latLngBounds([1.29, 4.48], [51.92, 103.85]))).toBe(true);
        expect(options).toMatchObject({
            paddingTopLeft: L.point(24, 180),
            paddingBottomRight: L.point(344, 320),
            maxZoom: toLeafletZoom(3.6),
            animate: false,
        });
    });

    it('loads 512-pixel @2x Mapbox tiles of the light or dark style', () => {
        const { map, rerender } = renderMap();
        const [light] = layersOf(map, L.TileLayer);
        expect(light.options).toMatchObject({ tileSize: 512, zoomOffset: -1 });
        expect((light as unknown as { _url: string })._url).toContain('/mapbox/light-v11/tiles/512/{z}/{x}/{y}@2x');

        rerender(
            <BasicMarketMap
                isDark
                ports={[]}
                vessels={[]}
                ecaZones={null}
                showEcaZones={false}
                getInitialView={() => undefined}
                onPortClick={() => ''}
                cameraRef={{ current: null }}
                ariaLabel="Intelligence map"
                labels={labels}
            />,
        );
        const urls = layersOf(map, L.TileLayer).map(layer => (layer as unknown as { _url: string })._url);
        expect(urls.some(url => url.includes('/mapbox/dark-v11/'))).toBe(true);
    });

    it('draws ports like the full map, below vessels and above the ECA zones', () => {
        const { map, container } = renderMap();
        const circles = layersOf(map, L.CircleMarker).filter(layer => !(layer instanceof L.Polygon));
        const rotterdamCircle = circles.find(circle => circle.getLatLng().lat === rotterdam.location.lat)!;
        expect(rotterdamCircle.options).toMatchObject({ color: '#F59E0B', weight: 4, fillColor: '#FFFFFF', fillOpacity: 0.85, opacity: 1 });
        expect(rotterdamCircle.getRadius()).toBe(14);

        const ecaPane = map.getPane('verdaxisEca')!;
        const labelPane = map.getPane('verdaxisEcaLabels')!;
        expect(ecaPane.querySelectorAll('path')).toHaveLength(2);
        expect(ecaPane.querySelector('path')!.getAttribute('stroke')).toBe('#0284C7');
        expect(labelPane.textContent).toContain('North Sea ECA');
        expect(labelPane.querySelector('.verdaxis-basic-eca-label--transition')!.textContent).toBe('Norwegian Sea ECA');

        // Vessels sit in the marker pane, above the overlay pane's ports.
        const vesselSvg = map.getPane('markerPane')!.querySelector('.verdaxis-basic-vessel svg') as SVGElement;
        expect(vesselSvg.getAttribute('style')).toContain('rotate(135deg)');
        expect(container.querySelector<HTMLElement>('.verdaxis-basic-map')!.style.getPropertyValue('--verdaxis-vessel-size')).toMatch(/px$/);
    });

    it('sizes vessels and ECA lines and labels by zoom, as the full map does', () => {
        const { map } = renderMap();
        act(() => { map.setZoom(toLeafletZoom(5), { animate: false }); });
        const style = map.getContainer().style;
        expect(style.getPropertyValue('--verdaxis-vessel-size')).toBe(`${64 * 0.45}px`);
        expect(style.getPropertyValue('--verdaxis-eca-label-size')).toBe('11px');
        const [eca] = layersOf(map, L.Polygon);
        expect(eca.options.weight).toBeCloseTo(1.5);
    });

    it('shows Mapbox-style zoom and north controls with the translated names', () => {
        const zoomIn = vi.spyOn(L.Map.prototype, 'zoomIn');
        const { container } = renderMap();
        const buttons = [...container.querySelectorAll<HTMLButtonElement>('.mapboxgl-ctrl-group button')];
        expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['放大', '缩小', '恢复正北方向']);
        expect(buttons.map(button => button.className)).toEqual(['mapboxgl-ctrl-zoom-in', 'mapboxgl-ctrl-zoom-out', 'mapboxgl-ctrl-compass']);
        act(() => { buttons[0].click(); });
        expect(zoomIn).toHaveBeenCalledWith(1);
        expect(container.querySelector('.leaflet-control-zoom')).toBeNull();
    });

    it('opens the port pop-up on the port, above the map toolbar, with a translated close button', () => {
        const { map, onPortClick } = renderMap();
        const circle = layersOf(map, L.CircleMarker).find(layer => layer.getLatLng().lat === singapore.location.lat)!;
        act(() => { circle.fire('click'); });

        expect(onPortClick).toHaveBeenCalledWith(singapore);
        const popup = map.getPane('verdaxisFloating')!.querySelector('.leaflet-popup.verdaxis-port-popup')!;
        expect(popup.textContent).toContain('Trade at Singapore');
        expect(popup.querySelector('.leaflet-popup-close-button')!.getAttribute('aria-label')).toBe('关闭');
        expect(document.activeElement?.textContent).toBe('Trade at Singapore');
        // The floating pane sits on the container, outside the moving map pane.
        expect(map.getPane('verdaxisFloating')!.parentElement).toBe(map.getContainer());
    });

    it('passes a click on a vessel to the port it covers', () => {
        const { map, onPortClick } = renderMap({ vessels: [{ ...vessel, lat: singapore.location.lat, lng: singapore.location.lng }] });
        const [marker] = layersOf(map, L.Marker).filter(layer => layer.options.icon instanceof L.DivIcon && layer.getElement()?.classList.contains('verdaxis-basic-vessel'));
        const point = map.latLngToContainerPoint([singapore.location.lat, singapore.location.lng]);
        act(() => { marker.fire('click', { containerPoint: point }); });
        expect(onPortClick).toHaveBeenCalledWith(singapore);
    });

    it('moves the camera in Mapbox zoom levels and keeps the target in the padded area', () => {
        const flyToBounds = vi.spyOn(L.Map.prototype, 'flyToBounds').mockImplementation(function (this: L.Map) { return this; });
        const flyTo = vi.spyOn(L.Map.prototype, 'flyTo').mockImplementation(function (this: L.Map) { return this; });
        const { map, cameraRef } = renderMap();

        cameraRef.current!.fitBounds([[-11, 29], [37, 67]], { padding, maxZoom: 3.6, durationMs: 700 });
        expect(flyToBounds.mock.calls[0][1]).toMatchObject({ maxZoom: toLeafletZoom(3.6), duration: 0.7, paddingTopLeft: L.point(24, 180) });

        cameraRef.current!.flyTo(singapore.location.lng, singapore.location.lat, { padding, minZoom: 3.6, durationMs: 700 });
        const [center, zoom, options] = flyTo.mock.calls[0];
        expect(zoom).toBeCloseTo(Math.max(map.getZoom(), toLeafletZoom(3.6)));
        expect(options).toMatchObject({ duration: 0.7 });
        const shift = map.project(center as L.LatLngExpression, zoom).subtract(map.project([singapore.location.lat, singapore.location.lng], zoom));
        expect(shift.x).toBeCloseTo((padding.right - padding.left) / 2);
        expect(shift.y).toBeCloseTo((padding.bottom - padding.top) / 2);
    });

    it('releases the camera and the map on unmount', () => {
        const { unmount, cameraRef, container } = renderMap();
        expect(cameraRef.current).not.toBeNull();
        unmount();
        expect(cameraRef.current).toBeNull();
        expect(container.querySelector('.leaflet-container')).toBeNull();
    });
});
