import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './test-utils';
import { OrderPlaceModal } from '../components/OrderPlaceModal';
import i18n, { loadNamespace } from '../i18n';
import { clearAccessToken } from '../services/authToken';
import { invalidateReadCache } from '../services/readCache';

vi.mock('../context/MarketSupportContext', () => ({
    useMarketSupport: () => ({ context: null, isActive: false, isLoading: false }),
}));

// The real `/catalog/products` wire shape: every decimal is a JSON string.
const WIRE_PRODUCTS = [{
    id: 'prod-b30',
    name: 'B30',
    market_product: 'B30',
    fuel_type: 'Biofuel',
    fuel_grade: 'B30',
    unit: 'MT',
    min_lot_size: '200.00',
    is_active: true,
    execution_mode: 'ORDERBOOK',
}];
const WIRE_DELIVERY_POINTS = [
    { id: 'dp-sg', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true },
];

function jsonResponse(body: unknown) {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

const orderBodies: Array<Record<string, unknown>> = [];

function stubFetch() {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/catalog/products')) return jsonResponse(WIRE_PRODUCTS);
        if (url.includes('/catalog/delivery-points')) return jsonResponse(WIRE_DELIVERY_POINTS);
        if (url.includes('/orderbook')) {
            orderBodies.push(JSON.parse(String(init?.body ?? '{}')));
            return jsonResponse({ id: 'order-1', trades: [] });
        }
        return jsonResponse({});
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

describe('OrderPlaceModal reads the real catalog wire shape', () => {
    beforeEach(async () => {
        await loadNamespace('trading');
        await loadNamespace('rfq');
        await i18n.changeLanguage('en');
        clearAccessToken();
        invalidateReadCache();
        orderBodies.length = 0;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        invalidateReadCache();
    });

    it('turns `min_lot_size: "200.00"` into a usable minimum and places a BID', async () => {
        const fetchMock = stubFetch();
        renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);

        // Before the catalog boundary converted the decimal, this line rendered
        // "Catalog minimum unavailable" and the review button stayed disabled.
        expect(await screen.findByText('200 MT')).toBeTruthy();
        expect((document.getElementById('order-quantity') as HTMLInputElement).getAttribute('min')).toBe('200');
        expect(screen.queryByText(/catalog minimum unavailable/i)).toBeNull();

        fireEvent.change(document.getElementById('order-quantity')!, { target: { value: '200' } });
        fireEvent.change(screen.getByRole('spinbutton', { name: /^price/i }), { target: { value: '700' } });
        fireEvent.click(screen.getByRole('button', { name: 'Review Bid' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Confirm and place Bid' }));

        await waitFor(() => expect(orderBodies).toHaveLength(1));
        expect(orderBodies[0]).toEqual(expect.objectContaining({
            side: 'BID',
            product_id: 'prod-b30',
            delivery_point_id: 'dp-sg',
            quantity_mt: 200,
            price_per_mt_usd: 700,
        }));
        expect(fetchMock).toHaveBeenCalled();
    });

    it('places an ASK from the same wire minimum', async () => {
        stubFetch();
        renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="ASK" />);

        expect(await screen.findByText('200 MT')).toBeTruthy();
        fireEvent.click(screen.getByRole('checkbox', { name: /certification declaration/i }));
        fireEvent.change(screen.getByLabelText(/carbon intensity.*gCO2e/i), { target: { value: '74.2' } });
        fireEvent.change(screen.getByLabelText('Carbon intensity method / basis'), { target: { value: 'RED lifecycle calculation' } });
        fireEvent.change(screen.getByLabelText('Feedstock'), { target: { value: 'Used cooking oil' } });
        fireEvent.change(screen.getByLabelText('Origin'), { target: { value: 'Singapore' } });
        fireEvent.click(screen.getByRole('checkbox', { name: /MSDS available/i }));
        fireEvent.change(document.getElementById('order-quantity')!, { target: { value: '200' } });
        fireEvent.change(screen.getByRole('spinbutton', { name: /^price/i }), { target: { value: '900' } });
        fireEvent.click(screen.getByRole('button', { name: 'Review Ask' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Confirm and place Ask' }));

        await waitFor(() => expect(orderBodies).toHaveLength(1));
        expect(orderBodies[0]).toEqual(expect.objectContaining({
            side: 'ASK',
            product_id: 'prod-b30',
            delivery_point_id: 'dp-sg',
            quantity_mt: 200,
            price_per_mt_usd: 900,
            certification_declared: true,
            msds_available: true,
        }));
    });
});
