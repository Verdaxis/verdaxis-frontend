import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../tests/test-utils';
import { SupplierOffersWorkspace } from '../SupplierOffersWorkspace';
import { mapSupplierOfferResponse, SUPPLIER_OFFERS_CHANGED_EVENT } from '../../../services/fameSupplierOffer';
import { ApiError } from '../../../services/api';

const control = vi.hoisted(() => ({
    user: { id: 'buyer', role: 'BUYER', organization_id: 'buyer-org' },
    products: vi.fn(), list: vi.fn(), my: vi.fn(), withdraw: vi.fn(),
    request: vi.fn(), edit: vi.fn(), post: vi.fn(),
}));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: control.user }) }));
vi.mock('../../../hooks/useDashboardContentReady', () => ({ useDashboardContentReady: vi.fn() }));
vi.mock('../../../services/api', () => ({
    ApiError: class ApiError extends Error { constructor(message: string, public status: number) { super(message); } },
    api: { catalog: { products: control.products }, supplierOffers: { list: control.list, my: control.my, withdraw: control.withdraw } },
}));
vi.mock('../SupplierOfferDetails', () => ({ SupplierOfferDetails: ({ offer }: { offer: { id: string } }) => <div>Offer details {offer.id}</div> }));

function offer(overrides: Record<string, unknown> = {}) {
    return mapSupplierOfferResponse({
        id: 'offer-1', product_id: 'ucome', delivery_point_id: 'sg', delivery_point_name: 'Singapore',
        quantity_mt: '2500', min_fill_mt: '500', price_per_mt_usd: '1150', availability_window: 'SPOT',
        delivery_basis: 'EX_TANK', named_location: 'Singapore terminal', delivery_start: '2027-01-01', delivery_end: '2027-01-07',
        quantity_tolerance_pct: '0', payment_terms: null, inspection_terms: null, title_risk_terms: null, claims_terms: null,
        evidence_due: 'BEFORE_LOADING', expires_at: new Date(Date.now() + 86_400_000).toISOString(), fuel_terms: {},
        status: 'OPEN', revision: 3, can_request_quote: true, can_edit: false, can_withdraw: false,
        ...overrides,
    });
}
const result = (items = [offer()], total = items.length) => ({ items, total, skip: 0, limit: 20 });
const workspace = (mine = false) => <SupplierOffersWorkspace mine={mine} onRequestQuote={control.request} onEdit={control.edit} onPostSupply={control.post} />;

beforeEach(() => {
    vi.clearAllMocks();
    control.user = { id: 'buyer', role: 'BUYER', organization_id: 'buyer-org' };
    control.products.mockResolvedValue([{ id: 'ucome', is_active: true, market_product: 'UCOME_B100' }]);
    control.list.mockResolvedValue(result());
    control.my.mockResolvedValue(result([offer({ can_request_quote: false, can_edit: true, can_withdraw: true })]));
    control.withdraw.mockResolvedValue(offer({ status: 'WITHDRAWN', revision: 4 }));
});

describe('B100 supplier offers in Marketplace', () => {
    it('shows indicative supply and requests a quote from the displayed offer revision', async () => {
        renderWithProviders(workspace());
        const request = await screen.findByRole('button', { name: 'Request quote' });
        expect(control.list).toHaveBeenCalledWith({ product_id: 'ucome', skip: 0, limit: 20, sort_by: 'newest' });
        expect(screen.getByText('Indicative USD/MT')).toBeTruthy();
        expect(screen.getByText(/not reserved stock/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Lift Ask|Hit Bid|Accept/i })).toBeNull();
        fireEvent.click(request);
        expect(control.request).toHaveBeenCalledWith(expect.objectContaining({ id: 'offer-1', revision: 3 }));
    });

    it('honors the server request permission and locally elapsed expiry', async () => {
        control.list.mockResolvedValue(result([
            offer({ id: 'own-offer', can_request_quote: false }),
            offer({ id: 'expired', expires_at: new Date(Date.now() - 1000).toISOString() }),
        ]));
        renderWithProviders(workspace());
        await screen.findByText('Expired');
        expect(screen.queryByRole('button', { name: 'Request quote' })).toBeNull();
    });

    it('refreshes listings after a successful post from the global sidebar modal', async () => {
        control.list.mockResolvedValueOnce(result([]));
        renderWithProviders(workspace());
        await screen.findByText('No B100 supplier offers yet');
        act(() => window.dispatchEvent(new Event(SUPPLIER_OFFERS_CHANGED_EVENT)));
        await screen.findByRole('button', { name: 'Request quote' });
        expect(control.list).toHaveBeenCalledTimes(2);
    });

    it('keeps load errors distinct from an empty market and refreshes on demand', async () => {
        control.list.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        renderWithProviders(workspace());
        await screen.findByRole('alert');
        expect(screen.queryByText('No B100 supplier offers yet')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
        await screen.findByRole('button', { name: 'Request quote' });
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('uses My Listings permissions and locks withdrawal to the displayed revision', async () => {
        control.user = { id: 'supplier', role: 'SUPPLIER', organization_id: 'supplier-org' };
        let resolve!: (value: unknown) => void;
        control.withdraw.mockImplementation(() => new Promise((done) => { resolve = done; }));
        renderWithProviders(workspace(true));
        fireEvent.click(await screen.findByRole('button', { name: 'Revise' }));
        expect(control.edit).toHaveBeenCalledWith(expect.objectContaining({ id: 'offer-1', revision: 3 }));
        fireEvent.click(screen.getByRole('button', { name: 'Withdraw offer' }));
        const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: 'Withdraw offer' });
        fireEvent.click(confirm);
        fireEvent.click(confirm);
        expect(control.withdraw).toHaveBeenCalledTimes(1);
        expect(control.withdraw).toHaveBeenCalledWith('offer-1', { expected_revision: 3 });
        await act(async () => resolve(offer({ status: 'WITHDRAWN' })));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(control.list).not.toHaveBeenCalled();
    });

    it('explains stale revision errors without silently retrying a withdrawal', async () => {
        control.user.role = 'SUPPLIER';
        control.withdraw.mockRejectedValue(new ApiError('stale', 409));
        renderWithProviders(workspace(true));
        fireEvent.click(await screen.findByRole('button', { name: 'Withdraw offer' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Withdraw offer' }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'This offer changed while you were reviewing it. Select Refresh, review the latest revision, then try again.');
        expect(control.withdraw).toHaveBeenCalledTimes(1);
    });

    it('resets pagination and removes private rows when the organization scope changes', async () => {
        control.user.role = 'SUPPLIER';
        control.my.mockResolvedValue(result([offer({ id: 'private-offer', price_per_mt_usd: '1777', can_edit: true })], 21));
        const view = renderWithProviders(workspace(true));
        fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
        await waitFor(() => expect(control.my).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 20 })));
        control.user = { id: 'next-user', role: 'SUPPLIER', organization_id: 'next-org' };
        control.my.mockResolvedValue(result([]));
        view.rerender(workspace(true));
        await screen.findByText('No B100 listings yet');
        expect(control.my).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 0 }));
        expect(screen.queryByText('$1,777')).toBeNull();
    });

    it('returns to the final valid page when the last item on a later page disappears', async () => {
        control.list.mockResolvedValue(result([offer()], 21));
        renderWithProviders(workspace());
        fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
        await waitFor(() => expect(control.list).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 20 })));
        control.list.mockResolvedValueOnce(result([], 20)).mockResolvedValue(result([offer()], 20));
        act(() => window.dispatchEvent(new Event(SUPPLIER_OFFERS_CHANGED_EVENT)));
        await waitFor(() => expect(control.list).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 0 })));
        await screen.findByRole('button', { name: 'Request quote' });
        expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
    });
});
