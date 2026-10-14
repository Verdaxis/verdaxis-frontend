import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Marketplace } from '../components/Marketplace';
import { ApiError } from '../services/api';
import type { LngAskTerms, LngBidTerms, LngPublicAskTerms } from '../types/lngOrder';
import i18n, { loadNamespace } from '../i18n';
import copy from '../locales/en/trading.json';
import { renderWithProviders } from './test-utils';

const mocks = vi.hoisted(() => ({
    role: { current: 'BUYER' as 'BUYER' | 'SUPPLIER' },
    products: vi.fn(), deliveryPoints: vi.fn(), listAsksPaged: vi.fn(), listBidsPaged: vi.fn(),
    listAsks: vi.fn(), listBids: vi.fn(), productCounts: vi.fn(), myOrders: vi.fn(),
    initiate: vi.fn(), pricingOverlay: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'taker-1', role: mocks.role.current } }) }));
vi.mock('../context/MarketSupportContext', () => ({ useMarketSupport: () => ({ isActive: false }) }));
vi.mock('../hooks/useWatchlist', () => ({ useWatchlist: () => ({ trackedSliceKeys: new Set(), pinnedOrderIds: new Set(), toggleSlice: vi.fn(), togglePin: vi.fn() }) }));
vi.mock('../hooks/useDashboardContentReady', () => ({ useDashboardContentReady: () => undefined }));
vi.mock('../components/OrderPlaceModal', () => ({ OrderPlaceModal: () => null }));
vi.mock('../components/OrderBook', () => ({ OrderBook: () => null }));
vi.mock('../components/TradeTape', () => ({ TradeTape: () => null }));
vi.mock('../components/ui/Pagination', () => ({ Pagination: () => null }));
vi.mock('../services/api', async importOriginal => {
    // The real KYC helper keeps the KYC_REQUIRED branch of the take flow reachable (it follows the merged KYC gate).
    const { ApiError: RealApiError, ApiOutcomeUnknownError, isKycRequiredError } = await importOriginal<typeof import('../services/api')>();
    return { ApiError: RealApiError, ApiOutcomeUnknownError, isKycRequiredError, api: {
    catalog: { products: mocks.products, deliveryPoints: mocks.deliveryPoints },
    orderbook: { listAsksPaged: mocks.listAsksPaged, listBidsPaged: mocks.listBidsPaged,
        listAsks: mocks.listAsks, listBids: mocks.listBids, productCounts: mocks.productCounts, myOrders: mocks.myOrders },
    trades: { initiate: mocks.initiate },
    compliance: { pricingOverlay: mocks.pricingOverlay },
} };
});

const text = (key: string) => copy[key as keyof typeof copy] as string;

/** The public ask omits the certificate number and the physical supplier name. */
const publicAskTerms: LngPublicAskTerms = {
    side: 'ASK',
    sustainability_scheme: 'ISCC_EU',
    chain_of_custody: 'MASS_BALANCE',
    union_database_registered: true,
    bio_share_pct: 95,
    feedstock: 'MANURE',
    feedstock_detail: null,
    production_country: 'NL',
    wtt_ghg_gco2e_mj: -110,
    specification_standard: 'ISO 23306:2020',
    min_methane_number: 80,
    delivery_method: 'SHIP_TO_SHIP',
    seller_is_physical_supplier: false,
    pos_timing: 'WITH_DELIVERY',
    reseller: true,
    fueleu_recognition: 'UNION_DATABASE',
};
const bidTerms: LngBidTerms = {
    side: 'BID',
    accepted_schemes: ['ISCC_EU'],
    accepted_custody: ['MASS_BALANCE'],
    require_union_database: true,
    accepted_delivery_methods: ['SHIP_TO_SHIP'],
    accept_resellers: true,
};
const orderCore = {
    product_id: 'bio-lng-product', product_name: 'Bio-LNG', market_product: 'BIO_LNG', fuel_type: 'LNG', fuel_grade: 'Bio',
    delivery_point_id: 'dp-rtm', delivery_point_name: 'Rotterdam', region: 'Europe', quantity_mt: 500,
    remaining_quantity_mt: 500, price_per_mt_usd: 820, availability_window: 'SPOT',
    certifications: ['ISCC_EU'], is_verdaxis_verified: false, off_spec: false, status: 'OPEN',
    terms_digest: 'terms-digest-1', created_at: '2026-10-14T04:00:00Z',
};
const tradeResult = {
    status: 'PENDING_CONFIRMATION', product_name: 'Bio-LNG', market_product: 'BIO_LNG', fuel_type: 'LNG',
    delivery_point_name: 'Rotterdam', region: 'Europe', quantity_mt: 500, price_per_mt_usd: 820,
};
const ask = { ...orderCore, id: 'bio-lng-ask', side: 'ASK', lng_terms: publicAskTerms };
const bid = { ...orderCore, id: 'bio-lng-bid', side: 'BID', lng_terms: bidTerms };

beforeEach(async () => {
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
    vi.resetAllMocks();
    localStorage.clear();
    mocks.role.current = 'BUYER';
    mocks.products.mockResolvedValue([{ id: 'bio-lng-product', name: 'Bio-LNG', market_product: 'BIO_LNG',
        fuel_type: 'LNG', fuel_grade: 'Bio', min_lot_size: 1, unit: 'MT', execution_mode: 'ORDERBOOK',
        is_active: true, available_delivery_point_ids: ['dp-rtm'] }]);
    mocks.deliveryPoints.mockResolvedValue([{ id: 'dp-rtm', name: 'Rotterdam', region: 'Europe', timezone: 'Europe/Amsterdam', is_active: true }]);
    mocks.listAsksPaged.mockResolvedValue({ items: [ask], total: 1, skip: 0, limit: 20 });
    mocks.listBidsPaged.mockResolvedValue({ items: [bid], total: 1, skip: 0, limit: 20 });
    mocks.listAsks.mockResolvedValue([ask]);
    mocks.listBids.mockResolvedValue([bid]);
    mocks.productCounts.mockResolvedValue({ counts: { BIO_LNG: 1 }, total: 1 });
    mocks.myOrders.mockResolvedValue([]);
    mocks.initiate.mockResolvedValue(tradeResult);
    mocks.pricingOverlay.mockResolvedValue({ overlays: {}, assumptions: null });
});

async function renderMarketplace(role: 'BUYER' | 'SUPPLIER') {
    mocks.role.current = role;
    renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=BIO_LNG' });
    await screen.findByText(text('marketplace.bioLng.orderTerms'));
}

describe('Marketplace Bio-LNG take flow', () => {
    it('shows the public ask terms without seller identity', async () => {
        await renderMarketplace('BUYER');
        const listing = screen.getAllByText(text('marketplace.bioLng.orderTerms'))[0].closest('details')!;
        expect(within(listing).getByText(text('lngTerms.scheme.ISCC_EU'))).toBeTruthy();
        expect(within(listing).getByText(text('lngTerms.unionDatabase.registered'))).toBeTruthy();
        expect(within(listing).getByText(/-110 gCO₂e\/MJ/)).toBeTruthy();
        expect(within(listing).getByText(text('lngTerms.wttNote'))).toBeTruthy();
        expect(within(listing).getByText(text('lngTerms.reseller.yes'))).toBeTruthy();
        expect(screen.queryByText('ISCC-EU-001')).toBeNull();
        expect(screen.queryByText('Licensed Bunker Co')).toBeNull();
    });

    it('submits the taker requirements as lng_terms', async () => {
        await renderMarketplace('BUYER');
        fireEvent.click(await screen.findByRole('button', { name: 'Lift Ask' }));
        const form = within(await screen.findByRole('form', { name: text('marketplace.bioLng.takerTerms') }));
        fireEvent.click(form.getByLabelText(text('lngTerms.bid.physicalSuppliersOnly')));
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirm Trade' }));

        await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(1));
        expect(mocks.initiate).toHaveBeenCalledWith(expect.objectContaining({
            order_id: 'bio-lng-ask',
            expected_terms_digest: 'terms-digest-1',
            quantity_mt: 500,
            lng_terms: expect.objectContaining({
                side: 'BID', accepted_schemes: ['ISCC_EU'], accept_resellers: false,
            }),
        }));
        expect(await screen.findByRole('heading', { name: text('marketplace.modal.tradeInitiated') })).toBeTruthy();
    });

    it('reports an incompatible take without inventing a trade', async () => {
        mocks.initiate.mockRejectedValueOnce(new ApiError('Terms mismatch', 409, 'LNG_TERMS_INCOMPATIBLE'));
        await renderMarketplace('BUYER');
        fireEvent.click(await screen.findByRole('button', { name: 'Lift Ask' }));
        await screen.findByRole('form', { name: text('marketplace.bioLng.takerTerms') });
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirm Trade' }));

        expect(await screen.findByText(text('marketplace.bioLng.incompatible'))).toBeTruthy();
        expect(mocks.initiate).toHaveBeenCalledTimes(1);
        // An incompatible order is not a stale one: no refresh retry is offered.
        expect(screen.queryByRole('button', { name: new RegExp(text('marketplace.modal.refreshReview'), 'i') })).toBeNull();
    });

    it('keeps the MSDS declaration required when a supplier declares the ask side', async () => {
        await renderMarketplace('SUPPLIER');
        fireEvent.click(await screen.findByRole('button', { name: 'Hit Bid' }));
        const form = within(await screen.findByRole('form', { name: text('marketplace.bioLng.takerTerms') }));
        const fill = (label: string, value: string) => fireEvent.change(form.getByLabelText(label), { target: { value } });
        fill(text('lngTerms.field.certificateNumber'), 'ISCC-EU-002');
        fill(text('lngTerms.field.productionCountry'), 'NL');
        fill(text('lngTerms.field.bioShare'), '97');
        fill(text('lngTerms.field.wtt'), '-30');
        fill(text('lngTerms.field.supplierName'), 'Taker Supplier');
        expect((form.getByLabelText(text('lngTerms.ask.msdsAvailable')) as HTMLInputElement).required).toBe(true);

        // Without the acknowledgement the trade must not be submitted.
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        expect(mocks.initiate).not.toHaveBeenCalled();

        fireEvent.click(form.getByLabelText(text('lngTerms.ask.msdsAvailable')));
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirm Trade' }));

        await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(1));
        expect(mocks.initiate).toHaveBeenCalledWith(expect.objectContaining({
            order_id: 'bio-lng-bid',
            msds_available: true,
            lng_terms: expect.objectContaining({ side: 'ASK', production_country: 'NL' }),
        }));
    });
});
