import ecaZonesAssetUrl from './eca-zones-web.json?url';

export type EcaDisplayStatus = 'active' | 'transition' | 'adopted';
export type SecaZoneStatus = 'active' | 'phase-in' | 'adopted';

export interface EcaZoneProperties {
    id: string;
    regulatoryAreaId: string;
    name: string;
    shortLabel: string;
    displayStatus: EcaDisplayStatus;
    status: SecaZoneStatus;
    note: string;
    pollutants: Array<'SOx' | 'PM' | 'NOx'>;
    soxPmStatus: 'active' | 'transition' | 'adopted';
    noxStatus: 'active' | 'adopted' | 'not-designated';
    entryIntoForceDate: string;
    soxPmRequirementsStartDate: string;
    sulfur010StartDate: string;
    noxRequirementsStartDate: string | null;
    noxTierIIIApplicability: Record<string, string> | null;
    officialControlPointCount: number | null;
    legalInstrument: string;
    sourceIds: string[];
    labelPoint: [number, number];
    navigationUse: false;
    legalBoundaryUse: false;
}

export interface EcaZoneFeature {
    type: 'Feature';
    properties: EcaZoneProperties;
    geometry:
        | { type: 'Polygon'; coordinates: number[][][] }
        | { type: 'MultiPolygon'; coordinates: number[][][][] };
}

export interface EcaZoneFeatureCollection {
    type: 'FeatureCollection';
    name?: string;
    metadata?: Record<string, unknown>;
    features: EcaZoneFeature[];
}

/**
 * URL of the hashed, immutably cached ECA geometry asset.
 *
 * The dataset is 1.1 MB of web-simplified GeoJSON. As a static import it
 * became part of the map route's JS chunk (394 KB gzip) and the browser had to
 * parse it before the overlay could install. As an emitted asset it streams
 * after `style.load`, is cached by URL hash, and keeps the JS bundle small.
 */
export const ECA_ZONES_ASSET_URL: string = ecaZonesAssetUrl;

let cachedCollection: EcaZoneFeatureCollection | null = null;

/**
 * Fetch the ECA zone geometry once per session.
 *
 * The caller decides when this is safe; `loadEcaLayers` calls it after the
 * Mapbox style has loaded, so the overlay data arrives after first paint. A
 * failure rejects, which the map surfaces as its overlay error, exactly as a
 * failed overlay chunk import did before.
 */
export async function loadEcaZoneCollection(): Promise<EcaZoneFeatureCollection> {
    if (cachedCollection) return cachedCollection;
    const response = await fetch(ECA_ZONES_ASSET_URL);
    if (!response.ok) {
        throw new Error(`ECA zone geometry request failed with status ${response.status}`);
    }
    cachedCollection = (await response.json()) as EcaZoneFeatureCollection;
    return cachedCollection;
}

export const SECA_ZONE_LAYER_IDS = [
    'seca-zones-fill',
    'seca-zones-outline',
    'seca-zones-label',
] as const;

export const SECA_ZONE_SOURCE_ID = 'seca-zones';
export const SECA_ZONE_LABEL_SOURCE_ID = 'seca-zone-labels';
