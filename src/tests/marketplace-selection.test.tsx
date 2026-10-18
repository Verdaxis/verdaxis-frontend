import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocation, useNavigate } from 'react-router-dom';
import { Marketplace } from '../components/Marketplace';
import { parseSlicePath } from '../utils/sliceUrl';
import { MARKETPLACE_SELECTION_STORAGE_KEYS as keys } from '../utils/marketplaceSelection';
import { renderWithProviders } from './test-utils';
import i18n, { loadNamespace } from '../i18n';

const mocks = vi.hoisted(() => ({ role: 'ADMIN', products: vi.fn(), points: vi.fn(), asks: vi.fn(), bids: vi.fn(), counts: vi.fn(), track: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'viewer', role: mocks.role } }) }));
vi.mock('../context/MarketSupportContext', () => ({ useMarketSupport: () => ({ isActive: false }) }));
vi.mock('../hooks/useWatchlist', () => ({ useWatchlist: () => ({ trackedSliceKeys: new Set(), pinnedOrderIds: new Set(), toggleSlice: vi.fn(), togglePin: vi.fn() }) }));
vi.mock('../components/OrderPlaceModal', () => ({ OrderPlaceModal: () => null }));
vi.mock('../components/OrderBook', () => ({ OrderBook: () => null }));
vi.mock('../components/TradeTape', () => ({ TradeTape: () => null }));
vi.mock('../components/rfq/FameRfqWorkspace', () => ({ FameRfqWorkspace: () => <p>Legacy requests</p> }));
vi.mock('../components/supplier/SupplierOffersWorkspace', () => ({ SupplierOffersWorkspace: () => <p>Legacy offers</p> }));
vi.mock('../services/analytics', () => ({ analytics: { track: mocks.track } }));
vi.mock('../services/api', async importOriginal => ({
    ...await importOriginal<typeof import('../services/api')>(),
    api: { catalog: { products: mocks.products, deliveryPoints: mocks.points },
        orderbook: { listAsksPaged: mocks.asks, listBidsPaged: mocks.bids, productCounts: mocks.counts, myOrders: vi.fn().mockResolvedValue([]) },
        compliance: { pricingOverlay: vi.fn().mockResolvedValue({ overlays: {}, assumptions: null }) } },
}));

function Workspace({ mode = 'BUYER' }: { mode?: 'BUYER' | 'SUPPLIER' }) {
    const location = useLocation();
    const navigate = useNavigate();
    return <>
        <output data-testid="location">{location.pathname}{location.search}</output>
        <button onClick={() => navigate('/app/m/b100/rotterdam/spot')}>Next slice</button>
        <button onClick={() => navigate(-1)}>Previous route</button>
        <button onClick={() => navigate(1)}>Forward route</button>
        <Marketplace initialSlice={parseSlicePath(...location.pathname.split('/').slice(3) as [string, string, string])} viewMode={mode} />
    </>;
}
function root() { return document.querySelector('[data-tour-market-product]')!; }
async function settled() { await waitFor(() => expect(mocks.counts).toHaveBeenCalled()); }

beforeEach(async () => {
    await loadNamespace('trading'); await loadNamespace('rfq'); await i18n.changeLanguage('en');
    vi.clearAllMocks(); localStorage.clear(); mocks.role = 'ADMIN';
    mocks.products.mockResolvedValue([
        { id: 'b30', market_product: 'B30', execution_mode: 'ORDERBOOK', is_active: true },
        { id: 'b100', market_product: 'B100', execution_mode: 'ORDERBOOK', is_active: true },
        { id: 'ucome', market_product: 'UCOME_B100', execution_mode: 'ORDERBOOK', is_active: true, available_delivery_point_ids: ['sg'] },
    ]);
    mocks.points.mockResolvedValue([{ id: 'sg', name: 'Singapore', is_active: true }, { id: 'rtm', name: 'Rotterdam', is_active: true }]);
    const page = (params: { skip: number }) => Promise.resolve({ items: [{ id: `order-${params.skip}`, side: 'ASK', market_product: 'B30', fuel_type: 'Biofuel', certifications: [], remaining_quantity_mt: 500, price_per_mt_usd: 900, status: 'OPEN' }], total: 16, skip: params.skip, limit: 8 });
    mocks.asks.mockImplementation(page); mocks.bids.mockImplementation(page);
    mocks.counts.mockResolvedValue({ counts: { B30: 16 } });
});

describe('Marketplace selection contract', () => {
    it('accepts the exact B30 Singapore SPOT path and removes only conflicting query product', async () => {
        renderWithProviders(<Workspace />, { route: '/app/m/b30/singapore/spot?product=B100&keep=1' });
        await settled();
        expect(root().getAttribute('data-tour-market-product')).toBe('B30');
        expect(root().getAttribute('data-tour-port')).toBe('Singapore');
        expect(root().getAttribute('data-tour-window')).toBe('SPOT');
        expect(screen.getByTestId('location').textContent).toContain('/app/m/b30/singapore/spot?keep=1');
        expect(mocks.asks).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: 'B30', delivery_point_id: 'sg', availability: 'SPOT', skip: 0, limit: 8 }));
        expect(mocks.track.mock.calls.filter(([event]) => event === 'market_slice_selected')).toEqual([
            ['market_slice_selected', { product: 'B30', delivery_point: 'sg', window: 'SPOT' }],
        ]);
    });
    it('keeps slice-to-slice, back and forward navigation without bouncing to stale selection', async () => {
        renderWithProviders(<Workspace />, { route: '/app/m/b30/singapore/spot' });
        await settled();
        fireEvent.click(screen.getByText('Next slice'));
        await waitFor(() => expect(root().getAttribute('data-tour-market-product')).toBe('B100'));
        expect(root().getAttribute('data-tour-port')).toBe('Rotterdam');
        expect(screen.getByTestId('location').textContent).toContain('/app/m/b100/rotterdam/spot');
        fireEvent.click(screen.getByText('Previous route'));
        await waitFor(() => expect(root().getAttribute('data-tour-market-product')).toBe('B30'));
        fireEvent.click(screen.getByText('Forward route'));
        await waitFor(() => expect(root().getAttribute('data-tour-market-product')).toBe('B100'));
    });
    it('does not rewrite the generic route and migrates legacy storage', async () => {
        localStorage.setItem(keys.legacyFuel, 'B30');
        localStorage.setItem(keys.port, 'Singapore');
        localStorage.setItem(keys.availabilityWindow, 'SPOT');
        renderWithProviders(<Workspace />, { route: '/app/marketplace?keep=1' });
        await settled();
        expect(screen.getByTestId('location').textContent).toContain('/app/marketplace?keep=1');
        expect(localStorage.getItem(keys.product)).toBe('B30');
        expect(localStorage.getItem(keys.legacyFuel)).toBeNull();
        expect(localStorage.getItem(keys.deliveryPointId)).toBe('sg');
    });
    it('falls back from an invalid catalog lane to the first allowed port', async () => {
        renderWithProviders(<Workspace />, { route: '/app/m/ucome-b100/rotterdam/spot' });
        await waitFor(() => expect(root().getAttribute('data-tour-port')).toBe('Singapore'));
        await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/app/m/ucome-b100/singapore/spot'));
        expect(mocks.asks).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: 'UCOME_B100', delivery_point_id: 'sg' }));
    });
    it('keeps B100 legacy requests in history without market reads', async () => {
        renderWithProviders(<Workspace />, { route: '/app/marketplace?product=UCOME_B100&view=requests' });
        await screen.findByText('Legacy requests');
        expect(root().getAttribute('data-tour-market-product')).toBe('UCOME_B100');
        expect(mocks.asks).not.toHaveBeenCalled(); expect(mocks.counts).not.toHaveBeenCalled();
        expect(screen.getByTestId('location').textContent).toContain('view=requests');
    });
    it('resets role sort and page without rewriting generic navigation', async () => {
        const view = renderWithProviders(<Workspace />, { route: '/app/marketplace' });
        await settled();
        view.rerender(<Workspace mode="SUPPLIER" />);
        await waitFor(() => expect(mocks.bids).toHaveBeenLastCalledWith(expect.objectContaining({ sort_by: 'price_desc', skip: 0 })));
        expect(screen.getByTestId('location').textContent).toContain('/app/marketplace');
    });
    it('resets the accepted page after a product selection', async () => {
        renderWithProviders(<Workspace />, { route: '/app/marketplace' });
        await screen.findByRole('button', { name: 'Next page' });
        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        await waitFor(() => expect(mocks.asks).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 8, limit: 8 })));
        fireEvent.click(document.querySelector('[data-market-product="B30"]')!);
        await waitFor(() => expect(mocks.asks).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: 'B30', skip: 0 })));
    });
});
