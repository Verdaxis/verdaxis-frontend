import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './test-utils';
import { OrderPlaceModal } from '../components/OrderPlaceModal';
import i18n, { loadNamespace } from '../i18n';
import copy from '../locales/en/trading.json';
import { clearAccessToken } from '../services/authToken';
import { clearMarketSupportContextId } from '../services/marketSupportContextStore';

const productsMock = vi.fn();
const deliveryPointsMock = vi.fn();
const createOrderMock = vi.fn();
const { TestApiOutcomeUnknownError } = vi.hoisted(() => ({
  TestApiOutcomeUnknownError: class extends Error {},
}));

vi.mock('../services/api', () => ({
  ApiOutcomeUnknownError: TestApiOutcomeUnknownError,
  api: {
    catalog: {
      products: (...args: unknown[]) => productsMock(...args),
      deliveryPoints: (...args: unknown[]) => deliveryPointsMock(...args),
    },
    orderbook: { create: (...args: unknown[]) => createOrderMock(...args) },
  },
}));
vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => ({ context: null, isActive: false, isLoading: false }),
}));

const text = (key: string) => copy[key as keyof typeof copy] as string;

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function setPrice(value: string) {
  fireEvent.change(screen.getByRole('spinbutton', { name: /^price/i }), { target: { value } });
}
async function reviewAndConfirm(side: 'Bid' | 'Ask') {
  fireEvent.click(screen.getByRole('button', { name: `Review ${side}` }));
  fireEvent.click(await screen.findByRole('button', { name: `Confirm and place ${side}` }));
}

describe('OrderPlaceModal BIO_LNG terms', () => {
  beforeEach(async () => {
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
    productsMock.mockReset();
    deliveryPointsMock.mockReset();
    createOrderMock.mockReset();
    clearAccessToken();
    clearMarketSupportContextId();
    sessionStorage.clear();

    productsMock.mockResolvedValue([{
      id: 'bio-lng-product',
      name: 'Bio-LNG',
      market_product: 'BIO_LNG',
      fuel_type: 'LNG',
      fuel_grade: 'Bio',
      unit: 'MT',
      min_lot_size: 1,
      is_active: true,
      execution_mode: 'ORDERBOOK',
      available_delivery_point_ids: ['dp-rtm'],
    }]);
    deliveryPointsMock.mockResolvedValue([
      { id: 'dp-rtm', name: 'Rotterdam', region: 'Europe', timezone: 'Europe/Amsterdam', is_active: true },
      { id: 'dp-sin', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true },
    ]);
    createOrderMock.mockResolvedValue({ trades: [] });
  });

  it('offers only the catalog lane and submits the seller declaration as lng_terms', async () => {
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="ASK" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());

    // Bio-LNG is lane-restricted: Singapore is not offered for this product.
    expect(screen.getByRole('combobox', { name: text('orderPlaceModal.aria.deliveryPoint') }).textContent).toContain('Rotterdam');
    setPrice('820');
    fill(text('lngTerms.field.certificateNumber'), 'ISCC-EU-001');
    fill(text('lngTerms.field.productionCountry'), 'nl');
    fill(text('lngTerms.field.bioShare'), '95');
    fill(text('lngTerms.field.wtt'), '-120.5');
    fill(text('lngTerms.field.supplierName'), 'Supplier A');
    fireEvent.click(screen.getByLabelText(text('lngTerms.ask.unionDatabase')));
    await reviewAndConfirm('Ask');

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));
    const payload = createOrderMock.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      side: 'ASK',
      product_id: 'bio-lng-product',
      delivery_point_id: 'dp-rtm',
      quantity_mt: 1000,
      price_per_mt_usd: 820,
      lng_terms: {
        side: 'ASK',
        sustainability_scheme: 'ISCC_EU',
        scheme_certificate_number: 'ISCC-EU-001',
        chain_of_custody: 'MASS_BALANCE',
        union_database_registered: true,
        bio_share_pct: 95,
        feedstock: 'MANURE',
        feedstock_detail: null,
        production_country: 'NL',
        wtt_ghg_gco2e_mj: -120.5,
        specification_standard: 'ISO 23306:2020',
        min_methane_number: null,
        delivery_method: 'SHIP_TO_SHIP',
        seller_is_physical_supplier: true,
        physical_supplier_name: 'Supplier A',
        pos_timing: 'WITH_DELIVERY',
      },
    }));
    // The server derives the generic ASK metadata, so the client must not send it.
    for (const key of ['certification_declared', 'certification_scheme', 'specification_standard', 'carbon_intensity_gco2_mj', 'feedstock', 'origin', 'msds_available']) {
      expect(payload).not.toHaveProperty(key);
    }
  });

  it('blocks the review when the mirrored seller validation fails', async () => {
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="ASK" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    setPrice('820');
    fill(text('lngTerms.field.certificateNumber'), 'ISCC-EU-001');
    fill(text('lngTerms.field.productionCountry'), 'NL');
    // Two decimals are reachable through the numeric input but rejected by the contract.
    fill(text('lngTerms.field.bioShare'), '95.125');
    fill(text('lngTerms.field.wtt'), '12');
    fill(text('lngTerms.field.supplierName'), 'Supplier A');
    fireEvent.click(screen.getByRole('button', { name: 'Review Ask' }));

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', text('lngTerms.validation.bioShare'));
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('submits buyer requirements and turns the physical-suppliers-only switch into accept_resellers false', async () => {
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    setPrice('790');
    fill(text('lngTerms.field.minBioShare'), '90');
    fireEvent.click(screen.getByLabelText(text('lngTerms.bid.physicalSuppliersOnly')));
    await reviewAndConfirm('Bid');

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));
    expect(createOrderMock.mock.calls[0][0]).toEqual(expect.objectContaining({
      side: 'BID',
      lng_terms: {
        side: 'BID',
        accepted_schemes: ['ISCC_EU', 'REDCERT_EU'],
        accepted_custody: ['MASS_BALANCE', 'PHYSICAL_SEGREGATION'],
        require_union_database: true,
        min_bio_share_pct: 90,
        max_wtt_ghg_gco2e_mj: null,
        accepted_delivery_methods: ['SHIP_TO_SHIP', 'TRUCK_TO_SHIP', 'TERMINAL_TO_SHIP'],
        min_methane_number: null,
        accept_resellers: false,
      },
    }));
  });
});
