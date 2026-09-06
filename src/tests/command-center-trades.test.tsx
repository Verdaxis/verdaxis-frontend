import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

const controls = vi.hoisted(() => ({
    summary: vi.fn(),
    myTradesPaged: vi.fn(),
    confirm: vi.fn(),
    scopeKey: 'real-account',
}));

vi.mock('../services/api', () => ({ api: { trades: controls } }));
vi.mock('../hooks/useWatchlist', () => ({
    useWatchlist: () => ({ radar: null, events: [], loading: false, error: null }),
}));
vi.mock('../context/MarketSupportContext', () => ({
    useMarketSupport: () => ({
        isActive: controls.scopeKey !== 'real-account',
        context: controls.scopeKey === 'real-account' ? null : { id: controls.scopeKey },
    }),
}));
vi.mock('../components/OrderPlaceModal', () => ({ OrderPlaceModal: () => null }));
vi.mock('../components/watchlist/MarketRadarPanel', () => ({ MarketRadarPanel: () => null }));
vi.mock('../components/SupplierDemandFeed', () => ({ SupplierDemandFeed: () => null }));

import { CommandCenter } from '../components/CommandCenter';
import { renderWithProviders } from './test-utils';

const trade = (id = 'trade-1', initiatedBy: 'BUYER' | 'SELLER' = 'SELLER') => ({
    id,
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    buyer_name: 'Buyer Org',
    seller_name: 'Seller Org',
    initiated_by: initiatedBy,
    is_anonymous: false,
    quantity_mt: 100,
    price_per_mt_usd: 700,
    status: 'PENDING_CONFIRMATION' as const,
    commission_rate_pct: 1,
    created_at: '2026-09-07T00:00:00Z',
    fuel_type: 'Methanol',
    region: 'Singapore',
});

const summary = (overrides: Partial<Record<string, number>> = {}) => ({
    total_count: 27,
    action_required_count: 4,
    awaiting_counterparty_count: 3,
    confirmed_count: 20,
    ...overrides,
});

describe('Command Center trade summaries and action queue', () => {
    beforeEach(() => {
        controls.scopeKey = 'real-account';
        controls.summary.mockReset().mockResolvedValue(summary());
        controls.myTradesPaged.mockReset().mockResolvedValue({ items: [trade()], total: 4, skip: 0, limit: 8 });
        controls.confirm.mockReset().mockResolvedValue(undefined);
    });

    afterEach(() => cleanup());

    it('uses server totals beyond the bounded action page and requests only actions', async () => {
        renderWithProviders(<CommandCenter viewMode="BUYER" onNavigate={vi.fn()} />);

        expect(await screen.findByText('20')).toBeTruthy();
        expect(screen.getAllByText(/27 total/).length).toBeGreaterThan(0);
        expect(controls.summary).toHaveBeenCalledTimes(1);
        expect(controls.myTradesPaged).toHaveBeenCalledWith({ skip: 0, limit: 8, action_required: true });
        expect(screen.queryByText('Order Matches')).toBeNull();
    });

    it('shows a retry error and never claims the queue is clear after a load failure', async () => {
        controls.summary.mockRejectedValueOnce(new Error('summary unavailable'));
        renderWithProviders(<CommandCenter viewMode="BUYER" onNavigate={vi.fn()} />);

        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(screen.queryByText('All caught up!')).toBeNull();
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeTruthy();
    });

    it('keeps action ownership aligned for buyer and supplier views', async () => {
        const buyerNavigate = vi.fn();
        renderWithProviders(<CommandCenter viewMode="BUYER" onNavigate={buyerNavigate} />);
        expect(await screen.findByRole('button', { name: 'Confirm' })).toBeTruthy();
        cleanup();

        controls.myTradesPaged.mockResolvedValue({ items: [trade('trade-2', 'BUYER')], total: 4, skip: 0, limit: 8 });
        const supplierNavigate = vi.fn();
        renderWithProviders(<CommandCenter viewMode="SUPPLIER" onNavigate={supplierNavigate} />);
        expect(await screen.findByRole('button', { name: 'Confirm' })).toBeTruthy();
    });

    it('refreshes summary and actions after confirmation', async () => {
        controls.summary
            .mockResolvedValueOnce(summary({ action_required_count: 1, confirmed_count: 20 }))
            .mockResolvedValueOnce(summary({ action_required_count: 0, confirmed_count: 21 }));
        const navigate = vi.fn();
        renderWithProviders(<CommandCenter viewMode="BUYER" onNavigate={navigate} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
        const confirmButtons = screen.getAllByRole('button', { name: 'Confirm' });
        fireEvent.click(confirmButtons[confirmButtons.length - 1]);

        await screen.findByRole('heading', { name: 'Trade Confirmed' });
        await waitFor(() => expect(controls.summary).toHaveBeenCalledTimes(2));
        expect(controls.myTradesPaged).toHaveBeenCalledTimes(2);
        expect(screen.getByText('21')).toBeTruthy();
    });

    it('ignores a stale response when the organization scope changes during reload', async () => {
        let resolveOldSummary!: (value: ReturnType<typeof summary>) => void;
        let resolveOldActions!: (value: { items: never[]; total: number; skip: number; limit: number }) => void;
        const oldSummary = new Promise<ReturnType<typeof summary>>(resolve => { resolveOldSummary = resolve; });
        const oldActions = new Promise<{ items: never[]; total: number; skip: number; limit: number }>(resolve => { resolveOldActions = resolve; });
        controls.summary.mockReset()
            .mockReturnValueOnce(oldSummary)
            .mockResolvedValueOnce(summary({ total_count: 2, action_required_count: 0, confirmed_count: 1 }));
        controls.myTradesPaged.mockReset()
            .mockReturnValueOnce(oldActions)
            .mockResolvedValueOnce({ items: [], total: 0, skip: 0, limit: 8 });

        const view = renderWithProviders(<CommandCenter viewMode="BUYER" onNavigate={vi.fn()} />);
        controls.scopeKey = 'support-organization-2';
        view.rerender(<CommandCenter viewMode="BUYER" onNavigate={vi.fn()} />);

        expect((await screen.findAllByText(/2 total/)).length).toBeGreaterThan(0);
        await act(async () => {
            resolveOldSummary(summary({ total_count: 99, confirmed_count: 98 }));
            resolveOldActions({ items: [], total: 0, skip: 0, limit: 8 });
        });
        expect(screen.queryByText(/99 total/)).toBeNull();
    });
});
