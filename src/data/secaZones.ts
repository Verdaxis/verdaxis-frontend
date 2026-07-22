import collectionJson from './eca-zones-web.json';

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

/** Web-simplified ECA geometry generated from the versioned operational dataset. */
export const ECA_ZONE_COLLECTION = collectionJson as unknown as EcaZoneFeatureCollection;

// Compatibility name retained for existing map imports.
export const SECA_ZONE_COLLECTION = ECA_ZONE_COLLECTION;

export const SECA_ZONE_LAYER_IDS = [
    'seca-zones-fill',
    'seca-zones-outline',
    'seca-zones-label',
] as const;

export const SECA_ZONE_SOURCE_ID = 'seca-zones';
export const SECA_ZONE_LABEL_SOURCE_ID = 'seca-zone-labels';

export const ECA_ZONE_BUNDLE_VERSION =
    (ECA_ZONE_COLLECTION.metadata?.bundleVersion as string | undefined) ?? 'unknown';
