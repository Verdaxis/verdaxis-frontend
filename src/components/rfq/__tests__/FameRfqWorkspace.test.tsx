import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../tests/test-utils';
import i18n, { loadNamespace } from '../../../i18n';
import { mapFameRfqResponse } from '../../../services/fameRfq';
import { FameRfqWorkspace } from '../FameRfqWorkspace';

const control = vi.hoisted(() => ({
    user: { id: 'buyer-user', role: 'BUYER', organization_id: 'buyer-org' },
    products: vi.fn(), points: vi.fn(), list: vi.fn(), get: vi.fn(),
    create: vi.fn(), quote: vi.fn(), revise: vi.fn(), withdraw: vi.fn(), cancel: vi.fn(),
}));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: control.user }) }));
vi.mock('../../../hooks/useDashboardContentReady', () => ({ useDashboardContentReady: () => undefined }));
vi.mock('../../../services/api', () => ({ api: {
    catalog: { products: control.products, deliveryPoints: control.points },
    rfq: { list: control.list, get: control.get, create: control.create, quote: control.quote, revise: control.revise, withdraw: control.withdraw, cancel: control.cancel },
} }));
vi.mock('../FameRfqForms', () => ({
    FameRequestForm: () => <div>Request form</div>,
    FameQuoteForm: ({ onSubmit }: { onSubmit: (input: unknown) => void }) => <button onClick={() => onSubmit({ price_per_mt_usd: 1125 })}>Save revision</button>,
}));

const future = () => new Date(Date.now() + 86_400_000).toISOString();
const request = () => mapFameRfqResponse({
    id: 'rfq-12345678', buyer_org_id: 'buyer-org', buyer_org_name: 'Buyer Ltd', product_id: 'ucome',
    quantity_mt: '1000', status: 'QUOTED', expires_at: future(), created_at: new Date().toISOString(),
    can_cancel: true, execution_enabled: false,
    contract_terms: {
        schema_version: 1, neat_fame: true, standard: 'EN_14214', standard_edition: '2025',
        delivery_basis: 'EX_TANK', named_location: 'Singapore terminal', delivery_start: '2026-12-01', delivery_end: '2026-12-02',
        quantity_tolerance_pct: '0', min_fill_mt: '1000', sustainability_scheme: 'ISCC_EU', evidence_due: 'BEFORE_LOADING',
        payment_terms: 'On invoice', inspection_terms: 'Independent lab', title_risk_terms: 'On loading', claims_terms: 'Seven days',
    },
    quotes: [{
        id: 'quote-1', seller_org_id: 'seller-org', seller_org_name: 'Seller Ltd', price_per_mt_usd: '1100',
        status: 'PENDING', expires_at: future(), revision: 3,
        offer_terms: { evidence_status: 'DECLARED', ci_gco2e_mj: null, lhv_mj_kg: '37.2', document_references: [] },
    }],
});

beforeAll(async () => { await i18n.changeLanguage('en'); await loadNamespace('rfq'); });
beforeEach(() => {
    vi.clearAllMocks();
    control.user = { id: 'buyer-user', role: 'BUYER', organization_id: 'buyer-org' };
    control.products.mockResolvedValue([{ id: 'ucome', market_product: 'UCOME_B100', is_active: true, available_delivery_point_ids: ['singapore'] }]);
    control.points.mockResolvedValue([{ id: 'singapore', name: 'Singapore', is_active: true }]);
    control.list.mockResolvedValue({ items: [request()], total: 1 });
    control.get.mockResolvedValue(request());
    control.cancel.mockResolvedValue(undefined);
    control.revise.mockResolvedValue(undefined);
    control.withdraw.mockResolvedValue(undefined);
});

async function renderLoaded() {
    renderWithProviders(<FameRfqWorkspace />);
    await screen.findByRole('heading', { name: 'Contract requirements' });
}

describe('UCOME RFQ workspace', () => {
    it('keeps list failures distinct from a missing catalog and allows a real retry', async () => {
        control.list.mockRejectedValueOnce(new Error('Server failure'));
        renderWithProviders(<FameRfqWorkspace />);
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Could not load requests. Select Refresh to try again.');
        expect(screen.queryByText('The Singapore UCOME B100 pilot is not available in the current catalog.')).toBeNull();
        expect(screen.queryByText('No B100 requests yet. Published requests will appear here.')).toBeNull();
        expect(screen.getByRole('button', { name: 'Create request' })).toHaveProperty('disabled', true);
        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
        expect(await screen.findByRole('heading', { name: 'Contract requirements' })).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('localizes anonymous buyer cards in Chinese without changing the owner display', async () => {
        control.user = { id: 'supplier-user', role: 'SUPPLIER', organization_id: 'seller-org' };
        control.list.mockResolvedValue({ items: [{ ...request(), isAnonymous: true, buyerOrgId: null, buyerOrgName: 'Anonymous' }], total: 1 });
        await i18n.changeLanguage('zh');
        const view = renderWithProviders(<FameRfqWorkspace />);
        expect(await screen.findByText('匿名买方')).toBeTruthy();
        expect(screen.queryByText('Anonymous')).toBeNull();
        view.unmount();
        await i18n.changeLanguage('en');

        control.user = { id: 'buyer-user', role: 'BUYER', organization_id: 'buyer-org' };
        control.list.mockResolvedValue({ items: [{ ...request(), isAnonymous: true }], total: 1 });
        await renderLoaded();
        expect(screen.getByText('Buyer Ltd')).toBeTruthy();
    });

    it('compares declared energy prices and keeps unknown CI distinct from zero without an acceptance action', async () => {
        await renderLoaded();
        expect(control.list).toHaveBeenCalledWith({ product_id: 'ucome', skip: 0, limit: 20 });
        const row = screen.getByRole('row', { name: /Seller Ltd/ });
        expect(within(row).getByText('$29.57')).toBeTruthy();
        expect(within(row).getByText('Not supplied')).toBeTruthy();
        expect(within(row).getByText('Declared')).toBeTruthy();
        expect(screen.getByText(/do not create a trade or reserve inventory/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /accept/i })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Submit quote' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Cancel request' })).toBeTruthy();
    });

    it('uses server cancellation permission instead of organization membership', async () => {
        control.get.mockResolvedValue({ ...request(), canCancel: false });
        await renderLoaded();
        expect(screen.queryByRole('button', { name: 'Cancel request' })).toBeNull();
    });

    it('keeps administrators read-only', async () => {
        control.user.role = 'ADMIN';
        await renderLoaded();
        expect(screen.getByText(/Administrator view/)).toBeTruthy();
        for (const name of ['Create request', 'Submit quote', 'Revise quote', 'Cancel request', 'Withdraw quote']) {
            expect(screen.queryByRole('button', { name })).toBeNull();
        }
    });

    it('passes the loaded revision when a supplier revises its quote', async () => {
        control.user = { id: 'supplier-user', role: 'SUPPLIER', organization_id: 'seller-org' };
        await renderLoaded();
        fireEvent.click(screen.getByRole('button', { name: 'Revise quote' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save revision' }));
        await waitFor(() => expect(control.revise).toHaveBeenCalledWith('rfq-12345678', 'quote-1', { price_per_mt_usd: 1125, expected_revision: 3 }));
        expect(control.quote).not.toHaveBeenCalled();
    });

    it('lets suppliers withdraw their own historical quote without reopening the request', async () => {
        control.user = { id: 'supplier-user', role: 'SUPPLIER', organization_id: 'seller-org' };
        control.get.mockResolvedValue({ ...request(), status: 'EXPIRED', expiresAt: new Date(Date.now() - 1000).toISOString() });
        await renderLoaded();
        expect(screen.queryByRole('button', { name: 'Revise quote' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Withdraw quote' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Withdraw quote' }));
        await waitFor(() => expect(control.withdraw).toHaveBeenCalledWith('rfq-12345678', 'quote-1'));
    });

    it('blocks duplicate cancellation writes while a request is pending', async () => {
        let resolve!: () => void;
        control.cancel.mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
        await renderLoaded();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
        const dialog = await screen.findByRole('dialog');
        const button = within(dialog).getByRole('button', { name: 'Cancel request' });
        fireEvent.click(button);
        fireEvent.click(button);
        expect(control.cancel).toHaveBeenCalledTimes(1);
        await act(async () => resolve());
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('shows the empty state without invented quotes or suppliers', async () => {
        control.list.mockResolvedValue({ items: [], total: 0 });
        renderWithProviders(<FameRfqWorkspace />);
        expect(await screen.findByText('No B100 requests yet. Published requests will appear here.')).toBeTruthy();
        expect(control.get).not.toHaveBeenCalled();
        expect(screen.queryByRole('table')).toBeNull();
    });
});
