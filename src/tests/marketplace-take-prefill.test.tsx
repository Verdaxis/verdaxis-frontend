import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Marketplace } from '../components/Marketplace';
import { renderWithProviders } from './test-utils';
import i18n, { loadNamespace } from '../i18n';

const mocks = vi.hoisted(() => ({
    products: vi.fn(), deliveryPoints: vi.fn(), listAsksPaged: vi.fn(), listBidsPaged: vi.fn(),
    listAsks: vi.fn(), listBids: vi.fn(), productCounts: vi.fn(), myOrders: vi.fn(),
    initiate: vi.fn(), pricingOverlay: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'taker-1', role: 'BUYER' } }) }));
vi.mock('../context/MarketSupportContext', () => ({ useMarketSupport: () => ({ isActive: false }) }));
vi.mock('../hooks/useWatchlist', () => ({ useWatchlist: () => ({ trackedSliceKeys: new Set(), pinnedOrderIds: new Set(), toggleSlice: vi.fn(), togglePin: vi.fn() }) }));
vi.mock('../components/OrderPlaceModal', () => ({ OrderPlaceModal: () => null }));
vi.mock('../components/OrderBook', () => ({ OrderBook: () => null }));
vi.mock('../components/TradeTape', () => ({ TradeTape: () => null }));
vi.mock('../components/ui/Pagination', () => ({ Pagination: () => null }));
vi.mock('../services/api', async importOriginal => {
    const { ApiError, ApiOutcomeUnknownError } = await importOriginal<typeof import('../services/api')>();
    return { ApiError, ApiOutcomeUnknownError, api: {
        catalog: { products: mocks.products, deliveryPoints: mocks.deliveryPoints },
        orderbook: {
            listAsksPaged: mocks.listAsksPaged, listBidsPaged: mocks.listBidsPaged,
            listAsks: mocks.listAsks, listBids: mocks.listBids,
            productCounts: mocks.productCounts, myOrders: mocks.myOrders,
        },
        trades: { initiate: mocks.initiate },
        compliance: { pricingOverlay: mocks.pricingOverlay },
    } };
});

// The ask as the orderbook boundary produces it: every decimal is a number
// (see `toOrderBookOrder` in `src/api/mappers.ts`).
const ask = {
    id: 'b30-ask',
    side: 'ASK',
    market_product: 'B30',
    product_id: 'prod-b30',
    product_name: 'B30',
    fuel_type: 'Biofuel',
    fuel_grade: 'B30',
    delivery_point_id: 'dp-sg',
    delivery_point_name: 'Singapore',
    region: 'Asia',
    quantity_mt: 1000,
    remaining_quantity_mt: 500,
    price_per_mt_usd: 915,
    availability_window: 'SPOT',
    certifications: ['ISCC EU'],
    certification_declared: true,
    is_verdaxis_verified: false,
    is_demo_listing: false,
    off_spec: false,
    status: 'OPEN',
    version: 1,
    terms_digest: 'terms-digest-1',
    created_at: '2026-09-22T04:00:00Z',
};

const tradeResult = {
    status: 'PENDING_CONFIRMATION', product_name: 'B30', market_product: 'B30', fuel_type: 'Biofuel',
    delivery_point_name: 'Singapore', region: 'Asia', quantity_mt: 500, price_per_mt_usd: 915,
};

beforeEach(async () => {
    await loadNamespace('trading');
    await loadNamespace('rfq');
    await i18n.changeLanguage('en');
    vi.resetAllMocks();
    localStorage.clear();
    mocks.products.mockResolvedValue([{ id: 'prod-b30', name: 'B30', market_product: 'B30',
        fuel_type: 'Biofuel', fuel_grade: 'B30', min_lot_size: 200, unit: 'MT', execution_mode: 'ORDERBOOK', is_active: true }]);
    mocks.deliveryPoints.mockResolvedValue([{ id: 'dp-sg', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true }]);
    mocks.listAsksPaged.mockResolvedValue({ items: [ask], total: 1, skip: 0, limit: 20 });
    mocks.listBidsPaged.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });
    mocks.listAsks.mockResolvedValue([ask]);
    mocks.listBids.mockResolvedValue([]);
    mocks.productCounts.mockResolvedValue({ counts: { B30: 1 }, total: 1 });
    mocks.myOrders.mockResolvedValue([]);
    mocks.initiate.mockResolvedValue(tradeResult);
    mocks.pricingOverlay.mockResolvedValue({ overlays: {}, assumptions: null });
});

describe('Marketplace take window', () => {
    it('prefills the quantity from the listing and submits that quantity', async () => {
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=B30' });
        fireEvent.click(await screen.findByRole('button', { name: 'Lift Ask' }));

        const quantity = screen.getByLabelText('Quantity (MT)') as HTMLInputElement;
        expect(quantity.value).toBe('500');

        fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Confirm Trade' }));

        await waitFor(() => expect(mocks.initiate).toHaveBeenCalledTimes(1));
        expect(mocks.initiate).toHaveBeenCalledWith(expect.objectContaining({
            order_id: 'b30-ask',
            quantity_mt: 500,
            expected_terms_digest: 'terms-digest-1',
            idempotency_key: expect.any(String),
        }));
    });
});
