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
                    [9.5, 53.5],
                    [31.5, 53.5],
                    [31.5, 66],
                    [18, 66],
                    [9.5, 58],
                    [9.5, 53.5],
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
                    [-5.5, 48.5],
                    [10, 48.5],
                    [10, 62.5],
                    [-5.5, 62.5],
                    [-5.5, 48.5],
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
                    [-6, 30],
                    [36, 30],
                    [36, 46],
                    [-6, 46],
                    [-6, 30],
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
                    [-8, 60],
                    [18, 60],
                    [18, 73],
                    [-8, 73],
                    [-8, 60],
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
