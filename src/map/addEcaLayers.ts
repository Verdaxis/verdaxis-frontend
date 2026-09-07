import type { Map as MapLibreMap } from 'maplibre-gl';

import {
    ECA_ZONE_COLLECTION,
    SECA_ZONE_LABEL_SOURCE_ID,
    SECA_ZONE_LAYER_IDS,
    SECA_ZONE_SOURCE_ID,
} from '../data/secaZones';

const labelCollection = () => ({
    type: 'FeatureCollection' as const,
    features: ECA_ZONE_COLLECTION.features.map((feature) => ({
        type: 'Feature' as const,
        properties: feature.properties,
        geometry: {
            type: 'Point' as const,
            coordinates: feature.properties.labelPoint,
        },
    })),
});

interface AddEcaLayersOptions {
    isDark: boolean;
    visible: boolean;
    beforeLayerId?: string;
}

export const addEcaLayers = (
    map: MapLibreMap,
    { isDark, visible, beforeLayerId = 'carto-labels' }: AddEcaLayersOptions,
): void => {
    const before = map.getLayer(beforeLayerId) ? beforeLayerId : undefined;
    const visibility = visible ? 'visible' : 'none';

    if (!map.getSource(SECA_ZONE_SOURCE_ID)) {
        map.addSource(SECA_ZONE_SOURCE_ID, {
            type: 'geojson',
            data: ECA_ZONE_COLLECTION as never,
        });
    }

    if (!map.getSource(SECA_ZONE_LABEL_SOURCE_ID)) {
        map.addSource(SECA_ZONE_LABEL_SOURCE_ID, {
            type: 'geojson',
            data: labelCollection() as never,
        });
    }

    if (!map.getLayer(SECA_ZONE_LAYER_IDS[0])) {
        map.addLayer({
            id: SECA_ZONE_LAYER_IDS[0],
            type: 'fill',
            source: SECA_ZONE_SOURCE_ID,
            layout: { visibility },
            paint: {
                'fill-color': [
                    'match', ['get', 'displayStatus'],
                    'transition', '#F59E0B',
                    'adopted', '#8B5CF6',
                    '#38BDF8',
                ],
                'fill-opacity': [
                    'match', ['get', 'displayStatus'],
                    'transition', 0.16,
                    'adopted', 0.1,
                    0.13,
                ],
            },
        }, before);
    }

    if (!map.getLayer(SECA_ZONE_LAYER_IDS[1])) {
        map.addLayer({
            id: SECA_ZONE_LAYER_IDS[1],
            type: 'line',
            source: SECA_ZONE_SOURCE_ID,
            layout: { visibility },
            paint: {
                'line-color': [
                    'match', ['get', 'displayStatus'],
                    'transition', '#D97706',
                    'adopted', '#7C3AED',
                    '#0284C7',
                ],
                'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.8, 5, 1.5, 9, 2.2],
                'line-opacity': 0.82,
            },
        }, before);
    }

    if (!map.getLayer(SECA_ZONE_LAYER_IDS[2])) {
        map.addLayer({
            id: SECA_ZONE_LAYER_IDS[2],
            type: 'symbol',
            source: SECA_ZONE_LABEL_SOURCE_ID,
            layout: {
                visibility,
                'text-field': ['get', 'shortLabel'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 5, 11],
                'text-letter-spacing': 0.03,
                'text-transform': 'uppercase',
                'text-allow-overlap': false,
            },
            paint: {
                'text-color': [
                    'match', ['get', 'displayStatus'],
                    'transition', '#F59E0B',
                    'adopted', '#A78BFA',
                    '#38BDF8',
                ],
                'text-halo-color': isDark ? '#0F172A' : '#F8FAFC',
                'text-halo-width': 1.2,
                'text-opacity': 0.9,
            },
        }, before);
    }
};

export const setEcaLayersVisible = (map: MapLibreMap, visible: boolean): void => {
    const visibility = visible ? 'visible' : 'none';
    SECA_ZONE_LAYER_IDS.forEach((layerId) => {
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', visibility);
        }
    });
};
