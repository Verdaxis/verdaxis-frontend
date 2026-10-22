import React from 'react';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryObserver, onlineManager } from '@tanstack/react-query';

import { Marketplace } from '../components/Marketplace';
import type { TFunction } from 'i18next';
import type { OrderBookOrder } from '../types';
import { useTakeTrade } from '../features/marketplace/hooks/useTakeTrade';
import { QueryProvider } from '../lib/query/QueryProvider';
import { ApiError, ApiOutcomeUnknownError } from '../services/api';
import { clearAccessToken, getAuthGeneration, setAccessToken } from '../services/authToken';
import { clearMarketSupportContextId, setMarketSupportContextId } from '../services/marketSupportContextStore';
import { attachQueryInvalidation } from '../lib/query/invalidation';
import { createQueryClient } from '../lib/query/client';
import { invalidateReadCacheWithCause, subscribeReadInvalidations } from '../services/readCache';
import { queuePublicMarketRefresh } from '../services/publicMarketSync';
import { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';

const mocks = vi.hoisted(() => ({
    user: { current: { id: 'user-a', organization_id: 'org-a', role: 'BUYER' } as
        { id: string; organization_id: string; role: 'BUYER' | 'SUPPLIER' } | null },
    support: { active: false, current: null as { id: string } | null },
    products: vi.fn(), deliveryPoints: vi.fn(), listAsksPaged: vi.fn(), listBidsPaged: vi.fn(),
    listAsks: vi.fn(), listBids: vi.fn(), productCounts: vi.fn(), myOrders: vi.fn(),
    initiate: vi.fn(), cancel: vi.fn(), pricingOverlay: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user.current }) }));
vi.mock('../context/MarketSupportContext', () => ({
    useMarketSupport: () => ({ isActive: mocks.support.active, context: mocks.support.current }),
}));
vi.mock('../hooks/useWatchlist', () => ({
    useWatchlist: () => ({ trackedSliceKeys: new Set(), pinnedOrderIds: new Set(), toggleSlice: vi.fn(), togglePin: vi.fn() }),
}));
vi.mock('../components/OrderPlaceModal', () => ({ OrderPlaceModal: () => null }));
vi.mock('../components/OrderBook', () => ({ OrderBook: () => null }));
vi.mock('../components/TradeTape', () => ({ TradeTape: () => null }));
vi.mock('../components/ui/Pagination', () => ({ Pagination: () => null }));
vi.mock('../services/api', async importOriginal => {
    const actual = await importOriginal<typeof import('../services/api')>();
    return { ApiError: actual.ApiError, ApiOutcomeUnknownError: actual.ApiOutcomeUnknownError,
        isKycRequiredError: actual.isKycRequiredError, api: {
            catalog: { products: mocks.products, deliveryPoints: mocks.deliveryPoints },
            orderbook: {
                listAsksPaged: mocks.listAsksPaged, listBidsPaged: mocks.listBidsPaged,
                listAsks: mocks.listAsks, listBids: mocks.listBids,
                productCounts: mocks.productCounts, myOrders: mocks.myOrders, cancel: mocks.cancel,
            },
            trades: { initiate: mocks.initiate },
            compliance: { pricingOverlay: mocks.pricingOverlay },
        } };
});

const ask = {
    id: 'b30-ask', side: 'ASK', market_product: 'B30', product_id: 'prod-b30',
    product_name: 'Mutation B30', fuel_type: 'Biofuel', fuel_grade: 'B30',
    delivery_point_id: 'dp-sg', delivery_point_name: 'Singapore', region: 'Asia',
    quantity_mt: 1000, remaining_quantity_mt: 500, price_per_mt_usd: 915,
    availability_window: 'SPOT', certifications: ['ISCC EU'], certification_declared: true,
    is_verdaxis_verified: false, is_demo_listing: false, off_spec: false, status: 'OPEN',
    version: 1, terms_digest: 'terms-digest-1', created_at: '2026-09-22T04:00:00Z',
};
const ownOrder = {
    ...ask, id: 'own-1', side: 'BID', delivery_point_name: 'Cancel Harbour',
    etag: '"v7"', creation_method: 'USER', remaining_quantity_mt: 400,
};
const tradeResult = {
    status: 'PENDING_CONFIRMATION', product_name: 'Mutation B30', market_product: 'B30', fuel_type: 'Biofuel',
    delivery_point_name: 'Singapore', region: 'Asia', quantity_mt: 500, price_per_mt_usd: 915,
};
const PRODUCT_CATALOG = [{ id: 'prod-b30', name: 'B30', market_product: 'B30', fuel_type: 'Biofuel',
    fuel_grade: 'B30', min_lot_size: 200, unit: 'MT', execution_mode: 'ORDERBOOK', is_active: true }];

beforeEach(async () => {
    await loadNamespace('trading');
    await loadNamespace('rfq');
    vi.resetAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mocks.user.current = { id: 'user-a', organization_id: 'org-a', role: 'BUYER' };
    mocks.support.active = false;
    mocks.support.current = null;
    mocks.products.mockResolvedValue(PRODUCT_CATALOG);
    mocks.deliveryPoints.mockResolvedValue([{ id: 'dp-sg', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true }]);
    mocks.listAsksPaged.mockResolvedValue({ items: [ask], total: 1, skip: 0, limit: 8 });
    mocks.listBidsPaged.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 8 });
    mocks.listAsks.mockResolvedValue([ask]);
    mocks.listBids.mockResolvedValue([]);
    mocks.productCounts.mockResolvedValue({ counts: { B30: 1 }, total: 1 });
    mocks.myOrders.mockResolvedValue([]);
    mocks.initiate.mockResolvedValue(tradeResult);
    mocks.cancel.mockResolvedValue(undefined);
    mocks.pricingOverlay.mockResolvedValue({ overlays: {}, assumptions: null });
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    onlineManager.setOnline(true);
});

async function openTradeAndConfirm() {
    fireEvent.click(await screen.findByRole('button', { name: 'Lift Ask' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Trade' }));
}

async function openMyListingsRow() {
    fireEvent.click(await screen.findByRole('button', { name: /my listings/i }));
    const row = (await screen.findByText('Cancel Harbour')).closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: /cancel/i }));
    return row;
}

async function confirmCancellation(reason = 'Stop this listing') {
    const field = screen.getByRole('textbox', { name: /cancellation reason/i });
    fireEvent.change(field, { target: { value: reason } });
    fireEvent.click(screen.getByRole('button', { name: /cancel listing/i }));
}

describe('Marketplace take execution', () => {
    it('sends one trade POST when the final confirm is clicked twice', async () => {
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        fireEvent.click(await screen.findByRole('button', { name: 'Lift Ask' }));
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        const confirm = await screen.findByRole('button', { name: 'Confirm Trade' });
        fireEvent.click(confirm);
        fireEvent.click(confirm);
        await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(1));
    });

    it('does not automatically retry an unknown trade outcome', async () => {
        mocks.initiate.mockRejectedValueOnce(new ApiOutcomeUnknownError('timeout'));
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openTradeAndConfirm();
        expect(await screen.findByRole('button', { name: /retry safely/i })).toBeTruthy();
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
        expect(mocks.initiate).toHaveBeenCalledTimes(1);
    });

    it('retries an unknown trade with the frozen payload and idempotency key', async () => {
        mocks.initiate.mockRejectedValueOnce(new ApiOutcomeUnknownError('timeout')).mockResolvedValueOnce(tradeResult);
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openTradeAndConfirm();
        const first = mocks.initiate.mock.calls[0][0];
        fireEvent.click(await screen.findByRole('button', { name: /retry safely/i }));
        await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(2));
        expect(mocks.initiate.mock.calls[1][0]).toEqual(first);
        expect(mocks.initiate.mock.calls[1][0].idempotency_key).toBe(first.idempotency_key);
    });

    it('keeps the reviewed trade request when quantity changes before an explicit retry', async () => {
        mocks.initiate.mockRejectedValueOnce(new ApiOutcomeUnknownError('timeout')).mockResolvedValueOnce(tradeResult);
        const client = createQueryClient();
        const t = ((key: string) => key) as TFunction;
        const hook = renderHook(() => useTakeTrade({ userId: 'user-a', organizationId: 'org-a',
            isMarketSupportActive: false, isHistorySelected: false, marketTab: 'market',
            b100TradingEnabled: false, bioLngTradingEnabled: false, t, tRfq: t,
            fetchProductCounts: vi.fn(), fetchListings: vi.fn(), currentSkip: 0, prefillAskOrder: vi.fn(),
        }), { wrapper: ({ children }) => <QueryProvider client={client}>{children}</QueryProvider> });
        try {
            act(() => hook.result.current.openTradeModal(ask as OrderBookOrder));
            act(() => hook.result.current.reviewTrade());
            await act(async () => { await hook.result.current.confirmTrade(); });
            const first = structuredClone(mocks.initiate.mock.calls[0][0]);
            act(() => hook.result.current.setTradeQuantity(200));
            await act(async () => { await hook.result.current.confirmTrade(); });
            expect(mocks.initiate).toHaveBeenCalledTimes(2);
            expect(mocks.initiate.mock.calls[1][0]).toEqual(first);
            expect(first.quantity_mt).toBe(500);
        } finally { hook.unmount(); client.clear(); }
    });

    it('keeps the current view after a pending take enters support A then support B', async () => {
        let finish!: (value: typeof tradeResult) => void;
        mocks.initiate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const client = createQueryClient();
        const t = ((key: string) => key) as TFunction;
        const hook = renderHook(() => useTakeTrade({ userId: 'user-a', organizationId: 'org-a',
            isMarketSupportActive: mocks.support.active, isHistorySelected: false, marketTab: 'market',
            b100TradingEnabled: false, bioLngTradingEnabled: false, t, tRfq: t,
            fetchProductCounts: vi.fn(), fetchListings: vi.fn(), currentSkip: 0, prefillAskOrder: vi.fn(),
        }), { wrapper: ({ children }) => <QueryProvider client={client}>{children}</QueryProvider> });
        try {
            act(() => hook.result.current.openTradeModal(ask as OrderBookOrder));
            act(() => hook.result.current.reviewTrade());
            let pending!: Promise<void>;
            act(() => { pending = hook.result.current.confirmTrade(); });
            await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(1));
            mocks.support.active = true;
            mocks.support.current = { id: 'support-a' };
            setMarketSupportContextId('support-a');
            hook.rerender();
            mocks.support.current = { id: 'support-b' };
            setMarketSupportContextId('support-b');
            hook.rerender();
            const demoOrder = { ...ask, id: 'demo-b', is_demo_listing: true } as OrderBookOrder;
            act(() => hook.result.current.openTradeModal(demoOrder));
            expect(hook.result.current.tradeState).toBe('confirming');
            await act(async () => { finish(tradeResult); await pending; });
            expect(hook.result.current.selectedOrder?.id).toBe('demo-b');
            expect(hook.result.current.tradeState).toBe('confirming');
            expect(hook.result.current.tradeResult).toBeNull();
            expect(mocks.initiate).toHaveBeenCalledTimes(1);
        } finally { hook.unmount(); client.clear(); }
    });

    it('blocks a trade retry after the auth generation changes', async () => {
        mocks.initiate.mockRejectedValueOnce(new ApiOutcomeUnknownError('timeout'));
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openTradeAndConfirm();
        const retry = await screen.findByRole('button', { name: /retry safely/i });
        setAccessToken(`rotated-${getAuthGeneration() + 1}`);
        fireEvent.click(retry);
        expect(await screen.findByText(/assisted trading context changed/i)).toBeTruthy();
        expect(mocks.initiate).toHaveBeenCalledTimes(1);
    });

    it('reports an error when the request cannot be built', async () => {
        vi.stubGlobal('crypto', { randomUUID: () => { throw new Error('uuid unavailable'); } });
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openTradeAndConfirm();
        expect(await screen.findByText(/uuid unavailable/i)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /submitting/i })).toBeNull();
        expect(mocks.initiate).not.toHaveBeenCalled();
    });

    it('does not apply a late trade success to the next organization dialog', async () => {
        let resolveTrade!: (value: typeof tradeResult) => void;
        mocks.initiate.mockImplementationOnce(() => new Promise(resolve => { resolveTrade = resolve; }));
        const view = renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openTradeAndConfirm();
        await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(1));

        mocks.user.current = { id: 'user-a', organization_id: 'org-b', role: 'BUYER' };
        view.rerender(<Marketplace />);
        fireEvent.click(await screen.findByRole('button', { name: 'Lift Ask' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Submit Trade' }));
        expect(await screen.findByRole('button', { name: 'Confirm Trade' })).toBeTruthy();

        await act(async () => { resolveTrade(tradeResult); });
        expect(screen.queryByText('Trade Request Sent')).toBeNull();
        expect(screen.getByRole('button', { name: 'Confirm Trade' })).toBeTruthy();
    });

    it('closes the take dialog when the session is replaced before the result arrives', async () => {
        let resolveTrade!: (value: typeof tradeResult) => void;
        mocks.initiate.mockImplementationOnce(() => new Promise(resolve => { resolveTrade = resolve; }));
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openTradeAndConfirm();
        await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(1));

        // Same user and organization, new auth generation.
        setAccessToken(`replacement-${getAuthGeneration() + 1}`);
        await act(async () => { resolveTrade(tradeResult); });
        expect(screen.queryByText('Trade Request Sent')).toBeNull();
        expect(screen.queryByRole('button', { name: /submitting/i })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Confirm Trade' })).toBeNull();
    });

    it('sends the take at once while the browser reports offline', async () => {
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        fireEvent.click(await screen.findByRole('button', { name: 'Lift Ask' }));
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        const confirm = await screen.findByRole('button', { name: 'Confirm Trade' });
        act(() => { onlineManager.setOnline(false); });
        fireEvent.click(confirm);
        await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(1));
        expect(await screen.findByText('Trade Request Sent')).toBeTruthy();
    });

    it('requires a fresh review when an order has no terms digest', async () => {
        mocks.listAsksPaged.mockResolvedValue({ items: [{ ...ask, terms_digest: undefined }], total: 1, skip: 0, limit: 8 });
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        fireEvent.click(await screen.findByRole('button', { name: 'Lift Ask' }));
        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        expect(await screen.findByText(/does not include review data/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /refresh and review/i })).toBeTruthy();
        expect(mocks.initiate).not.toHaveBeenCalled();
    });

    it('blocks demo execution without sending a take', async () => {
        mocks.listAsksPaged.mockResolvedValue({ items: [{ ...ask, is_demo_listing: true }], total: 1, skip: 0, limit: 8 });
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        fireEvent.click(await screen.findByRole('button', { name: 'View demo' }));
        expect(await screen.findByText(/cannot be hit or lifted/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /trading disabled/i })).toHaveProperty('disabled', true);
        expect(screen.queryByRole('button', { name: 'Confirm Trade' })).toBeNull();
        expect(mocks.initiate).not.toHaveBeenCalled();
    });

    it('blocks execution when KYC is required and keeps the modal usable', async () => {
        mocks.initiate.mockRejectedValueOnce(new ApiError('KYC required', 403, 'KYC_REQUIRED'));
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openTradeAndConfirm();
        expect(await screen.findByText(/complete kyc verification to trade/i)).toBeTruthy();
        expect(mocks.initiate).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: /^cancel$/i })).toBeTruthy();
    });
});

describe('Marketplace cancellation execution', () => {
    beforeEach(() => { mocks.myOrders.mockResolvedValue([ownOrder]); });

    it('sends one cancel POST when the final confirm is clicked twice', async () => {
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openMyListingsRow();
        const field = screen.getByRole('textbox', { name: /cancellation reason/i });
        fireEvent.change(field, { target: { value: 'Stop this listing' } });
        const confirm = screen.getByRole('button', { name: /cancel listing/i });
        fireEvent.click(confirm);
        fireEvent.click(confirm);
        await waitFor(() => expect(mocks.cancel).toHaveBeenCalledTimes(1));
        expect(mocks.cancel).toHaveBeenCalledWith('own-1', expect.objectContaining({
            reason: 'Stop this listing', etag: '"v7"', idempotencyKey: expect.any(String),
        }));
    });

    it('sends the cancellation at once while the browser reports offline', async () => {
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openMyListingsRow();
        act(() => { onlineManager.setOnline(false); });
        await confirmCancellation();
        await waitFor(() => expect(mocks.cancel).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.queryByText('Cancel Harbour')).toBeNull());
    });

    it('does not automatically retry an unknown cancellation and keeps the row', async () => {
        mocks.cancel.mockRejectedValueOnce(new ApiOutcomeUnknownError('timeout'));
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openMyListingsRow();
        await confirmCancellation();
        expect(await screen.findByRole('button', { name: /retry safely with the same request/i })).toBeTruthy();
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
        expect(mocks.cancel).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Cancel Harbour')).toBeTruthy();
    });

    it('retries an unknown cancellation with the frozen reason, ETag, and key', async () => {
        mocks.cancel.mockRejectedValueOnce(new ApiOutcomeUnknownError('timeout')).mockResolvedValueOnce(undefined);
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openMyListingsRow();
        await confirmCancellation('  Stop this listing  ');
        const first = mocks.cancel.mock.calls[0];
        expect(first[1].reason).toBe('Stop this listing');
        fireEvent.click(await screen.findByRole('button', { name: /retry safely with the same request/i }));
        await waitFor(() => expect(mocks.cancel).toHaveBeenCalledTimes(2));
        expect(mocks.cancel.mock.calls[1]).toEqual(first);
    });

    it('blocks a cancellation retry after the auth generation changes', async () => {
        mocks.cancel.mockRejectedValueOnce(new ApiOutcomeUnknownError('timeout'));
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openMyListingsRow();
        await confirmCancellation();
        const retry = await screen.findByRole('button', { name: /retry safely with the same request/i });
        setAccessToken(`rotated-${getAuthGeneration() + 1}`);
        fireEvent.click(retry);
        expect(await screen.findByText(/account or assisted context changed/i)).toBeTruthy();
        expect(mocks.cancel).toHaveBeenCalledTimes(1);
        expect(await screen.findByText('Cancel Harbour')).toBeTruthy();
    });

    it('blocks a cancellation retry when support moves from A to B while active', async () => {
        mocks.support.active = true;
        mocks.support.current = { id: 'support-a' };
        setMarketSupportContextId('support-a');
        mocks.myOrders.mockResolvedValue([{ ...ownOrder, creation_method: 'MARKET_SUPPORT' }]);
        mocks.cancel.mockRejectedValueOnce(new ApiOutcomeUnknownError('timeout'));
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openMyListingsRow();
        await confirmCancellation();
        const retry = await screen.findByRole('button', { name: /retry safely with the same request/i });
        // The execution store changes before the provider accepts the new scope.
        setMarketSupportContextId('support-b');
        fireEvent.click(retry);
        expect(await screen.findByText(/account or assisted context changed/i)).toBeTruthy();
        expect(mocks.cancel).toHaveBeenCalledTimes(1);
    });

    it('keeps the current support dialog after a deferred cancellation success', async () => {
        mocks.support.active = true;
        mocks.support.current = { id: 'support-a' };
        setMarketSupportContextId('support-a');
        mocks.myOrders.mockResolvedValue([{ ...ownOrder, creation_method: 'MARKET_SUPPORT' }]);
        let finish!: () => void;
        mocks.cancel.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
        const view = renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openMyListingsRow();
        await confirmCancellation();
        await waitFor(() => expect(mocks.cancel).toHaveBeenCalledTimes(1));
        mocks.support.current = { id: 'support-b' };
        setMarketSupportContextId('support-b');
        view.rerender(<Marketplace />);
        await openMyListingsRow();
        await act(async () => { finish(); });
        expect(screen.getByText('Cancel Harbour')).toBeTruthy();
        expect(screen.getByRole('textbox', { name: /cancellation reason/i })).toBeTruthy();
        expect(mocks.cancel).toHaveBeenCalledTimes(1);
    });

    it.each([412, 428])('reloads owned orders when cancellation is stale (%i)', async status => {
        mocks.cancel.mockRejectedValueOnce(new ApiError('stale', status));
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openMyListingsRow();
        await waitFor(() => expect(mocks.myOrders).toHaveBeenCalledTimes(1));
        await confirmCancellation();
        await waitFor(() => expect(mocks.myOrders).toHaveBeenCalledTimes(2));
        expect(await screen.findByText(/listing changed before cancellation/i)).toBeTruthy();
    });

    it('removes the row only on a confirmed cancellation', async () => {
        mocks.cancel.mockResolvedValueOnce(undefined);
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openMyListingsRow();
        await confirmCancellation();
        await waitFor(() => expect(screen.queryByText('Cancel Harbour')).toBeNull());
        expect(mocks.myOrders).toHaveBeenCalledTimes(1);
    });

    it('reads my orders under the new private key when the session is replaced in place', async () => {
        mocks.myOrders.mockResolvedValue([ownOrder]);
        const view = renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        fireEvent.click(await screen.findByRole('button', { name: /my listings/i }));
        expect(await screen.findByText('Cancel Harbour')).toBeTruthy();
        expect(mocks.myOrders).toHaveBeenCalledTimes(1);

        // Same user and organization, new auth generation. The old private key
        // belongs to the replaced session and must not be read again.
        setAccessToken(`replacement-${getAuthGeneration() + 1}`);
        view.rerender(<Marketplace />);
        fireEvent.click(await screen.findByRole('button', { name: /my listings/i }));
        await waitFor(() => expect(mocks.myOrders).toHaveBeenCalledTimes(2));
        expect(await screen.findByText('Cancel Harbour')).toBeTruthy();
    });

    it('does not remove the next organization row after a deferred cancellation success', async () => {
        let resolveCancel!: () => void;
        mocks.cancel.mockImplementationOnce(() => new Promise<void>(resolve => { resolveCancel = resolve; }));
        const view = renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        await openMyListingsRow();
        await confirmCancellation();
        await waitFor(() => expect(mocks.cancel).toHaveBeenCalledTimes(1));

        mocks.user.current = { id: 'user-a', organization_id: 'org-b', role: 'BUYER' };
        const nextOrder = { ...ownOrder, id: 'own-b', delivery_point_name: 'Next Harbour' };
        mocks.myOrders.mockResolvedValue([nextOrder]);
        view.rerender(<Marketplace />);
        fireEvent.click(await screen.findByRole('button', { name: /my listings/i }));
        expect(await screen.findByText('Next Harbour')).toBeTruthy();

        await act(async () => { resolveCancel(); });
        expect(screen.getByText('Next Harbour')).toBeTruthy();
    });
});

describe('mutation settlement invalidation', () => {
    const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
        status, headers: { 'Content-Type': 'application/json' },
    });

    async function realApi() {
        return (await vi.importActual<typeof import('../services/api')>('../services/api')).api;
    }

    it.each([
        ['success', () => response({}), null],
        ['known error', () => response({ detail: 'Rejected' }, 400), 'error'],
        ['unknown outcome', () => response({ detail: 'Idempotency key is busy; retry the same request' }, 503), 'unknown'],
    ] as const)('emits mutation-start then mutation-settled for %s', async (_name, makeResponse, outcome) => {
        const api = await realApi();
        setAccessToken('settlement-token');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse()));
        const causes: string[] = [];
        const unsubscribe = subscribeReadInvalidations(event => causes.push(event.cause));
        try {
            const write = api.orderbook.cancel('order-1', { reason: 'Stop', idempotencyKey: 'key-1' });
            if (outcome === 'error') await expect(write).rejects.toBeInstanceOf(ApiError);
            else if (outcome === 'unknown') await expect(write).rejects.toBeInstanceOf(ApiOutcomeUnknownError);
            else await write;
            expect(causes).toEqual(['mutation-start', 'mutation-settled']);
        } finally {
            unsubscribe();
            clearAccessToken();
        }
    });

    it('keeps every legacy prefix on a take settlement', async () => {
        const api = await realApi();
        setAccessToken('settlement-token');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ id: 'trade-1', status: 'PENDING_CONFIRMATION' })));
        const events: { prefixes: readonly string[]; cause: string }[] = [];
        const unsubscribe = subscribeReadInvalidations(event => events.push(event));
        try {
            await api.trades.initiate({ order_id: 'b30-ask', quantity_mt: 500,
                expected_terms_digest: 'terms-digest-1', idempotency_key: 'key-1' });
            expect(events.map(event => event.cause)).toEqual(['mutation-start', 'mutation-settled']);
            for (const event of events) {
                expect(event.prefixes).toEqual(['orderbook:', 'prices:', 'curves:', 'watchlists:', 'trades:', 'trade-tape:']);
            }
        } finally {
            unsubscribe();
            clearAccessToken();
        }
    });

    const settlementCases = (['take', 'create', 'update', 'cancel'] as const).flatMap(action =>
        (['success', 'known error', 'unknown outcome'] as const).map(outcome => ({ action, outcome })));

    it.each(settlementCases)('reconciles listings, counts, snapshot and my-orders for $action / $outcome', async ({ action, outcome }) => {
        const api = await realApi();
        clearMarketSupportContextId();
        setAccessToken('matrix-token');
        vi.useFakeTimers();
        const client = createQueryClient();
        const keys = [
            ['public', 'orderbook', 'listings', 'ASK'],
            ['public', 'orderbook', 'counts', 'ASK'],
            ['public', 'orderbook', 'snapshot', 'B30'],
            ['private', [getAuthGeneration(), 'user-a', 'org-a', null], 'orderbook', 'my-orders'],
        ];
        const reads = keys.map(() => vi.fn().mockResolvedValue(['current']));
        const unobserve = keys.map((queryKey, index) => {
            client.setQueryData(queryKey, ['previous']);
            return new QueryObserver(client, { queryKey, queryFn: reads[index], staleTime: Infinity }).subscribe(() => {});
        });
        const bridge = attachQueryInvalidation(client);
        const events: { prefixes: readonly string[]; cause: string }[] = [];
        const detach = subscribeReadInvalidations(event => events.push(event));
        let finish!: (value: Response) => void;
        vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
        try {
            const write = action === 'take'
                ? api.trades.initiate({ order_id: 'b30-ask', quantity_mt: 500, expected_terms_digest: 'terms-digest-1', idempotency_key: 'matrix-key' })
                : action === 'create' ? api.orderbook.create({ ...ask, idempotency_key: 'matrix-key' } as Parameters<typeof api.orderbook.create>[0])
                : action === 'update' ? api.orderbook.update('own-1', { price_per_mt_usd: 920 }, 'matrix-key')
                : api.orderbook.cancel('own-1', { reason: 'Stop', etag: '"v7"', idempotencyKey: 'matrix-key' });
            // Attach the rejection handler before finishing the transport.
            const settled = write.then(() => null, error => error);
            await vi.advanceTimersByTimeAsync(600);
            reads.forEach(read => expect(read).not.toHaveBeenCalled());
            keys.forEach(key => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
            finish(outcome === 'success' ? response({ ...ask, ...tradeResult })
                : outcome === 'known error' ? response({ detail: 'Rejected' }, 400)
                : response({ detail: 'Idempotency key is busy; retry the same request' }, 503));
            const error = await settled;
            if (outcome === 'success') expect(error).toBeNull();
            else expect(error).toBeInstanceOf(outcome === 'known error' ? ApiError : ApiOutcomeUnknownError);
            expect(events.map(event => event.cause)).toEqual(['mutation-start', 'mutation-settled']);
            expect(events.every(event => event.prefixes.includes('orderbook:'))).toBe(true);
            await vi.advanceTimersByTimeAsync(500);
            reads.forEach(read => expect(read).toHaveBeenCalledTimes(1));
            keys.forEach(key => expect(client.getQueryData(key)).toEqual(['current']));
        } finally {
            detach(); bridge.dispose(); unobserve.forEach(stop => stop()); client.clear(); clearAccessToken();
        }
    });

    it('does not read at mutation start and reads once at settlement', async () => {
        const api = await realApi();
        setAccessToken('settlement-token');
        vi.useFakeTimers();
        const client = createQueryClient();
        const key = ['public', 'orderbook', 'listings', 'ASK', 'mutation-settlement'];
        client.setQueryData(key, ['old']);
        const load = vi.fn().mockResolvedValue(['new']);
        const observer = new QueryObserver(client, { queryKey: key, queryFn: load, staleTime: Infinity });
        const unobserve = observer.subscribe(() => {});
        const bridge = attachQueryInvalidation(client);
        let finish!: (value: Response) => void;
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(resolve => { finish = resolve; })));
        try {
            const write = api.orderbook.cancel('order-1', { reason: 'Stop', idempotencyKey: 'key-1' });
            await vi.advanceTimersByTimeAsync(600);
            expect(load).not.toHaveBeenCalled();
            finish(response({}));
            await act(async () => { await write; });
            await vi.advanceTimersByTimeAsync(500);
            expect(load).toHaveBeenCalledTimes(1);
        } finally {
            bridge.dispose(); unobserve(); client.clear(); clearAccessToken();
        }
    });

    it('coalesces an event with settlement into one coordinated read', async () => {
        const api = await realApi();
        setAccessToken('settlement-token');
        vi.useFakeTimers();
        const client = createQueryClient();
        const key = ['public', 'orderbook', 'listings', 'ASK', 'mutation-event-race'];
        client.setQueryData(key, ['old']);
        const load = vi.fn().mockResolvedValue(['new']);
        const observer = new QueryObserver(client, { queryKey: key, queryFn: load, staleTime: Infinity });
        const unobserve = observer.subscribe(() => {});
        const bridge = attachQueryInvalidation(client);
        let finish!: (value: Response) => void;
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(resolve => { finish = resolve; })));
        try {
            const write = api.orderbook.cancel('order-1', { reason: 'Stop', idempotencyKey: 'key-1' });
            finish(response({}));
            await act(async () => { await write; });
            // The echo of this write arrives before the settlement read starts.
            invalidateReadCacheWithCause('event', 'orderbook:');
            queuePublicMarketRefresh();
            await vi.advanceTimersByTimeAsync(1_000);
            expect(load).toHaveBeenCalledTimes(1);
        } finally {
            bridge.dispose(); unobserve(); client.clear(); clearAccessToken();
        }
    });
});
