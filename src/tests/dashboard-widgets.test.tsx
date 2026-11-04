import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';

const seen = vi.hoisted(() => ({ orderBook: vi.fn(), tradeTape: vi.fn(), myTrades: vi.fn(), curve: vi.fn() }));

vi.mock('../components/OrderBook', () => ({
    OrderBook: (props: Record<string, unknown>) => { seen.orderBook(props); return <div>Order book view</div>; },
}));
vi.mock('../components/TradeTape', () => ({
    TradeTape: (props: Record<string, unknown>) => { seen.tradeTape(props); return <div>Trade tape view</div>; },
}));
vi.mock('../components/MyTrades', () => ({
    MyTrades: (props: Record<string, unknown>) => { seen.myTrades(props); return <div>My trades view</div>; },
}));
vi.mock('../components/ForwardCurveWorkspace', () => ({
    ForwardCurveWorkspace: (props: Record<string, unknown>) => { seen.curve(props); return <div>Forward curve view</div>; },
}));

import {
    ForwardCurveWidget,
    MyTradesWidget,
    OrderBookWidget,
    TradeTapeWidget,
} from '../components/dashboard/widgets';
import { MARKETPLACE_SELECTION_STORAGE_KEYS, readMarketplaceSlice } from '../utils/marketplaceSelection';
import { renderWithProviders } from './test-utils';

const keys = MARKETPLACE_SELECTION_STORAGE_KEYS;

describe('dashboard widgets that wrap existing views', () => {
    beforeEach(() => {
        window.localStorage.clear();
        Object.values(seen).forEach(mock => mock.mockClear());
    });
    afterEach(() => cleanup());

    it('reads the slice last opened in Marketplace and refuses an unknown product', () => {
        expect(readMarketplaceSlice()).toBeNull();
        window.localStorage.setItem(keys.product, 'NOT_A_PRODUCT');
        expect(readMarketplaceSlice()).toBeNull();
        window.localStorage.setItem(keys.product, 'B30');
        expect(readMarketplaceSlice()).toEqual({
            marketProduct: 'B30', portName: null, deliveryPointId: null, availabilityWindow: null,
        });
        window.localStorage.setItem(keys.port, 'Singapore');
        window.localStorage.setItem(keys.deliveryPointId, 'dp-1');
        window.localStorage.setItem(keys.availabilityWindow, '2027-Q1');
        expect(readMarketplaceSlice()).toEqual({
            marketProduct: 'B30', portName: 'Singapore', deliveryPointId: 'dp-1', availabilityWindow: '2027-Q1',
        });
    });

    it('points the order book and trade tape at that slice', async () => {
        window.localStorage.setItem(keys.product, 'B30');
        window.localStorage.setItem(keys.port, 'Singapore');
        window.localStorage.setItem(keys.deliveryPointId, 'dp-1');
        window.localStorage.setItem(keys.availabilityWindow, '2027-Q1');
        renderWithProviders(<><OrderBookWidget onNavigate={vi.fn()} /><TradeTapeWidget onNavigate={vi.fn()} /></>);

        expect(await screen.findByText('Order book view')).toBeTruthy();
        expect(await screen.findByText('Trade tape view')).toBeTruthy();
        expect(seen.orderBook).toHaveBeenCalledWith({
            marketProduct: 'B30', region: 'Singapore', deliveryPointId: 'dp-1', availability: '2027-Q1',
        });
        // A delivery point already names the place, so the tape drops the port.
        expect(seen.tradeTape).toHaveBeenCalledWith({
            marketProduct: 'B30', region: undefined, deliveryPointId: 'dp-1', availability: '2027-Q1',
        });
    });

    it('asks for a slice when Marketplace has none, and offers a way there', async () => {
        const navigate = vi.fn();
        renderWithProviders(<OrderBookWidget onNavigate={navigate} />);
        expect(await screen.findByText(/Open a market slice in Marketplace/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Open Marketplace/ }));
        expect(navigate).toHaveBeenCalledWith('MARKETPLACE');
        expect(seen.orderBook).not.toHaveBeenCalled();
    });

    it('embeds the trades blotter under its own heading', async () => {
        renderWithProviders(<MyTradesWidget />);
        expect(await screen.findByText('My trades view')).toBeTruthy();
        expect(screen.getByRole('heading', { level: 2, name: 'My trades' })).toBeTruthy();
        expect(seen.myTrades).toHaveBeenCalledWith({ embedded: true });
    });

    it('passes navigation on to the forward curve', async () => {
        const navigate = vi.fn();
        const open = vi.fn();
        renderWithProviders(<ForwardCurveWidget onNavigate={navigate} onOpenSlice={open} />);
        expect(await screen.findByText('Forward curve view')).toBeTruthy();
        expect(seen.curve).toHaveBeenCalledWith({ onNavigate: navigate, onOpenSlice: open });
    });
});
