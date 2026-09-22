import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { clearAccessToken, setAccessToken } from '../services/authToken';
import { clearMarketSupportContextId } from '../services/marketSupportContextStore';
import { invalidateReadCache } from '../services/readCache';
import type { FameOrderAskTerms, FameOrderBidTerms } from '../types/fameOrder';
import { mapFameOrderTerms, mapFameTermsSnapshot } from '../services/fameOrder';

const bidTerms: FameOrderBidTerms = {
    side: 'BID', schema_version: 1, neat_fame: true, standard: 'EN_14214', standard_edition: '2012+A2:2019',
    sustainability_scheme: 'ISCC_EU', require_quality_evidence: false, require_sustainability_evidence: false,
    evidence_due: 'BEFORE_LOADING', max_ci_gco2e_mj: 0, ci_methodology: 'RED methodology', ci_boundary: 'WTW', ci_basis: 'ACTUAL',
};
const publicAsk = {
    side: 'ASK', schema_version: 1, neat_fame: true, nomination_status: 'PENDING',
    standard: 'EN_14214', standard_edition: '2012+A2:2019', uco_mass_pct: 100,
    cfpp_c: '-5', cloud_point_c: '0', ci_gco2e_mj: null, lhv_mj_kg: '37.2',
    sustainability_scheme: 'ISCC_EU', certificate_valid_until: '2027-01-01', evidence_status: 'PENDING',
    evidence_due: 'BEFORE_LOADING',
    quality_evidence: { status: 'AVAILABLE', results: [{ property: 'WATER_MG_KG', value: '100' }] },
};

describe('B100 standard orderbook API', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        clearMarketSupportContextId();
        invalidateReadCache();
        setAccessToken('order-session');
    });

    afterEach(() => {
        clearAccessToken();
        invalidateReadCache();
        vi.restoreAllMocks();
    });

    it('reads anonymous B100 ASK declarations from the standard paginated orderbook', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            items: [{ id: 'ask-1', market_product: 'UCOME_B100', fame_terms: publicAsk }], total: 1, skip: 0, limit: 20,
        }), { status: 200 }));
        const page = await api.orderbook.listAsksPaged({ market_product: 'UCOME_B100' });
        expect(page.items[0].fame_terms).toMatchObject({ cfpp_c: -5, cloud_point_c: 0, ci_gco2e_mj: null, lhv_mj_kg: 37.2 });
        expect(page.items[0].fame_terms.quality_evidence.results[0].value).toBe(100);
        expect(page.items[0].fame_terms).not.toHaveProperty('certificate_reference');
        expect(page.items[0].fame_terms).not.toHaveProperty('producing_site');
    });

    it('carries the observed B100 order version into a take without changing alcohol requests', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(new Response(JSON.stringify({ items: [
                { id: 'ask-1', market_product: 'UCOME_B100', version: '7', fame_terms: publicAsk },
                { id: 'alcohol-1', market_product: 'BIO_METHANOL', version: '8' },
                { id: 'missing-version', market_product: 'UCOME_B100' },
                { id: 'invalid-version', market_product: 'UCOME_B100', version: '0' },
            ], total: 4 }), { status: 200 }))
            .mockImplementation(async () => new Response(JSON.stringify({ id: 'trade-1' }), { status: 201 }));
        const page = await api.orderbook.listAsksPaged();
        expect(page.items[0].version).toBe(7);
        expect(page.items[1].version).toBe('8');
        expect(page.items[2]).not.toHaveProperty('version');
        expect(page.items[3].version).toBeUndefined();
        await api.trades.initiate({
            order_id: 'ask-1', quantity_mt: 100, fame_terms: bidTerms,
            expected_order_version: page.items[0].version,
        });
        expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({ expected_order_version: 7 });
        await api.trades.initiate({ order_id: 'alcohol-1', quantity_mt: 100 });
        expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({ order_id: 'alcohol-1', quantity_mt: 100 });
    });

    it('submits B100 buyer requirements to orderbook with the existing idempotency header', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            id: 'bid-1', fame_terms: { ...bidTerms, max_ci_gco2e_mj: '0', max_cfpp_c: null, max_cloud_point_c: '-2' },
        }), { status: 201 }));
        const order = await api.orderbook.create({
            side: 'BID', product_id: 'ucome', delivery_point_id: 'singapore', quantity_mt: 500,
            price_per_mt_usd: 1100, availability_window: 'SPOT', is_anonymous: true,
            fame_terms: bidTerms, idempotency_key: 'draft-uuid',
        });
        const [url, options] = fetchMock.mock.calls[0];
        expect(String(url)).toMatch(/\/orderbook$/);
        expect(new Headers(options?.headers).get('Idempotency-Key')).toBe('draft-uuid');
        const body = JSON.parse(String(options?.body));
        expect(body.fame_terms).toEqual(bidTerms);
        expect(body).not.toHaveProperty('idempotency_key');
        expect(order.fame_terms).toMatchObject({ max_ci_gco2e_mj: 0, max_cfpp_c: null, max_cloud_point_c: -2 });
    });

    it('passes taker requirements and normalizes the frozen matched specification snapshot', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            id: 'trade-1', fame_terms_snapshot: {
                schema_version: 1, bid: { ...bidTerms, max_ci_gco2e_mj: '0' }, ask: { ...publicAsk, ci_gco2e_mj: '0' },
            },
        }), { status: 201 }));
        const trade = await api.trades.initiate({ order_id: 'ask-1', quantity_mt: 100, fame_terms: bidTerms, idempotency_key: 'trade-uuid' });
        expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/trades\/$/);
        expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ order_id: 'ask-1', quantity_mt: 100, fame_terms: bidTerms });
        expect(trade.fame_terms_snapshot.bid.max_ci_gco2e_mj).toBe(0);
        expect(trade.fame_terms_snapshot.ask.ci_gco2e_mj).toBe(0);
        expect(trade.fame_terms_snapshot.ask).not.toHaveProperty('certificate_holder');
    });

    it('normalizes owner declarations on my orders without changing legacy alcohol records', async () => {
        const alcohol = { id: 'alcohol-order', market_product: 'BIO_METHANOL', quantity_mt: '500' };
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
            alcohol, { id: 'ucome-order', fame_terms: { ...publicAsk, certificate_reference: 'owner-certificate' } },
        ]), { status: 200 }));
        const orders = await api.orderbook.myOrders();
        expect(orders[0]).toEqual(alcohol);
        expect(orders[1].fame_terms.lhv_mj_kg).toBe(37.2);
        expect(orders[1].fame_terms.certificate_reference).toBe('owner-certificate');
    });

    it('sends the supplier declaration and acknowledgements when a supplier takes a B100 bid', async () => {
        const askTerms: FameOrderAskTerms = {
            side: 'ASK', schema_version: 1, neat_fame: true, nomination_status: 'PENDING', uco_mass_pct: 100,
            standard: 'EN_14214', standard_edition: '2012+A2:2019', sustainability_scheme: 'ISCC_EU',
            certificate_reference: 'operator-certificate', certificate_holder: 'Supplier', certificate_valid_until: '2027-01-01',
            evidence_status: 'PENDING', document_references: [], evidence_due: 'BEFORE_LOADING',
        };
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'trade-1' }), { status: 201 }));
        await api.trades.initiate({
            order_id: 'bid-1', quantity_mt: 100, fame_terms: askTerms,
            certification_declared: true, msds_available: true,
        });
        expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
            order_id: 'bid-1', quantity_mt: 100, fame_terms: askTerms,
            certification_declared: true, msds_available: true,
        });
    });

    it('does not interpret unknown schemas or reversed snapshot sides as executable terms', () => {
        expect(mapFameOrderTerms({ ...bidTerms, schema_version: 2 })).toBeNull();
        expect(mapFameOrderTerms({ ...publicAsk, side: 'UNKNOWN' })).toBeNull();
        expect(mapFameTermsSnapshot({ schema_version: 1, bid: publicAsk, ask: bidTerms })).toBeNull();
    });
});
