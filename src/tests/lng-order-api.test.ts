import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { clearAccessToken, setAccessToken } from '../services/authToken';
import { clearMarketSupportContextId } from '../services/marketSupportContextStore';
import { invalidateReadCache } from '../services/readCache';
import type { LngAskTerms, LngBidTerms } from '../types/lngOrder';
import { mapLngOrderTerms, mapLngTermsSnapshot } from '../services/lngOrder';

const bidTerms: LngBidTerms = {
    side: 'BID',
    accepted_schemes: ['ISCC_EU'],
    accepted_custody: ['MASS_BALANCE', 'PHYSICAL_SEGREGATION'],
    require_union_database: true,
    min_bio_share_pct: 90,
    max_wtt_ghg_gco2e_mj: -50,
    accepted_delivery_methods: ['SHIP_TO_SHIP'],
    min_methane_number: 70,
    accept_resellers: false,
};

/** Public ask exactly as the server sends it: identity redacted, decimals as strings. */
const publicAskWire = {
    side: 'ASK',
    sustainability_scheme: 'ISCC_EU',
    chain_of_custody: 'MASS_BALANCE',
    union_database_registered: true,
    bio_share_pct: '95.00',
    feedstock: 'MANURE',
    feedstock_detail: null,
    production_country: 'NL',
    wtt_ghg_gco2e_mj: '-110.25',
    specification_standard: 'ISO 23306:2020',
    min_methane_number: '80',
    delivery_method: 'SHIP_TO_SHIP',
    seller_is_physical_supplier: false,
    pos_timing: 'WITH_DELIVERY',
    reseller: true,
    fueleu_recognition: 'UNION_DATABASE',
};

describe('Bio-LNG standard orderbook API', () => {
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

    it('normalizes public ASK decimals without restoring the redacted identity', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            items: [{ id: 'ask-1', market_product: 'BIO_LNG', lng_terms: publicAskWire }], total: 1, skip: 0, limit: 20,
        }), { status: 200 }));
        const page = await api.orderbook.listAsksPaged({ market_product: 'BIO_LNG' });
        expect(page.items[0].lng_terms).toMatchObject({
            side: 'ASK', bio_share_pct: 95, wtt_ghg_gco2e_mj: -110.25, min_methane_number: 80, reseller: true,
        });
        expect(page.items[0].lng_terms).not.toHaveProperty('scheme_certificate_number');
        expect(page.items[0].lng_terms).not.toHaveProperty('physical_supplier_name');
    });

    it('carries lng_terms into the order request and leaves other products untouched', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'order-1' }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ items: [
                { id: 'alcohol-1', market_product: 'BIO_METHANOL' },
            ], total: 1 }), { status: 200 }));
        await api.orderbook.create({
            side: 'ASK',
            product_id: 'bio-lng-product',
            quantity_mt: 100,
            price_per_mt_usd: 800,
            availability_window: 'SPOT',
            lng_terms: { ...publicAskWire, scheme_certificate_number: 'ISCC-EU-001', physical_supplier_name: 'Supplier A' } as unknown as LngAskTerms,
        });
        const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
        expect(body.lng_terms).toMatchObject({ side: 'ASK', scheme_certificate_number: 'ISCC-EU-001' });
        expect(body).not.toHaveProperty('lng_terms_snapshot');

        const page = await api.orderbook.listAsksPaged();
        expect(page.items[0]).not.toHaveProperty('lng_terms');
    });

    it('maps a trade snapshot to both sides and keeps an unconfirmed ask redacted', async () => {
        expect(mapLngTermsSnapshot({
            bid: bidTerms,
            ask: publicAskWire,
        })).toEqual({
            bid: expect.objectContaining({ side: 'BID', min_bio_share_pct: 90, max_wtt_ghg_gco2e_mj: -50, min_methane_number: 70 }),
            ask: expect.objectContaining({ side: 'ASK', reseller: true, fueleu_recognition: 'UNION_DATABASE', wtt_ghg_gco2e_mj: -110.25 }),
        });
        expect(mapLngTermsSnapshot({ bid: bidTerms })).toBeNull();
        expect(mapLngOrderTerms({ side: 'MID' })).toBeNull();
        expect(mapLngOrderTerms(null)).toBeNull();
    });

    it('reads a trade snapshot from the trades endpoint', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            items: [{ id: 'trade-1', market_product: 'BIO_LNG', lng_terms_snapshot: { bid: bidTerms, ask: publicAskWire } }],
            total: 1, skip: 0, limit: 20,
        }), { status: 200 }));
        const trades = await api.trades.myTrades();
        const snapshot = trades[0].lng_terms_snapshot;
        expect(snapshot?.bid.side).toBe('BID');
        expect(snapshot?.ask).toMatchObject({ side: 'ASK', bio_share_pct: 95 });
    });
});
