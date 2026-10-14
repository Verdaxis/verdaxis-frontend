import type { LngAskTermsView, LngOrderTermsView, LngTermsSnapshot } from '../types/lngOrder';
import { optionalRfqNumber } from './fameRfq';

/**
 * Bio-LNG `lng_terms` arrive with decimals as strings and, before a trade is
 * confirmed, without the seller's identity. Normalization never restores the
 * redacted certificate number or physical supplier name.
 */
export function mapLngOrderTerms(value: Record<string, any> | null | undefined): LngOrderTermsView | null {
    if (!value || !value.side) return null;
    if (value.side === 'BID') {
        return {
            ...value,
            min_bio_share_pct: optionalRfqNumber(value.min_bio_share_pct),
            max_wtt_ghg_gco2e_mj: optionalRfqNumber(value.max_wtt_ghg_gco2e_mj),
            min_methane_number: optionalRfqNumber(value.min_methane_number),
        } as LngOrderTermsView;
    }
    if (value.side === 'ASK') return mapLngAskMeasurements(value);
    return null;
}

/**
 * Spread the source so a public ask keeps its derived flags and a full ask
 * keeps its identity fields; only the decimal strings are normalized.
 */
function mapLngAskMeasurements(value: Record<string, any>): LngAskTermsView {
    return {
        ...value,
        bio_share_pct: optionalRfqNumber(value.bio_share_pct),
        wtt_ghg_gco2e_mj: optionalRfqNumber(value.wtt_ghg_gco2e_mj),
        min_methane_number: optionalRfqNumber(value.min_methane_number),
    } as LngAskTermsView;
}

export function mapLngTermsSnapshot(value: Record<string, any> | null | undefined): LngTermsSnapshot | null {
    if (!value) return null;
    const bid = mapLngOrderTerms(value.bid);
    const ask = mapLngOrderTerms(value.ask);
    if (bid?.side !== 'BID' || ask?.side !== 'ASK') return null;
    return { bid, ask };
}

function mapResponseRecords<T>(value: T, mapRecord: (record: Record<string, any>) => Record<string, any>): T {
    if (Array.isArray(value)) return value.map(mapRecord) as T;
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, any>;
    if (Array.isArray(record.items)) return { ...record, items: record.items.map(mapRecord) } as T;
    return mapRecord(record) as T;
}

/** Retain the existing order response shape for arrays, pages and mutations. */
export function mapOrderbookLngResponse<T>(value: T): T {
    return mapResponseRecords(value, record => 'lng_terms' in record
        ? { ...record, lng_terms: mapLngOrderTerms(record.lng_terms) }
        : record);
}

export function mapTradeLngResponse<T>(value: T): T {
    return mapResponseRecords(value, record => 'lng_terms_snapshot' in record
        ? { ...record, lng_terms_snapshot: mapLngTermsSnapshot(record.lng_terms_snapshot) }
        : record);
}
