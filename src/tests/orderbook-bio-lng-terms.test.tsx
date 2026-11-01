import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { OrderBook } from '../components/OrderBook';
import i18n, { loadNamespace } from '../i18n';
import type { OrderBookOrder } from '../types';
import type { LngBidTerms, LngPublicAskTerms } from '../types/lngOrder';

const { snapshot } = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock('../services/api', () => ({ api: { orderbook: { snapshot } } }));

const LNG_MARKET = { marketProduct: 'BIO_LNG', deliveryPointId: 'rotterdam', availability: 'SPOT', region: 'Rotterdam' } as const;

const askTerms: LngPublicAskTerms = {
  side: 'ASK',
  sustainability_scheme: 'ISCC_EU',
  chain_of_custody: 'MASS_BALANCE',
  union_database_registered: true,
  bio_share_pct: 97.5,
  feedstock: 'MANURE',
  feedstock_detail: 'Dairy farms',
  production_country: 'NL',
  wtt_ghg_gco2e_mj: -38.25,
  specification_standard: 'ISO 23306:2020',
  min_methane_number: 80,
  delivery_method: 'SHIP_TO_SHIP',
  seller_is_physical_supplier: true,
  pos_timing: 'WITH_DELIVERY',
  reseller: false,
  fueleu_recognition: 'UNION_DATABASE',
};

const bidTerms: LngBidTerms = {
  side: 'BID',
  accepted_schemes: ['ISCC_EU'],
  accepted_custody: ['PHYSICAL_SEGREGATION'],
  require_union_database: true,
  min_bio_share_pct: 90,
  max_wtt_ghg_gco2e_mj: -20,
  accepted_delivery_methods: ['SHIP_TO_SHIP'],
  min_methane_number: 75,
  accept_resellers: false,
};

const lngOrder = (side: 'BID' | 'ASK', terms: OrderBookOrder['lng_terms']): OrderBookOrder => ({
  id: `${side.toLowerCase()}-lng`, side, market_product: 'BIO_LNG', fuel_type: 'LNG',
  price_per_mt_usd: 1420, remaining_quantity_mt: 500, availability_window: 'SPOT', region: 'Rotterdam',
  certifications: [], lng_terms: terms,
} as unknown as OrderBookOrder);

const lngSnapshot = (bids: OrderBookOrder[], asks: OrderBookOrder[]) => ({
  market_product: 'BIO_LNG', delivery_point_id: LNG_MARKET.deliveryPointId, availability_window: 'SPOT',
  generated_at: new Date().toISOString(), source_kind: 'LIVE_ORDER', scope: 'DELIVERY_POINT',
  demo_status: 'REAL_ONLY', bids, asks,
});

describe('order book bio-LNG terms', () => {
  beforeEach(async () => {
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
    snapshot.mockReset();
  });
  afterEach(() => i18n.changeLanguage('en'));

  it('shows the well-to-tank value with the methane-slip caveat as visible text', async () => {
    snapshot.mockResolvedValue(lngSnapshot([], [lngOrder('ASK', askTerms)]));
    renderWithProviders(<OrderBook {...LNG_MARKET} />);

    // The caveat qualifies the value, so it is read without hovering.
    await screen.findByText(/-38\.25 gCO₂e\/MJ/);
    expect(screen.getByText('Certified well-to-tank value. Excludes engine methane slip.')).toBeTruthy();
  });

  it('keeps the caveat localized in Chinese', async () => {
    await i18n.changeLanguage('zh');
    snapshot.mockResolvedValue(lngSnapshot([], [lngOrder('ASK', askTerms)]));
    renderWithProviders(<OrderBook {...LNG_MARKET} />);

    await screen.findByText(/-38\.25 gCO₂e\/MJ/);
    expect(screen.getByText(i18n.t('lngTerms.wttNote', { ns: 'trading' }))).toBeTruthy();
  });

  it('shows what a bio-LNG bid requires on hover', async () => {
    snapshot.mockResolvedValue(lngSnapshot([lngOrder('BID', bidTerms)], []));
    renderWithProviders(<OrderBook {...LNG_MARKET} />);
    await act(async () => {});

    fireEvent.focus(screen.getByRole('group', { name: /Bid/ }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('Minimum bio share (%) 90');
    expect(tooltip.textContent).toContain('Maximum well-to-tank GHG (gCO₂e/MJ) -20');
    expect(tooltip.textContent).toContain('Minimum methane number (optional) 75');
    expect(tooltip.textContent).toContain('Physical suppliers only');
  });

  it('shows the methane number and feedstock detail of an ask on hover', async () => {
    snapshot.mockResolvedValue(lngSnapshot([], [lngOrder('ASK', askTerms)]));
    renderWithProviders(<OrderBook {...LNG_MARKET} />);
    await act(async () => {});

    fireEvent.focus(screen.getByRole('group', { name: /Ask/ }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('Dairy farms');
    expect(tooltip.textContent).toContain('Minimum methane number (optional) 80');
  });
});

describe('order book biofuel contract', () => {
  beforeEach(async () => {
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
    snapshot.mockReset();
  });

  it.each(['B30', 'B100'] as const)('shows the fixed %s contract and the whole-blend carbon intensity label on hover', async (product) => {
    snapshot.mockResolvedValue({
      market_product: product, delivery_point_id: 'singapore', availability_window: 'SPOT',
      generated_at: new Date().toISOString(), source_kind: 'LIVE_ORDER', scope: 'DELIVERY_POINT', demo_status: 'REAL_ONLY',
      bids: [{
        id: 'bid-1', side: 'BID', market_product: product, fuel_type: 'Biofuel', price_per_mt_usd: 700,
        remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
      }],
      asks: [],
    });
    renderWithProviders(<OrderBook marketProduct={product} deliveryPointId="singapore" availability="SPOT" region="Singapore" />);
    await act(async () => {});

    fireEvent.focus(screen.getByRole('group', { name: /Bid/ }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain(i18n.t(`${product.toLowerCase()}.contract`, { ns: 'trading' }));
    expect(tooltip.textContent).toContain(i18n.t(`${product.toLowerCase()}.wholeBlendCiLabel`, { ns: 'trading' }));
  });
});
