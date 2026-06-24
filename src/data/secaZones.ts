export type SecaZoneStatus = 'active' | 'phase-in';

export interface SecaZoneFeature {
    type: 'Feature';
    properties: {
        id: string;
        name: string;
        shortLabel: string;
        status: SecaZoneStatus;
        note: string;
    };
    geometry: {
        type: 'Polygon';
        coordinates: number[][][];
    };
}

// Approximate visual reference polygons for IMO MARPOL Annex VI emission control areas.
// These are intentionally not legal boundary coordinates.
export const SECA_ZONE_COLLECTION = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: {
                id: 'baltic-sea-eca',
                name: 'Baltic Sea SOx ECA',
                shortLabel: 'Baltic ECA',
                status: 'active',
                note: '0.10% sulphur control area',
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [10.5, 53.8],
                    [14.7, 54.2],
                    [19.8, 55.1],
                    [24.8, 57.2],
                    [29.4, 59.6],
                    [31.1, 64.7],
                    [24.7, 65.8],
                    [20.4, 63.0],
                    [18.0, 59.2],
                    [13.3, 57.2],
                    [10.5, 53.8],
                ]],
            },
        },
        {
            type: 'Feature',
            properties: {
                id: 'north-sea-eca',
                name: 'North Sea and English Channel SOx ECA',
                shortLabel: 'North Sea ECA',
                status: 'active',
                note: '0.10% sulphur control area',
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-5.7, 48.4],
                    [1.2, 49.4],
                    [4.8, 52.3],
                    [8.9, 53.8],
                    [8.8, 58.5],
                    [4.6, 61.7],
                    [-1.6, 62.1],
                    [-4.4, 59.4],
                    [-4.8, 54.0],
                    [-5.7, 48.4],
                ]],
            },
        },
        {
            type: 'Feature',
            properties: {
                id: 'mediterranean-sea-eca',
                name: 'Mediterranean Sea SOx ECA',
                shortLabel: 'Med ECA',
                status: 'active',
                note: 'Entered effect 1 May 2025',
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-6.1, 35.4],
                    [-1.2, 36.0],
                    [4.3, 39.2],
                    [10.8, 39.0],
                    [15.8, 37.0],
                    [22.5, 35.0],
                    [30.8, 32.4],
                    [35.9, 34.0],
                    [33.1, 40.6],
                    [25.0, 41.3],
                    [18.2, 42.3],
                    [12.2, 44.5],
                    [4.4, 43.2],
                    [-2.0, 39.2],
                    [-6.1, 35.4],
                ]],
            },
        },
        {
            type: 'Feature',
            properties: {
                id: 'north-america-pacific-eca',
                name: 'North American ECA - Pacific Coast',
                shortLabel: 'N. America ECA',
                status: 'active',
                note: 'Designated coastal areas off the United States and Canada',
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-133, 22],
                    [-116, 22],
                    [-117, 50],
                    [-128, 55],
                    [-133, 22],
                ]],
            },
        },
        {
            type: 'Feature',
            properties: {
                id: 'north-america-atlantic-gulf-eca',
                name: 'North American ECA - Atlantic and Gulf Coasts',
                shortLabel: 'N. America ECA',
                status: 'active',
                note: 'Designated coastal areas off the United States and Canada',
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-99, 18],
                    [-80, 18],
                    [-52, 42],
                    [-58, 49],
                    [-76, 44],
                    [-82, 31],
                    [-97, 28],
                    [-99, 18],
                ]],
            },
        },
        {
            type: 'Feature',
            properties: {
                id: 'us-caribbean-eca',
                name: 'United States Caribbean Sea ECA',
                shortLabel: 'US Caribbean ECA',
                status: 'active',
                note: 'Puerto Rico and United States Virgin Islands area',
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-68.5, 16],
                    [-63.5, 16],
                    [-63.5, 20],
                    [-68.5, 20],
                    [-68.5, 16],
                ]],
            },
        },
        {
            type: 'Feature',
            properties: {
                id: 'norwegian-sea-eca',
                name: 'Norwegian Sea ECA',
                shortLabel: 'Norwegian ECA',
                status: 'phase-in',
                note: 'IMO-designated newer ECA with phased implementation',
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-8.5, 60.0],
                    [0.5, 60.7],
                    [8.8, 63.4],
                    [16.8, 68.1],
                    [18.2, 72.5],
                    [6.0, 73.2],
                    [-4.8, 70.6],
                    [-8.5, 65.0],
                    [-8.5, 60.0],
                ]],
            },
        },
        {
            type: 'Feature',
            properties: {
                id: 'canadian-arctic-eca',
                name: 'Canadian Arctic ECA',
                shortLabel: 'Canada Arctic ECA',
                status: 'phase-in',
                note: 'IMO-designated newer ECA with phased implementation',
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-142, 60],
                    [-50, 60],
                    [-50, 84],
                    [-142, 84],
                    [-142, 60],
                ]],
            },
        },
    ] satisfies SecaZoneFeature[],
} as const;

export const SECA_ZONE_LAYER_IDS = [
    'seca-zones-fill',
    'seca-zones-outline',
    'seca-zones-label',
] as const;
