import type { FameOfferTerms } from '../types/fameRfq';
import { parseWireDecimal, requireWireDecimal } from '../api/decimals';

// API Decimal values arrive as strings. Missing optional measurements stay
// unknown: zero is a real CI or cold-flow declaration, never a fallback.
// The conversion itself is the one shared boundary, under the name this module
// reads better with.
export const optionalRfqNumber = parseWireDecimal;

type DeclaredFuelMeasurements = Pick<FameOfferTerms, 'cfpp_c' | 'cloud_point_c' | 'ci_gco2e_mj' | 'lhv_mj_kg' | 'quality_evidence' | 'sustainability_evidence'>;

/** Normalize measurements without restoring fields redacted by the server. */
export function mapFameFuelMeasurements<T extends DeclaredFuelMeasurements>(value: T): T {
    return {
        ...value,
        cfpp_c: optionalRfqNumber(value.cfpp_c),
        cloud_point_c: optionalRfqNumber(value.cloud_point_c),
        ci_gco2e_mj: optionalRfqNumber(value.ci_gco2e_mj),
        lhv_mj_kg: optionalRfqNumber(value.lhv_mj_kg),
        ...(value.quality_evidence && {
            quality_evidence: {
                ...value.quality_evidence,
                results: value.quality_evidence.results.map(result => ({ ...result, value: requireWireDecimal(result.value) })),
            },
        }),
        ...(value.sustainability_evidence && {
            sustainability_evidence: {
                ...value.sustainability_evidence,
                ...('quantity_mt' in value.sustainability_evidence && {
                    quantity_mt: optionalRfqNumber(value.sustainability_evidence.quantity_mt),
                }),
            },
        }),
    };
}
