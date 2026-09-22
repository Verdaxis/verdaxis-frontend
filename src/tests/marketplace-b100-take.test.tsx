import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Marketplace } from '../components/Marketplace';
import { ApiError } from '../services/api';
import type { FameOrderBidTerms, FameOrderPublicAskTerms } from '../types/fameOrder';
import i18n, { loadNamespace } from '../i18n';
import copy from '../locales/en/rfq.json';
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
vi.mock('../components/OrderPlaceModal', () => ({ OrderPlaceModal: () => null }));
vi.mock('../components/OrderBook', () => ({ OrderBook: () => null }));
vi.mock('../components/TradeTape', () => ({ TradeTape: () => null }));
vi.mock('../components/ui/Pagination', () => ({ Pagination: () => null }));
vi.mock('../services/api', async importOriginal => {
    const { ApiError } = await importOriginal<typeof import('../services/api')>();
    return { ApiError, api: {
    catalog: { products: mocks.products, deliveryPoints: mocks.deliveryPoints },
    orderbook: { listAsksPaged: mocks.listAsksPaged, listBidsPaged: mocks.listBidsPaged,
        listAsks: mocks.listAsks, listBids: mocks.listBids, productCounts: mocks.productCounts, myOrders: mocks.myOrders },
    trades: { initiate: mocks.initiate },
    compliance: { pricingOverlay: mocks.pricingOverlay },
} };
});

const bidTerms: FameOrderBidTerms = {
    side: 'BID', schema_version: 1, neat_fame: true, standard: 'EN_14214', standard_edition: '2012+A2:2019',
    sustainability_scheme: 'ISCC_EU', max_cfpp_c: 0, max_cloud_point_c: 2, max_ci_gco2e_mj: 18,
    ci_methodology: 'RED lifecycle calculation', ci_boundary: 'Well-to-wake', ci_basis: 'ACTUAL',
    require_quality_evidence: false, require_sustainability_evidence: false, evidence_due: 'BEFORE_LOADING',
};
const askTerms: FameOrderPublicAskTerms = {
    side: 'ASK', schema_version: 1, neat_fame: true, standard: 'EN_14214', standard_edition: '2012+A2:2019',
    sustainability_scheme: 'ISCC_EU', nomination_status: 'PENDING', uco_mass_pct: 100,
    cfpp_c: 0, cloud_point_c: 1, ci_gco2e_mj: 0, ci_methodology: 'RED lifecycle calculation',
    ci_boundary: 'Well-to-wake', ci_basis: 'ACTUAL', certificate_valid_until: '2099-12-31',
    evidence_status: 'PENDING', evidence_due: 'BEFORE_LOADING',
};
const orderCore = {
    product_id: 'ucome-product', product_name: 'UCOME B100', market_product: 'UCOME_B100', fuel_type: 'FAME', fuel_grade: 'UCOME',
    delivery_point_id: 'dp-1', delivery_point_name: 'Singapore', region: 'Asia', quantity_mt: 1000,
    remaining_quantity_mt: 750, price_per_mt_usd: 1095, availability_window: 'SPOT',
    certifications: ['ISCC EU'], certification_declared: true, is_verdaxis_verified: false,
    off_spec: false, status: 'OPEN', version: 1, created_at: '2026-09-22T04:00:00Z',
};
const bid = { ...orderCore, id: 'b100-bid', side: 'BID', fame_terms: bidTerms };
const ask = { ...orderCore, id: 'b100-ask', side: 'ASK', fame_terms: askTerms };
const t = (key: string) => i18n.t(key, { ns: 'trading' });

beforeEach(async () => {
    await loadNamespace('rfq');
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
    vi.resetAllMocks();
    localStorage.clear();
    mocks.role.current = 'BUYER';
    mocks.products.mockResolvedValue([{ id: 'ucome-product', name: 'UCOME B100', market_product: 'UCOME_B100',
        fuel_type: 'FAME', fuel_grade: 'UCOME', min_lot_size: 1, unit: 'MT', execution_mode: 'ORDERBOOK', is_active: true, available_delivery_point_ids: ['dp-1'] }]);
    mocks.deliveryPoints.mockResolvedValue([{ id: 'dp-1', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true }]);
    mocks.listAsksPaged.mockResolvedValue({ items: [ask], total: 1, skip: 0, limit: 20 });
    mocks.listBidsPaged.mockResolvedValue({ items: [bid], total: 1, skip: 0, limit: 20 });
    mocks.listAsks.mockResolvedValue([ask]);
    mocks.listBids.mockResolvedValue([bid]);
    mocks.productCounts.mockResolvedValue({ counts: { UCOME_B100: 1 }, total: 1 });
    mocks.myOrders.mockResolvedValue([]);
    mocks.initiate.mockResolvedValue({ status: 'PENDING_CONFIRMATION' });
    mocks.pricingOverlay.mockResolvedValue({ overlays: {}, assumptions: null });
});

async function openTake(role: 'BUYER' | 'SUPPLIER') {
    mocks.role.current = role;
    renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=UCOME_B100' });
    fireEvent.click(await screen.findByRole('button', { name: role === 'BUYER' ? 'Lift Ask' : 'Hit Bid' }));
    return within(await screen.findByRole('form', { name: t('marketplace.b100.takerTerms') }));
}
function choose(form: ReturnType<typeof within>, label: string, option: string) {
    fireEvent.click(form.getByRole('combobox', { name: label }));
    fireEvent.click(screen.getByRole('option', { name: option }));
}
function fill(form: ReturnType<typeof within>, label: string, value: string) {
    fireEvent.change(form.getByLabelText(label), { target: { value } });
}

describe('Marketplace B100 standard take flow', () => {
    it('submits a supplier declaration against a BID only after both sides are reviewed and confirmed', async () => {
        let resolveTrade!: (result: { status: string }) => void;
        mocks.initiate.mockImplementation(() => new Promise(resolve => { resolveTrade = resolve; }));
        const form = await openTake('SUPPLIER');
        fill(form, copy.form.standardEdition, '2012+A2:2019');
        fill(form, copy.form.cfpp, '0');
        fill(form, copy.declaration.cloudPoint, '1');
        fill(form, copy.form.ci, '0');
        fill(form, copy.form.ciMethodology, 'RED lifecycle calculation');
        fill(form, copy.declaration.ciBoundary, 'Well-to-wake');
        choose(form, copy.declaration.ciBasis, copy.declaration.ciBasisOptions.ACTUAL);
        choose(form, copy.declaration.nomination, copy.declaration.nominationOptions.IDENTIFIED);
        fill(form, copy.form.batchReference, 'BATCH-TAKER-1');
        fill(form, copy.form.producingSite, 'Site A');
        fill(form, copy.form.productionOrigin, 'Malaysia');
        fill(form, copy.form.feedstockOrigin, 'Malaysia');
        fill(form, copy.form.shippingLocation, 'Singapore');
        fill(form, copy.form.certificateReference, 'CERT-TAKER-1');
        fill(form, copy.form.certificateHolder, 'Taker Supplier');
        fill(form, copy.form.certificateValidUntil, '2099-12-31');
        fireEvent.click(form.getByRole('checkbox', { name: copy.orderFields.neatDeclaration }));
        fireEvent.click(form.getByRole('checkbox', { name: copy.orderFields.certificationDeclared }));
        fireEvent.click(form.getByRole('checkbox', { name: copy.orderFields.msdsAvailable }));
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));

        expect(mocks.initiate).not.toHaveBeenCalled();
        const source = screen.getByText(t('marketplace.b100.orderTerms')).closest('details')!;
        expect(within(source).getByText('18 gCO₂e/MJ')).toBeTruthy();
        expect(within(source).getByText(/2012\+A2:2019/)).toBeTruthy();
        const review = screen.getByRole('heading', { name: t('marketplace.b100.takerTerms') }).closest('section')!;
        expect(within(review).getByText('BATCH-TAKER-1')).toBeTruthy();
        expect(within(review).getByText('0 gCO₂e/MJ')).toBeTruthy();
        expect(screen.queryByRole('form', { name: t('marketplace.b100.takerTerms') })).toBeNull();
        expect(screen.getByText(t('marketplace.b100.reviewTerms'))).toBeTruthy();

        const confirm = screen.getByRole('button', { name: 'Confirm Trade' });
        fireEvent.click(confirm);
        fireEvent.click(confirm);
        await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(1));
        expect(mocks.initiate).toHaveBeenCalledWith(expect.objectContaining({
            order_id: 'b100-bid', expected_order_version: 1, quantity_mt: 750, idempotency_key: expect.any(String),
            certification_declared: true, msds_available: true,
            fame_terms: expect.objectContaining({
                side: 'ASK', neat_fame: true, uco_mass_pct: 100, nomination_status: 'IDENTIFIED',
                standard: 'EN_14214', standard_edition: '2012+A2:2019', sustainability_scheme: 'ISCC_EU',
                batch_reference: 'BATCH-TAKER-1', certificate_reference: 'CERT-TAKER-1',
                cfpp_c: 0, cloud_point_c: 1, ci_gco2e_mj: 0, ci_methodology: 'RED lifecycle calculation',
                ci_boundary: 'Well-to-wake', ci_basis: 'ACTUAL', evidence_due: 'BEFORE_LOADING',
            }),
        }));
        await act(async () => { resolveTrade({ status: 'PENDING_CONFIRMATION' }); });
        expect(await screen.findByRole('heading', { name: t('marketplace.modal.tradeInitiated') })).toBeTruthy();
    });

    it('requires all CI context before a buyer can review and submit a zero CI limit', async () => {
        const form = await openTake('BUYER');
        fill(form, copy.form.maxCi, '0');
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        expect((form.getByLabelText(copy.form.ciMethodology) as HTMLInputElement).validity.valueMissing).toBe(true);
        expect(mocks.initiate).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: 'Confirm Trade' })).toBeNull();

        fill(form, copy.form.ciMethodology, 'RED lifecycle calculation');
        fill(form, copy.declaration.ciBoundary, 'Well-to-wake');
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        expect((await screen.findByRole('alert')).textContent).toBe(copy.validation.ciContext);
        expect(mocks.initiate).not.toHaveBeenCalled();
        choose(form, copy.declaration.ciBasis, copy.declaration.ciBasisOptions.ACTUAL);
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        expect(mocks.initiate).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Confirm Trade' }));
        await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(1));
        expect(mocks.initiate).toHaveBeenCalledWith(expect.objectContaining({
            order_id: 'b100-ask', expected_order_version: 1,
            fame_terms: expect.objectContaining({ side: 'BID', max_ci_gco2e_mj: 0,
                ci_methodology: 'RED lifecycle calculation', ci_boundary: 'Well-to-wake', ci_basis: 'ACTUAL' }),
        }));
        expect(mocks.initiate.mock.calls[0][0]).not.toHaveProperty('certification_declared');
        expect(mocks.initiate.mock.calls[0][0]).not.toHaveProperty('msds_available');
    });

    it('requires a fresh review after a stale order response instead of retrying the old terms', async () => {
        mocks.initiate.mockRejectedValueOnce(new ApiError('Order version changed', 409, 'ORDER_VERSION_CONFLICT'))
            .mockResolvedValueOnce({ status: 'PENDING_CONFIRMATION' });
        await openTake('BUYER');
        const listingCallsBeforeTrade = mocks.listAsksPaged.mock.calls.length;
        mocks.listAsksPaged.mockResolvedValue({
            items: [{ ...ask, version: 2, remaining_quantity_mt: 500,
                fame_terms: { ...askTerms, standard_edition: 'Updated edition 2026' } }],
            total: 1, skip: 0, limit: 20,
        });
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirm Trade' }));

        const message = 'This order changed. Refresh and review its current fuel terms before submitting again.';
        expect(await screen.findByText(message)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /retry safely/i })).toBeNull();
        expect(mocks.initiate).toHaveBeenCalledTimes(1);
        expect(mocks.initiate.mock.calls[0][0]).toEqual(expect.objectContaining({ expected_order_version: 1 }));
        expect(mocks.listAsksPaged).toHaveBeenCalledTimes(listingCallsBeforeTrade);

        fireEvent.click(screen.getByRole('button', { name: 'Refresh and review' }));
        await waitFor(() => expect(mocks.listAsksPaged).toHaveBeenCalledTimes(listingCallsBeforeTrade + 1));
        expect(screen.queryByText(message)).toBeNull();
        expect(screen.queryByRole('button', { name: 'Confirm Trade' })).toBeNull();
        expect(screen.queryByRole('form', { name: t('marketplace.b100.takerTerms') })).toBeNull();
        expect(mocks.initiate).toHaveBeenCalledTimes(1);

        fireEvent.click(await screen.findByRole('button', { name: 'Lift Ask' }));
        const revisedForm = within(await screen.findByRole('form', { name: t('marketplace.b100.takerTerms') }));
        expect(revisedForm.getByLabelText(copy.form.standardEdition)).toHaveProperty('value', 'Updated edition 2026');
        expect(mocks.initiate).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        expect(mocks.initiate).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Confirm Trade' }));
        await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(2));
        expect(mocks.initiate.mock.calls[1][0]).toEqual(expect.objectContaining({
            expected_order_version: 2, quantity_mt: 500,
            fame_terms: expect.objectContaining({ standard_edition: 'Updated edition 2026' }),
        }));
        expect(mocks.initiate.mock.calls[1][0].idempotency_key).not.toBe(mocks.initiate.mock.calls[0][0].idempotency_key);
    });

    it('blocks review when a B100 order is missing its current version', async () => {
        mocks.listAsksPaged.mockResolvedValue({ items: [{ ...ask, version: undefined }], total: 1, skip: 0, limit: 20 });
        await openTake('BUYER');
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        expect((await screen.findByRole('alert')).textContent).toBe('This order is missing current fuel terms or a version. Refresh the market before trading.');
        expect(screen.queryByRole('button', { name: 'Confirm Trade' })).toBeNull();
        expect(mocks.initiate).not.toHaveBeenCalled();
    });

    it.each(['BUYER', 'SUPPLIER'] as const)('blocks %s take actions when the catalog still declares RFQ_ONLY', async role => {
        mocks.role.current = role;
        mocks.products.mockResolvedValue([{ id: 'ucome-product', market_product: 'UCOME_B100', execution_mode: 'RFQ_ONLY', is_active: true, available_delivery_point_ids: ['dp-1'] }]);
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=UCOME_B100' });
        expect(await screen.findByText(t('marketplace.b100.catalogUnavailable'))).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Lift Ask' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Hit Bid' })).toBeNull();
        expect(screen.queryByRole('form', { name: t('marketplace.b100.takerTerms') })).toBeNull();
        expect(mocks.initiate).not.toHaveBeenCalled();
    });
});
