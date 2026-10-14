import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Marketplace } from '../components/Marketplace';
import i18n, { loadNamespace } from '../i18n';
import copy from '../locales/en/trading.json';
import type { MarketSlice } from '../utils/sliceUrl';

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
    const { ApiError, ApiOutcomeUnknownError } = await importOriginal<typeof import('../services/api')>();
    return { ApiError, ApiOutcomeUnknownError, api: {
    catalog: { products: mocks.products, deliveryPoints: mocks.deliveryPoints },
    orderbook: { listAsksPaged: mocks.listAsksPaged, listBidsPaged: mocks.listBidsPaged,
        listAsks: mocks.listAsks, listBids: mocks.listBids, productCounts: mocks.productCounts, myOrders: mocks.myOrders },
    trades: { initiate: mocks.initiate },
    compliance: { pricingOverlay: mocks.pricingOverlay },
} };
});

const text = (key: string) => copy[key as keyof typeof copy] as string;

const bioLngProduct = {
    id: 'bio-lng-product', name: 'Bio-LNG', market_product: 'BIO_LNG', fuel_type: 'LNG', fuel_grade: 'Bio',
    unit: 'MT', min_lot_size: 1, is_active: true, execution_mode: 'ORDERBOOK',
    available_delivery_point_ids: ['dp-rtm'],
};
const deliveryPoints = [
    { id: 'dp-rtm', name: 'Rotterdam', region: 'Europe', timezone: 'Europe/Amsterdam', is_active: true },
    { id: 'dp-sin', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true },
];

function LocationProbe() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname}</div>;
}

/** Mounts the real slice route shape: /app/m/:product/:port/:window plus the root. */
function renderSlice(path: string, slice: MarketSlice | null) {
    return render(
        <I18nextProvider i18n={i18n}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/app/m/:product/:port/:window" element={<><Marketplace initialSlice={slice} /><LocationProbe /></>} />
                    <Route path="/app/marketplace" element={<><Marketplace /><LocationProbe /></>} />
                </Routes>
            </MemoryRouter>
        </I18nextProvider>,
    );
}

beforeEach(async () => {
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
    vi.resetAllMocks();
    localStorage.clear();
    mocks.role.current = 'BUYER';
    mocks.products.mockResolvedValue([bioLngProduct]);
    mocks.deliveryPoints.mockResolvedValue(deliveryPoints);
    mocks.listAsksPaged.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });
    mocks.listBidsPaged.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });
    mocks.listAsks.mockResolvedValue([]);
    mocks.listBids.mockResolvedValue([]);
    mocks.productCounts.mockResolvedValue({ counts: {}, total: 0 });
    mocks.myOrders.mockResolvedValue([]);
    mocks.pricingOverlay.mockResolvedValue({ overlays: {}, assumptions: null });
});

describe('Marketplace Bio-LNG lane enforcement', () => {
    it('offers only the catalog lane for the selected product', async () => {
        renderSlice('/app/m/bio-lng/rotterdam/spot', { product: 'BIO_LNG', port: 'Rotterdam', window: 'SPOT' });
        fireEvent.click(document.querySelector('[data-tour="marketplace-filter-toggle"]')!);
        const select = await screen.findByRole('combobox', { name: text('marketplace.filter.port') });
        await waitFor(() => expect(select.textContent).toContain('Rotterdam'));
        fireEvent.click(select);
        expect(await screen.findByRole('option', { name: /Rotterdam/ })).toBeTruthy();
        // Singapore is an approved trading port but not a Bio-LNG lane.
        expect(screen.queryByRole('option', { name: /Singapore/ })).toBeNull();
        expect(document.querySelector('[data-tour="marketplace-port-option-singapore"]')).toBeNull();
    });

    it('redirects a deep link on an uncleared port to the product lane', async () => {
        renderSlice('/app/m/bio-lng/singapore/spot', { product: 'BIO_LNG', port: 'Singapore', window: 'SPOT' });
        await waitFor(() => {
            expect(screen.getByTestId('location').textContent).toBe('/app/m/bio-lng/rotterdam/spot');
        });
    });

    it('fails closed to the marketplace root when the catalog grants no lane', async () => {
        mocks.products.mockResolvedValue([{ ...bioLngProduct, available_delivery_point_ids: undefined }]);
        renderSlice('/app/m/bio-lng/singapore/spot', { product: 'BIO_LNG', port: 'Singapore', window: 'SPOT' });
        await waitFor(() => {
            expect(screen.getByTestId('location').textContent).toBe('/app/marketplace');
        });
    });
});
