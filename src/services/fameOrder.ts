import type { FameOrderPublicTerms, FameTermsSnapshot } from '../types/fameOrder';
import { mapFameFuelMeasurements, optionalRfqNumber } from './fameRfq';

/** Public declarations remain public: normalization never restores omitted identities. */
export function mapFameOrderTerms(value: Record<string, any> | null | undefined): FameOrderPublicTerms | null {
    if (!value || value.schema_version !== 1) return null;
    if (value.side === 'BID') {
        return {
            ...value,
            max_cfpp_c: optionalRfqNumber(value.max_cfpp_c),
            max_cloud_point_c: optionalRfqNumber(value.max_cloud_point_c),
            max_ci_gco2e_mj: optionalRfqNumber(value.max_ci_gco2e_mj),
        } as FameOrderPublicTerms;
    }
    if (value.side === 'ASK') return mapFameFuelMeasurements(value) as FameOrderPublicTerms;
    return null;
}

export function mapFameTermsSnapshot(value: Record<string, any> | null | undefined): FameTermsSnapshot | null {
    if (!value || value.schema_version !== 1) return null;
    const bid = mapFameOrderTerms(value.bid);
    const ask = mapFameOrderTerms(value.ask);
    if (bid?.side !== 'BID' || ask?.side !== 'ASK') return null;
    return { schema_version: 1, bid, ask };
}

function mapResponseRecords<T>(value: T, mapRecord: (record: Record<string, any>) => Record<string, any>): T {
    if (Array.isArray(value)) return value.map(mapRecord) as T;
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, any>;
    if (Array.isArray(record.items)) return { ...record, items: record.items.map(mapRecord) } as T;
    return mapRecord(record) as T;
}

/** Retain the existing order response shape for arrays, pages and mutations. */
export function mapOrderbookFameResponse<T>(value: T): T {
    return mapResponseRecords(value, record => {
        const order = 'fame_terms' in record
            ? { ...record, fame_terms: mapFameOrderTerms(record.fame_terms) }
            : record;
        if (order.market_product !== 'UCOME_B100' || !('version' in order)) return order;
        const version = optionalRfqNumber(order.version);
        // A missing or invalid version must never become a usable stale-order guard.
        return { ...order, version: version !== null && Number.isSafeInteger(version) && version > 0 ? version : undefined };
    });
}

export function mapTradeFameResponse<T>(value: T): T {
    return mapResponseRecords(value, record => 'fame_terms_snapshot' in record
        ? { ...record, fame_terms_snapshot: mapFameTermsSnapshot(record.fame_terms_snapshot) }
        : record);
}
