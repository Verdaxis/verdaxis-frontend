import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n, { loadNamespace } from '../i18n';
import { ApiError, api } from '../services/api';
import { clearAccessToken, setAccessToken } from '../services/authToken';
import {
    clearMarketSupportContextId,
    setMarketSupportContextId,
} from '../services/marketSupportContextStore';
import { ComplianceDashboard } from '../components/compliance/ComplianceDashboard';
import { Marketplace } from '../components/Marketplace';
import { renderWithProviders } from './test-utils';

// The catalog and orderbook reads are neighbours of the compliance routes,
// not part of this contract, so the marketplace harness replaces only them.
// The compliance methods stay the real client running against stubbed fetch.
const mocks = vi.hoisted(() => ({
    products: vi.fn(),
    points: vi.fn(),
    asks: vi.fn(),
    bids: vi.fn(),
    counts: vi.fn(),
    my: vi.fn(),
}));
vi.mock('../services/api', async original => {
    const actual = await original<typeof import('../services/api')>();
    return {
        ...actual,
        api: {
            ...actual.api,
            catalog: { products: mocks.products, deliveryPoints: mocks.points },
            orderbook: {
                ...actual.api.orderbook,
                listAsksPaged: mocks.asks,
                listBidsPaged: mocks.bids,
                productCounts: mocks.counts,
                myOrders: mocks.my,
            },
        },
    };
});
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'viewer', organization_id: 'org', role: 'ADMIN' } }),
}));
vi.mock('../context/MarketSupportContext', () => ({ useMarketSupport: () => ({ isActive: false }) }));
vi.mock('../hooks/useWatchlist', () => ({
    useWatchlist: () => ({ trackedSliceKeys: new Set(), pinnedOrderIds: new Set(), toggleSlice: vi.fn(), togglePin: vi.fn() }),
}));
vi.mock('../components/OrderPlaceModal', () => ({ OrderPlaceModal: () => null }));
vi.mock('../components/OrderBook', () => ({ OrderBook: () => null }));
vi.mock('../components/TradeTape', () => ({ TradeTape: () => null }));
vi.mock('recharts', async () => {
    const charts = await vi.importActual<typeof import('recharts')>('recharts');
    return { ...charts, ResponsiveContainer: () => null };
});

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/** Serve the compliance routes from one stubbed fetch, keyed by path suffix. */
function serveCompliance(routes: Record<string, () => Response>) {
    fetchMock.mockImplementation(async (input: unknown) => {
        const url = String(input instanceof Request ? input.url : input);
        for (const [suffix, respond] of Object.entries(routes)) {
            if (url.includes(suffix)) return respond();
        }
        throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
}

const requestInit = (call: number) => fetchMock.mock.calls[call]?.[1] as RequestInit;

// --- Wire fixtures: the composed read routes' response shapes ---
// Decimal fields are JSON strings, unknown emission fields are null, the two
// legacy cash fields keep the published two-decimal zero spelling, and a row
// the caller may not distinguish (hidden, bid, unresolvable) is null.

const FUEL_TABLE_WIRE = {
    fuels: {
        VLSFO: '91.16',
        LSMGO: '91.16',
        LNG: '69.00',
        'Bio-LNG': '28.00',
        Methanol: '31.00',
        'E-Methanol': '8.00',
        Ammonia: '18.00',
        Biofuel: '35.00',
        Hydrogen: '10.00',
    },
    unit: 'gCO2eq/MJ',
    source: 'Illustrative fuel-category assumptions; not verified consignment CI. Only year targets derive from Regulation (EU) 2023/1805 Article 4.',
} as const;

/** One fleet vessel: the default VLSFO mix, no declared emissions, CII `rating`. */
const fleetVessel = (
    vesselId: string,
    vesselName: string,
    overallScore: number,
    status: string,
    cii: { rating: string; score: number },
) => ({
    vessel_id: vesselId,
    vessel_name: vesselName,
    overall_score: overallScore,
    status,
    traffic_light: 'AMBER',
    fueleu: {
        ghg_intensity_gco2_mj: '91.16',
        target_intensity_gco2_mj: '89.3368',
        reduction_pct: '-2.04',
        compliance_balance_gco2: '-546960000.00',
        estimated_penalty_eur: '351219.51',
        score: 40,
    },
    eu_ets: {
        calculation_status: 'UNPRICED',
        total_co2_tonnes: null,
        ets_price_per_tonne_eur: '68',
        phase_in_pct: '100',
        estimated_cost_eur: null,
        score: 50,
    },
    cii,
    recommendations: [
        'Consider increasing biofuel or methanol blend to meet FuelEU targets',
        'Illustrative FuelEU deficit penalty: EUR 351220. Verify annual eligible energy and flexibility measures.',
    ],
});

const OWN_VESSEL_ID = '7ee0b6d2-9c1f-4f2f-8f0c-13a2b3c4d5e6';

const FLEET_WIRE = {
    total_vessels: 2,
    green_count: 0,
    amber_count: 2,
    red_count: 0,
    average_score: 51,
    vessels: [
        fleetVessel(OWN_VESSEL_ID, 'Aster Dawn', 55, 'ADEQUATE', { rating: 'A', score: 100 }),
        fleetVessel('c1d4a2a8-2f3b-4c5d-9e8f-0a1b2c3d4e5f', 'Blue Heron', 47, 'AT_RISK', { rating: 'C', score: 60 }),
    ],
};

const EMPTY_FLEET_WIRE = {
    total_vessels: 0,
    green_count: 0,
    amber_count: 0,
    red_count: 0,
    average_score: 0,
    vessels: [],
};

/** A scenario that repeats the default mix: the estimate labels it produces. */
const SCENARIO_WIRE = fleetVessel(OWN_VESSEL_ID, 'Aster Dawn', 55, 'ADEQUATE', { rating: 'A', score: 100 });

const OVERLAY_ASSUMPTIONS_WIRE = {
    eur_usd_rate: '1.08',
    vlsfo_baseline_gco2_mj: '91.16',
    ghgie_actual_gco2_mj: '91.16',
    fleet_intensity_basis: 'DEFAULT_VLSFO',
    fleet_vessel_count: 7,
    penalty_eur_per_tonne: '2400',
    year: 2026,
    year_target: '89.3368',
    excluded_factors: ['RFNBO_MULTIPLIER', 'DEFICIT_ESCALATION', 'EXTRA_EU_VOYAGE_SCOPE'],
};

const PRICED_ASK_ID = '3f2a9c1e-5b47-4d8f-9a21-6c0d5e7b8a90';

const OVERLAY_BODY_WIRE = {
    overlays: {
        [PRICED_ASK_ID]: {
            financial_benefit_status: 'UNPRICED',
            penalty_avoided_eur_per_mt: '0.00',
            penalty_avoided_usd_per_mt: '0.00',
            tco2e_avoided_per_mt: '1.197',
            ci_gco2_mj: '31.00',
            ci_basis: 'LISTING',
            lcv_mj_kg: '19.9',
            lcv_basis: 'PRODUCT_DEFAULT',
        },
        '1a2b3c4d-5e6f-4788-9a01-bcdef0123456': null,
        '0c9d8e7f-6a5b-4c4d-3e2f-1a0b9c8d7e6f': null,
    },
    assumptions: OVERLAY_ASSUMPTIONS_WIRE,
};

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    void i18n.changeLanguage('en');
});

afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    clearAccessToken();
    clearMarketSupportContextId();
});

describe('compliance_marketplace_cases', () => {
    it('passes the pricing overlay wire body through with hidden ids null', async () => {
        fetchMock.mockResolvedValue(jsonResponse(OVERLAY_BODY_WIRE));
        vi.stubGlobal('fetch', fetchMock);

        const result = await api.compliance.pricingOverlay([PRICED_ASK_ID, '1a2b3c4d-5e6f-4788-9a01-bcdef0123456', '0c9d8e7f-6a5b-4c4d-3e2f-1a0b9c8d7e6f']);

        // The client is a transport, not a mapper: decimal strings, the
        // two-decimal cash zeros and indistinguishable nulls stay as sent.
        expect(result).toEqual(OVERLAY_BODY_WIRE);
        expect(result.overlays['1a2b3c4d-5e6f-4788-9a01-bcdef0123456']).toBeNull();
        expect(typeof result.overlays[PRICED_ASK_ID]?.tco2e_avoided_per_mt).toBe('string');
        expect(result.assumptions.fleet_vessel_count).toBe(7);
        expect(result.assumptions.excluded_factors).toEqual(['RFNBO_MULTIPLIER', 'DEFICIT_ESCALATION', 'EXTRA_EU_VOYAGE_SCOPE']);

        expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/compliance/pricing-overlay');
        const init = requestInit(0);
        expect(init.method).toBe('POST');
        expect(JSON.parse(String(init.body))).toEqual({
            order_ids: [PRICED_ASK_ID, '1a2b3c4d-5e6f-4788-9a01-bcdef0123456', '0c9d8e7f-6a5b-4c4d-3e2f-1a0b9c8d7e6f'],
        });
    });

    it('types a structured invalid-batch 422 as a client error', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            detail: { code: 'INVALID_INPUT', message: 'order_ids must contain at most 100 UUIDs; year must be from 2025 to 9999.' },
        }, 422));
        vi.stubGlobal('fetch', fetchMock);

        const failure = api.compliance.pricingOverlay(Array.from({ length: 101 }, (_, index) => String(index)));

        await expect(failure).rejects.toBeInstanceOf(ApiError);
        await failure.catch((error: unknown) => {
            const apiError = error as ApiError;
            expect(apiError.status).toBe(422);
            expect(apiError.code).toBe('INVALID_INPUT');
            expect(apiError.message).toBe('order_ids must contain at most 100 UUIDs; year must be from 2025 to 9999.');
        });
    });

    it('types an unavailable overlay read 503 as a client error', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            detail: { code: 'READ_UNAVAILABLE', message: 'Market data is temporarily unavailable; retry shortly.' },
        }, 503));
        vi.stubGlobal('fetch', fetchMock);

        const failure = api.compliance.pricingOverlay([PRICED_ASK_ID]);

        await expect(failure).rejects.toMatchObject({ status: 503, code: 'READ_UNAVAILABLE' });
    });

    it('rejects an overlay that resolved after its support scope changed', async () => {
        fetchMock.mockResolvedValue(jsonResponse(OVERLAY_BODY_WIRE));
        vi.stubGlobal('fetch', fetchMock);
        setMarketSupportContextId('context-before');

        const pending = api.compliance.pricingOverlay([PRICED_ASK_ID]);
        setMarketSupportContextId('context-after');

        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    });

    describe('on the marketplace page', () => {
        function askPage() {
            const item = (id: string) => ({
                id, side: 'ASK', market_product: 'B30', product_name: id, fuel_type: 'Biofuel',
                certifications: [], remaining_quantity_mt: 500, price_per_mt_usd: 900, status: 'OPEN',
            });
            return {
                items: [item(PRICED_ASK_ID), item('1a2b3c4d-5e6f-4788-9a01-bcdef0123456')],
                total: 2, skip: 0, limit: 8,
            };
        }

        beforeEach(async () => {
            await loadNamespace('trading');
            await loadNamespace('rfq');
            mocks.products.mockResolvedValue([{ id: 'b30', market_product: 'B30', execution_mode: 'ORDERBOOK', is_active: true }]);
            mocks.points.mockResolvedValue([{ id: 'sg', name: 'Singapore', is_active: true }]);
            mocks.asks.mockResolvedValue(askPage());
            mocks.bids.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 8 });
            mocks.counts.mockResolvedValue({ counts: { B30: 2 } });
            mocks.my.mockResolvedValue([]);
        });

        it('shows the lifecycle gap under a visible ask and nothing under a hidden id', async () => {
            serveCompliance({ '/compliance/pricing-overlay': () => jsonResponse(OVERLAY_BODY_WIRE) });

            renderWithProviders(<Marketplace viewMode="BUYER" />);

            await waitFor(() => expect(document.querySelector(`[data-order-id="${PRICED_ASK_ID}"]`)).not.toBeNull());
            await waitFor(() => expect(screen.getByText('1.20 tCO₂e/MT lifecycle gap')).toBeTruthy());

            // The query layer owns the batch: deduplicated and sorted id set.
            const overlayCall = fetchMock.mock.calls.findIndex(([url]) => String(url).includes('/compliance/pricing-overlay'));
            expect(overlayCall).toBeGreaterThanOrEqual(0);
            expect(String(fetchMock.mock.calls[overlayCall]?.[0])).toBe('/api/compliance/pricing-overlay');
            expect(JSON.parse(String(requestInit(overlayCall).body))).toEqual({ order_ids: ['1a2b3c4d-5e6f-4788-9a01-bcdef0123456', PRICED_ASK_ID] });

            const visibleRow = document.querySelector(`[data-order-id="${PRICED_ASK_ID}"]`);
            const hiddenRow = document.querySelector('[data-order-id="1a2b3c4d-5e6f-4788-9a01-bcdef0123456"]');
            expect(visibleRow?.textContent).toContain('Regulatory benefit unpriced');
            expect(hiddenRow?.textContent).not.toContain('lifecycle gap');
            // The estimate label rides in the hint's tooltip with its context.
            expect(visibleRow?.querySelector('[title*="Equal-energy"]')?.getAttribute('title')).toContain('No ETS savings');
        });

        it('batches only sorted unique settled ASK ids', async () => {
            const page = askPage();
            const [ask, hidden] = page.items;
            mocks.asks.mockResolvedValue({
                ...page,
                items: [ask, hidden, { ...ask, id: 'bid-row', side: 'BID' }],
            });
            serveCompliance({ '/compliance/pricing-overlay': () => jsonResponse(OVERLAY_BODY_WIRE) });

            const view = renderWithProviders(<Marketplace viewMode="BUYER" />);
            await screen.findByText('1.20 tCO₂e/MT lifecycle gap');
            const overlayQuery = view.queryClient.getQueryCache().getAll().find(query => (
                JSON.stringify(query.queryKey).includes('overlay')
            ));
            expect(overlayQuery).toBeDefined();
            // A duplicate id passed to the feature adapter keeps the same key.
            const { marketplaceQueries } = await import('../features/marketplace/api/marketplaceQueries');
            const options = marketplaceQueries.overlay([0, 'viewer', 'org', null], [ask.id, hidden.id, ask.id]);
            expect(options.queryKey.at(-1)).toEqual(overlayQuery!.queryKey.at(-1));
            const bodies = fetchMock.mock.calls.map((_, index) => JSON.parse(String(requestInit(index).body)));
            expect(bodies).toEqual([{ order_ids: ['1a2b3c4d-5e6f-4788-9a01-bcdef0123456', PRICED_ASK_ID] }]);
            expect(document.querySelector('[data-order-id="bid-row"]')?.textContent).not.toContain('lifecycle gap');
        });

        it('does not request an overlay for a BID-only page', async () => {
            const page = askPage();
            mocks.bids.mockResolvedValue({ ...page, items: page.items.map(order => ({ ...order, side: 'BID' })) });
            serveCompliance({ '/compliance/pricing-overlay': () => jsonResponse(OVERLAY_BODY_WIRE) });

            renderWithProviders(<Marketplace viewMode="SUPPLIER" />);

            await waitFor(() => expect(document.querySelector(`[data-order-id="${PRICED_ASK_ID}"]`)).not.toBeNull());
            expect(fetchMock).not.toHaveBeenCalled();
            expect(screen.queryByText(/lifecycle gap/)).toBeNull();
        });

        it.each(['null', '422', '503'] as const)('removes a shown hint after a %s overlay response', async outcome => {
            serveCompliance({ '/compliance/pricing-overlay': () => jsonResponse(OVERLAY_BODY_WIRE) });
            const view = renderWithProviders(<Marketplace viewMode="BUYER" />);
            await screen.findByText('1.20 tCO₂e/MT lifecycle gap');
            const query = view.queryClient.getQueryCache().getAll().find(item => (
                JSON.stringify(item.queryKey).includes('overlay')
            ));
            expect(query).toBeDefined();
            fetchMock.mockResolvedValue(outcome === 'null'
                ? jsonResponse({ ...OVERLAY_BODY_WIRE, overlays: { [PRICED_ASK_ID]: null } })
                : jsonResponse({ detail: { code: outcome === '422' ? 'INVALID_INPUT' : 'READ_UNAVAILABLE', message: 'Compliance read unavailable.' } }, Number(outcome)));

            // Force the existing key to read again; do not alter its freshness rules.
            await act(async () => {
                await view.queryClient.refetchQueries({ queryKey: query!.queryKey, exact: true });
            });

            expect(fetchMock).toHaveBeenCalledTimes(2);
            await waitFor(() => expect(screen.queryByText('1.20 tCO₂e/MT lifecycle gap')).toBeNull());
            expect(document.querySelector(`[data-order-id="${PRICED_ASK_ID}"]`)).not.toBeNull();
        });

        it('keeps listings rendered when the overlay read is unavailable', async () => {
            serveCompliance({
                '/compliance/pricing-overlay': () => jsonResponse({
                    detail: { code: 'READ_UNAVAILABLE', message: 'Market data is temporarily unavailable; retry shortly.' },
                }, 503),
            });

            renderWithProviders(<Marketplace viewMode="BUYER" />);

            await waitFor(() => expect(fetchMock).toHaveBeenCalled());
            await waitFor(() => expect(document.querySelector(`[data-order-id="${PRICED_ASK_ID}"]`)).not.toBeNull());
            await waitFor(() => expect(screen.queryByText(/tCO₂e\/MT lifecycle gap/)).toBeNull());
            expect(document.querySelector('[data-order-id="1a2b3c4d-5e6f-4788-9a01-bcdef0123456"]')).not.toBeNull();
        });
    });
});

describe('compliance_dashboard_cases', () => {
    beforeEach(async () => {
        await loadNamespace('compliance');
    });

    it('shows scenario fleet values from wire strings with unpriced emissions null', async () => {
        serveCompliance({
            '/compliance/fleet': () => jsonResponse(FLEET_WIRE),
            '/compliance/fuels': () => jsonResponse(FUEL_TABLE_WIRE),
        });

        renderWithProviders(<ComplianceDashboard onOpenLedger={vi.fn()} />);

        // Fleet banner: counts and the average come from the same document.
        expect(await screen.findByText('2 vessels · illustrative annual scenarios')).toBeTruthy();
        expect(screen.getByText('51')).toBeTruthy();
        expect(screen.getAllByText('0').length).toBe(2);

        // Unpriced emissions stay visibly unpriced; nothing invents a zero cost.
        expect(screen.getByText('Unpriced: in-scope combustion emissions are not provided.')).toBeTruthy();
        expect(screen.getByText('— tonnes')).toBeTruthy();
        expect(screen.getByText('€68/t')).toBeTruthy();
        expect(screen.queryByText('€0')).toBeNull();

        // Vessel rows read the wire strings: intensity, status, CII rating.
        expect(screen.getAllByText('Aster Dawn').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Blue Heron').length).toBeGreaterThan(0);
        expect(screen.getAllByText('91.2')).toHaveLength(2);
        expect(screen.getByText('Adequate')).toBeTruthy();
        expect(screen.getByText('At risk')).toBeTruthy();
        expect(screen.getByText('A')).toBeTruthy();
        expect(screen.getByText('C')).toBeTruthy();
        expect(screen.getByText('Target: 89.3368 gCO2eq/MJ')).toBeTruthy();

        // The fuel table keeps its wire unit spelling next to each intensity.
        expect(screen.getByText('31.00 gCO2eq/MJ')).toBeTruthy();

        // The first recommendation of each row renders with its estimate wording.
        expect(screen.getAllByText('Consider increasing the biofuel or methanol blend to meet FuelEU targets.').length).toBe(2);
    });

    it('shows the empty fleet state for a complete empty fleet document', async () => {
        serveCompliance({
            '/compliance/fleet': () => jsonResponse(EMPTY_FLEET_WIRE),
            '/compliance/fuels': () => jsonResponse(FUEL_TABLE_WIRE),
        });

        renderWithProviders(<ComplianceDashboard onOpenLedger={vi.fn()} />);

        expect(await screen.findByText('No Vessels Found')).toBeTruthy();
    });

    it('shows the unavailable state when the fleet read fails', async () => {
        serveCompliance({
            '/compliance/fleet': () => jsonResponse({
                detail: { code: 'READ_UNAVAILABLE', message: 'Market data is temporarily unavailable; retry shortly.' },
            }, 503),
            '/compliance/fuels': () => jsonResponse(FUEL_TABLE_WIRE),
        });

        renderWithProviders(<ComplianceDashboard onOpenLedger={vi.fn()} />);

        expect(await screen.findByText('Could not load compliance data')).toBeTruthy();
        expect(screen.getByText('Compliance data is temporarily unavailable.')).toBeTruthy();
        expect(screen.queryByText('Aster Dawn')).toBeNull();
    });

    it('types fleet read refusals with their structured codes', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({
                detail: { code: 'READ_UNAVAILABLE', message: 'Market data is temporarily unavailable; retry shortly.' },
            }, 503))
            .mockResolvedValueOnce(jsonResponse({
                detail: { code: 'READ_RESULT_LIMIT', message: 'The result exceeds the supported read limit.' },
            }, 503));
        vi.stubGlobal('fetch', fetchMock);

        await expect(api.compliance.fleet()).rejects.toMatchObject({ status: 503, code: 'READ_UNAVAILABLE' });
        await expect(api.compliance.fleet()).rejects.toMatchObject({ status: 503, code: 'READ_RESULT_LIMIT' });
    });

    it('runs a scenario with the entered mix and shows the estimate labels', async () => {
        let scenarioBodies: string[] = [];
        serveCompliance({
            '/compliance/fleet': () => jsonResponse(FLEET_WIRE),
            '/compliance/fuels': () => jsonResponse(FUEL_TABLE_WIRE),
            '/compliance/scenario': () => {
                scenarioBodies.push(String(requestInit(fetchMock.mock.calls.length - 1).body));
                return jsonResponse(SCENARIO_WIRE);
            },
        });

        renderWithProviders(<ComplianceDashboard onOpenLedger={vi.fn()} />);
        await screen.findAllByText('Aster Dawn');

        // The fuel-mix inputs render in the fuel table's order; VLSFO is first.
        const mixInputs = screen.getAllByPlaceholderText('0');
        fireEvent.change(mixInputs[0], { target: { value: '1' } });
        expect(screen.getByText('Total:')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));

        // The projected penalty carries the estimate label twice: the amber
        // box with its formatted amount, and the recommendation with EUR text.
        expect(await screen.findByText('Illustrative FuelEU deficit penalty: €351,220')).toBeTruthy();
        // The current recommendation formatter retains the sentence dot in
        // the amount, then the translation adds another. Keep that visible.
        expect(screen.getByText('Illustrative FuelEU deficit penalty: EUR 351220.. Verify annual eligible energy and flexibility measures.')).toBeTruthy();
        expect(screen.getAllByText('Consider increasing the biofuel or methanol blend to meet FuelEU targets.')).toHaveLength(3);
        expect(screen.getByText('91.2 gCO2/MJ')).toBeTruthy();
        expect(screen.getByText('Score: 100')).toBeTruthy();
        expect(screen.getByText('40')).toBeTruthy();

        // The client passes the entered mix on untouched, with the default year.
        expect(scenarioBodies).toEqual([JSON.stringify({
            vessel_id: OWN_VESSEL_ID,
            fuel_mix: { VLSFO: '1' },
            year: 2026,
        })]);
    });

    it.each(['0.96', '1.04'])('sends a mix total of %s unchanged for server normalization', async fraction => {
        serveCompliance({
            '/compliance/fleet': () => jsonResponse(FLEET_WIRE),
            '/compliance/fuels': () => jsonResponse(FUEL_TABLE_WIRE),
            '/compliance/scenario': () => jsonResponse(SCENARIO_WIRE),
        });
        renderWithProviders(<ComplianceDashboard onOpenLedger={vi.fn()} />);
        await screen.findAllByText('Aster Dawn');
        fireEvent.change(screen.getAllByPlaceholderText('0')[0], { target: { value: fraction } });
        fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
        await screen.findByText('Illustrative FuelEU deficit penalty: €351,220');
        const call = fetchMock.mock.calls.findIndex(([url]) => String(url).endsWith('/compliance/scenario'));
        expect(JSON.parse(String(requestInit(call).body))).toEqual({
            vessel_id: OWN_VESSEL_ID, fuel_mix: { VLSFO: fraction }, year: 2026,
        });
    });

    it('keeps a mix outside the five-percent tolerance on the page', async () => {
        serveCompliance({
            '/compliance/fleet': () => jsonResponse(FLEET_WIRE),
            '/compliance/fuels': () => jsonResponse(FUEL_TABLE_WIRE),
        });
        renderWithProviders(<ComplianceDashboard onOpenLedger={vi.fn()} />);
        await screen.findAllByText('Aster Dawn');
        fireEvent.change(screen.getAllByPlaceholderText('0')[0], { target: { value: '0.90' } });
        fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
        expect(screen.getByText('Fuel fractions must sum to 1.0 (currently 0.90).')).toBeTruthy();
        expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/compliance/scenario'))).toBe(false);
    });

    it('preserves a generic scenario label and an explicit reporting year', async () => {
        const label = 'Planning vessel α';
        const wire = { ...SCENARIO_WIRE, vessel_id: label, vessel_name: `Vessel ${label}` };
        fetchMock.mockResolvedValue(jsonResponse(wire));
        vi.stubGlobal('fetch', fetchMock);

        const result = await api.compliance.scenario(label, { VLSFO: '0.96' }, 2030);

        expect(result).toEqual(wire);
        expect(result.vessel_name).toBe('Vessel Planning vessel α');
        expect(JSON.parse(String(requestInit(0).body))).toEqual({
            vessel_id: label, fuel_mix: { VLSFO: '0.96' }, year: 2030,
        });
    });

    it.each([422, 503])('passes a scenario %s refusal to the caller', async status => {
        fetchMock.mockResolvedValue(jsonResponse({
            detail: { code: status === 422 ? 'INVALID_INPUT' : 'READ_UNAVAILABLE', message: 'Scenario unavailable.' },
        }, status));
        vi.stubGlobal('fetch', fetchMock);
        await expect(api.compliance.scenario('Planning vessel', { VLSFO: '1' }))
            .rejects.toMatchObject({ status, message: 'Scenario unavailable.' });
    });

    it.each([422, 503])('keeps the scenario panel usable after a %s refusal', async status => {
        serveCompliance({
            '/compliance/fleet': () => jsonResponse(FLEET_WIRE),
            '/compliance/fuels': () => jsonResponse(FUEL_TABLE_WIRE),
            '/compliance/scenario': () => jsonResponse({
                detail: { code: status === 422 ? 'INVALID_INPUT' : 'READ_UNAVAILABLE', message: 'Scenario unavailable.' },
            }, status),
        });

        renderWithProviders(<ComplianceDashboard onOpenLedger={vi.fn()} />);
        await screen.findAllByText('Aster Dawn');

        const mixInputs = screen.getAllByPlaceholderText('0');
        fireEvent.change(mixInputs[0], { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));

        expect(await screen.findByText('Scenario calculation failed. Please try again.')).toBeTruthy();
        expect(screen.queryByText('Illustrative FuelEU deficit penalty: €351,220')).toBeNull();
    });

    it('reads the public fuel table without credentials', async () => {
        fetchMock.mockResolvedValue(jsonResponse(FUEL_TABLE_WIRE));
        vi.stubGlobal('fetch', fetchMock);
        setAccessToken('a-session-token');

        const fuels = await api.compliance.fuels();

        expect(fuels).toEqual(FUEL_TABLE_WIRE);
        expect(fuels.fuels.Methanol).toBe('31.00');
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/compliance/fuels');
        // The policy table is public: no bearer and no auth headers at all.
        expect(init.headers).toBeUndefined();
    });

    it.each([422, 503])('passes vessel-score %s errors to callers', async status => {
        const code = status === 422 ? 'INVALID_INPUT' : 'READ_UNAVAILABLE';
        serveCompliance({
            '/score': () => jsonResponse({ detail: { code, message: 'Compliance read unavailable.' } }, status),
        });
        await expect(api.compliance.vesselScore(status === 422 ? 'not-a-uuid' : OWN_VESSEL_ID))
            .rejects.toMatchObject({ status, code });
    });

    it('shows the unavailable page when the public fuel read fails', async () => {
        serveCompliance({
            '/compliance/fleet': () => jsonResponse(FLEET_WIRE),
            '/compliance/fuels': () => jsonResponse({ detail: { code: 'READ_UNAVAILABLE', message: 'Compliance read unavailable.' } }, 503),
        });
        renderWithProviders(<ComplianceDashboard onOpenLedger={vi.fn()} />);
        expect(await screen.findByText('Could not load compliance data')).toBeTruthy();
        expect(screen.queryByText('31.00 gCO2eq/MJ')).toBeNull();
    });

    it('passes fleet decimals and nullable ETS values through without conversion', async () => {
        serveCompliance({ '/compliance/fleet': () => jsonResponse(FLEET_WIRE) });
        const fleet = await api.compliance.fleet();
        expect(fleet).toEqual(FLEET_WIRE);
        expect(fleet.vessels[0].eu_ets.total_co2_tonnes).toBeNull();
        expect(fleet.vessels[0].fueleu.target_intensity_gco2_mj).toBe('89.3368');
    });

    it('passes a vessel score through and types its refusals by code', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(FLEET_WIRE.vessels[0]))
            .mockResolvedValueOnce(jsonResponse({ detail: { code: 'VESSEL_NOT_FOUND', message: 'Vessel not found.' } }, 404))
            .mockResolvedValueOnce(jsonResponse({ detail: { code: 'VESSEL_FORBIDDEN', message: 'Not authorized to view this vessel.' } }, 403));
        vi.stubGlobal('fetch', fetchMock);

        const score = await api.compliance.vesselScore(OWN_VESSEL_ID);
        expect(score).toEqual(FLEET_WIRE.vessels[0]);
        expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`/api/compliance/vessels/${OWN_VESSEL_ID}/score`);

        await expect(api.compliance.vesselScore('00000000-0000-4000-8000-000000000000'))
            .rejects.toMatchObject({ status: 404, code: 'VESSEL_NOT_FOUND' });
        await expect(api.compliance.vesselScore('00000000-0000-4000-8000-000000000001'))
            .rejects.toMatchObject({ status: 403, code: 'VESSEL_FORBIDDEN' });
    });
});
