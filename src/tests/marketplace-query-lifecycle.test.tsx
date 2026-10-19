import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Marketplace } from '../components/Marketplace';
import { renderWithProviders } from './test-utils';
import i18n, { loadNamespace } from '../i18n';

const mocks = vi.hoisted(() => ({ products: vi.fn(), points: vi.fn(), asks: vi.fn(), bids: vi.fn(), counts: vi.fn(), my: vi.fn(), overlay: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'viewer', organization_id: 'org', role: 'ADMIN' } }) }));
vi.mock('../context/MarketSupportContext', () => ({ useMarketSupport: () => ({ isActive: false }) }));
vi.mock('../hooks/useWatchlist', () => ({ useWatchlist: () => ({ trackedSliceKeys: new Set(), pinnedOrderIds: new Set(), toggleSlice: vi.fn(), togglePin: vi.fn() }) }));
vi.mock('../components/OrderPlaceModal', () => ({ OrderPlaceModal: () => null }));
vi.mock('../components/OrderBook', () => ({ OrderBook: () => null }));
vi.mock('../components/TradeTape', () => ({ TradeTape: () => null }));
vi.mock('../services/api', async original => ({
    ...await original<typeof import('../services/api')>(),
    api: { catalog: { products: mocks.products, deliveryPoints: mocks.points },
        orderbook: { listAsksPaged: mocks.asks, listBidsPaged: mocks.bids, productCounts: mocks.counts, myOrders: mocks.my },
        compliance: { pricingOverlay: mocks.overlay } },
}));

function page(id: string, skip = 0, side = 'ASK') {
    return { items: [{ id, side, market_product: 'B30', product_name: id, fuel_type: 'Biofuel', certifications: [], remaining_quantity_mt: 500, price_per_mt_usd: 900, status: 'OPEN' }], total: 16, skip, limit: 8 };
}
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(done => { resolve = done; });
    return { promise, resolve };
}

beforeEach(async () => {
    await loadNamespace('trading'); await loadNamespace('rfq'); await i18n.changeLanguage('en');
    vi.clearAllMocks(); localStorage.clear();
    mocks.products.mockResolvedValue([{ id: 'b30', market_product: 'B30', execution_mode: 'ORDERBOOK', is_active: true }]);
    mocks.points.mockResolvedValue([{ id: 'sg', name: 'Singapore', is_active: true }, { id: 'rtm', name: 'Rotterdam', is_active: true }]);
    mocks.asks.mockResolvedValue(page('current-ask'));
    mocks.bids.mockResolvedValue(page('current-bid', 0, 'BID'));
    mocks.counts.mockResolvedValue({ counts: { B30: 16 } });
    mocks.my.mockResolvedValue([]);
    mocks.overlay.mockResolvedValue({ overlays: {}, assumptions: null });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Marketplace Query lifecycle', () => {
    it('hands every migrated read to Query and keeps counts shared across product changes', async () => {
        const view = renderWithProviders(<Marketplace viewMode="BUYER" />);
        await waitFor(() => expect(document.querySelector('[data-order-id="current-ask"]')).not.toBeNull());
        await waitFor(() => expect(mocks.overlay).toHaveBeenCalled());
        const options = expect.objectContaining({ cacheOwner: 'query', signal: expect.any(AbortSignal) });
        expect(mocks.products).toHaveBeenCalledWith(options);
        expect(mocks.points).toHaveBeenCalledWith(options);
        expect(mocks.asks).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, limit: 8 }), options);
        expect(mocks.counts).toHaveBeenCalledWith(expect.objectContaining({ side: 'ASK', include_off_spec: false }), options);
        expect(mocks.overlay).toHaveBeenCalledWith(['current-ask'], options);
        const countsBefore = mocks.counts.mock.calls.length;
        fireEvent.click(document.querySelector('[data-market-product="B30"]')!);
        await waitFor(() => expect(mocks.asks).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: 'B30', skip: 0 }), options));
        expect(mocks.counts).toHaveBeenCalledTimes(countsBefore);
        expect(view.queryClient.getQueryCache().getAll().some(query => query.queryKey[1] === 'orderbook')).toBe(true);
    });

    it('does not let a late page-zero refresh replace page eight', async () => {
        renderWithProviders(<Marketplace />);
        await waitFor(() => expect(document.querySelector('[data-order-id="current-ask"]')).not.toBeNull());
        const old = deferred<ReturnType<typeof page>>();
        mocks.asks.mockImplementationOnce(() => old.promise).mockResolvedValueOnce(page('page-eight', 8));
        fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }));
        await waitFor(() => expect(mocks.asks).toHaveBeenCalledTimes(2));
        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        await waitFor(() => expect(document.querySelector('[data-order-id="page-eight"]')).not.toBeNull());
        await act(async () => old.resolve(page('obsolete-page')));
        expect(document.querySelector('[data-order-id="obsolete-page"]')).toBeNull();
        expect(document.querySelector('[data-order-id="page-eight"]')).toBeTruthy();
    });

    it('resets the page and sort before the supplier key can fetch', async () => {
        const view = renderWithProviders(<Marketplace viewMode="BUYER" />);
        await waitFor(() => expect(document.querySelector('[data-order-id="current-ask"]')).not.toBeNull());
        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        await waitFor(() => expect(mocks.asks).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 8 }), expect.anything()));
        view.rerender(<Marketplace viewMode="SUPPLIER" />);
        await waitFor(() => expect(document.querySelector('[data-order-id="current-bid"]')).not.toBeNull());
        expect(mocks.bids.mock.calls.every(([params]) => params.skip === 0 && params.sort_by === 'price_desc')).toBe(true);
        expect(document.querySelector('[data-order-id="current-ask"]')).toBeNull();
    });

    it('does not fetch listings on a depth route or while delivery scope is unresolved', async () => {
        localStorage.setItem('verdaxis_marketplace_port', 'Singapore');
        const pending = deferred<Awaited<ReturnType<typeof mocks.points>>>();
        mocks.points.mockReturnValueOnce(pending.promise);
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?view=orderbook' });
        expect(mocks.asks).not.toHaveBeenCalled(); expect(mocks.counts).not.toHaveBeenCalled();
        await act(async () => pending.resolve([{ id: 'sg', name: 'Singapore', is_active: true }]));
        await waitFor(() => expect(mocks.counts).toHaveBeenCalledTimes(1));
        expect(mocks.asks).not.toHaveBeenCalled();
    });
});
