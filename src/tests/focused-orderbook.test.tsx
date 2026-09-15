import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import i18n, { loadNamespace } from '../i18n';
import { LIVE_BOOK_PRODUCTS, OrderbookFilters } from '../components/trading/OrderbookFilters';
import StagingSupplyPreview, { filterSupplyPreviewOffers, SUPPLY_PREVIEW_OFFERS } from '../components/trading/StagingSupplyPreview';

beforeEach(async () => {
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
});

describe('focused orderbook discovery', () => {
    it('preserves the selected pathway when switching fuel families', () => {
        const selected = vi.fn();
        function Filters() {
            const [product, setProduct] = useState('E_METHANOL');
            return <OrderbookFilters products={LIVE_BOOK_PRODUCTS} product={product}
                onProductChange={value => { selected(value); setProduct(value); }}
                location="Singapore" locations={[]} onLocationChange={vi.fn()}
                period="SPOT" periods={[]} onPeriodChange={vi.fn()} />;
        }
        renderWithProviders(<Filters />);
        fireEvent.click(screen.getByRole('button', { name: 'Ethanol' }));
        expect(selected).toHaveBeenLastCalledWith('SYNTHETIC_ETHANOL');
        expect(screen.getByRole('button', { name: 'e-Ethanol' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Bio Ethanol' }));
        expect(selected).toHaveBeenLastCalledWith('BIO_ETHANOL');
        expect(LIVE_BOOK_PRODUCTS.some(product => product.pathway === 'rcf')).toBe(false);
    });

    it('preserves all five supplied quantities and dates without inventing prices or ports', () => {
        expect(SUPPLY_PREVIEW_OFFERS.map(offer => [offer.quantityMt, offer.period])).toEqual([
            [5000, '2027-Q1'], [10000, '2027-Q1'], [2000, '2027-Q1'], [2000, '2027-Q1'], [100000, '2030-Q1'],
        ]);
        expect(SUPPLY_PREVIEW_OFFERS.every(offer => !('price_per_mt_usd' in offer) && !('delivery_point_id' in offer))).toBe(true);
        expect(filterSupplyPreviewOffers('', 'Baltic', '')).toHaveLength(4);
        expect(filterSupplyPreviewOffers('RCF_METHANOL', 'Baltic', '')).toHaveLength(0);
        expect(filterSupplyPreviewOffers('RCF_METHANOL', 'ARA', '2030-Q1')).toHaveLength(1);
        expect(filterSupplyPreviewOffers('', '', '2027-Q1')).toHaveLength(4);
    });

    it('shows truthful empty states and a non-sending enquiry with keyboard dismissal', () => {
        renderWithProviders(<StagingSupplyPreview onExit={vi.fn()} />);
        expect(screen.getByText('100,000 MT')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Bio Methanol' }));
        expect(screen.getByRole('status').textContent).toMatch(/no supplied offers match/i);
        fireEvent.click(screen.getByRole('button', { name: 'Show all 5 offers' }));
        expect(document.querySelectorAll('[data-preview-offer]')).toHaveLength(5);
        fireEvent.click(screen.getAllByRole('button', { name: 'Enquire (preview)' })[0]);
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText(/nothing will be sent/i)).toBeTruthy();
        expect(within(dialog).getByText(/not verified evidence/i)).toBeTruthy();
        expect(within(dialog).queryByRole('button', { name: /send|submit/i })).toBeNull();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
