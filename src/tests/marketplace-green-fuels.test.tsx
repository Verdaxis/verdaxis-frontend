import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';

import { renderWithProviders } from './test-utils';
import { Marketplace } from '../components/Marketplace';
import i18n, { loadNamespace } from '../i18n';

const { userRole, marketSupportActive, orderPlaceModalSpy, listAsksPaged, listBidsPaged, listAsks, listBids, productCounts, myOrders, deliveryPoints, toggleSlice, togglePin, tradeTapeList, tradesInitiate, pricingOverlay, products, rfqList, supplierOffersList, supplierOffersMy } = vi.hoisted(() => ({
  userRole: { current: 'BUYER' as 'BUYER' | 'SUPPLIER' | 'ADMIN' },
  marketSupportActive: { current: false },
  pricingOverlay: vi.fn(),
  products: vi.fn(),
  rfqList: vi.fn(),
  supplierOffersList: vi.fn(),
  supplierOffersMy: vi.fn(),
  orderPlaceModalSpy: vi.fn(),
  listAsksPaged: vi.fn(),
  listBidsPaged: vi.fn(),
  listAsks: vi.fn(),
  listBids: vi.fn(),
  productCounts: vi.fn(),
  myOrders: vi.fn(),
  deliveryPoints: vi.fn(),
  toggleSlice: vi.fn(),
  togglePin: vi.fn(),
  tradeTapeList: vi.fn(),
  tradesInitiate: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: userRole.current },
  }),
}));

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => ({ isActive: marketSupportActive.current }),
}));

vi.mock('../hooks/useWatchlist', () => ({
  useWatchlist: () => ({
    radar: {
      id: 'radar-1',
      name: 'Watchlist',
      kind: 'RADAR_DEFAULT',
      unread_event_count: 0,
      slices: [],
      created_at: new Date().toISOString(),
    },
    events: [],
    loading: false,
    error: null,
    trackedSliceKeys: new Set(['BIO_METHANOL::dp-1::SPOT']),
    pinnedOrderIds: new Set(['ask-1']),
    nextCursor: null,
    refresh: vi.fn(),
    loadMoreEvents: vi.fn(),
    toggleSlice,
    togglePin,
    removeTarget: vi.fn(),
    markEventRead: vi.fn(),
  }),
}));

vi.mock('../components/OrderPlaceModal', () => ({
  OrderPlaceModal: (props: unknown) => {
    orderPlaceModalSpy(props);
    return null;
  },
}));

vi.mock('../components/ui/Pagination', () => ({
  Pagination: () => null,
}));

vi.mock('../services/api', () => ({
  api: {
    catalog: {
      products,
      deliveryPoints,
    },
    rfq: { list: rfqList },
    supplierOffers: { list: supplierOffersList, my: supplierOffersMy },
    orderbook: {
      listAsksPaged,
      listBidsPaged,
      listAsks,
      listBids,
      productCounts,
      myOrders,
    },
    trades: {
      initiate: tradesInitiate,
    },
    tradeTape: {
      list: tradeTapeList,
    },
    compliance: {
      pricingOverlay,
    },
  },
}));

const overlayAssumptionsFixture = {
  eur_usd_rate: '1.08',
  vlsfo_baseline_gco2_mj: '91.16',
  ghgie_actual_gco2_mj: '91.16',
  fleet_intensity_basis: 'DEFAULT_VLSFO' as const,
  fleet_vessel_count: 0,
  penalty_eur_per_tonne: '2400',
  year: 2026,
  year_target: '89.34',
  excluded_factors: ['RFNBO_MULTIPLIER', 'DEFICIT_ESCALATION', 'EXTRA_EU_VOYAGE_SCOPE'],
};

const listingsResponse = {
  items: [
    {
      id: 'ask-1',
      side: 'ASK',
      product_id: 'product-1',
      product_name: 'Bio Methanol',
      market_product: 'BIO_METHANOL',
      fuel_type: 'Methanol',
      fuel_grade: 'Bio',
      delivery_point_id: 'dp-1',
      delivery_point_name: 'Singapore',
      region: 'Asia',
      quantity_mt: 1000,
      remaining_quantity_mt: 1000,
      price_per_mt_usd: 1080,
      availability_window: 'SPOT',
      certifications: ['ISCC'],
      certification_declared: true,
      is_verdaxis_verified: true,
      off_spec: false,
      status: 'OPEN',
      benchmark_price_per_mt_usd: 1092,
      premium_discount_per_mt_usd: -12,
      created_at: new Date().toISOString(),
    },
  ],
  total: 1,
  skip: 0,
  limit: 20,
};

function setMarketplaceSlice({
  port = 'Singapore',
  product = 'BIO_METHANOL',
  window = 'SPOT',
}: {
  port?: string | null;
  product?: string | null;
  window?: string | null;
} = {}) {
  if (port == null) {
    localStorage.removeItem('verdaxis_marketplace_port');
  } else {
    localStorage.setItem('verdaxis_marketplace_port', port);
  }

  if (product == null) {
    localStorage.removeItem('verdaxis_marketplace_product');
  } else {
    localStorage.setItem('verdaxis_marketplace_product', product);
  }

  if (window == null) {
    localStorage.removeItem('verdaxis_marketplace_window');
  } else {
    localStorage.setItem('verdaxis_marketplace_window', window);
  }
}

describe('Marketplace green fuels surface', () => {
  beforeEach(async () => {
    await loadNamespace('trading');
    await loadNamespace('rfq');
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    userRole.current = 'BUYER';
    marketSupportActive.current = false;
    localStorage.clear();
    listAsksPaged.mockImplementation(async (params?: { market_product?: string }) => {
      if (!params?.market_product || params.market_product === 'BIO_METHANOL') {
        return listingsResponse;
      }
      return { items: [], total: 0, skip: 0, limit: 20 };
    });
    listBidsPaged.mockImplementation(async (params?: { market_product?: string }) => {
      if (!params?.market_product || params.market_product === 'BIO_METHANOL') {
        return {
          ...listingsResponse,
          items: listingsResponse.items.map((item) => ({ ...item, side: 'BID' })),
        };
      }
      return { items: [], total: 0, skip: 0, limit: 20 };
    });
    listAsks.mockResolvedValue(listingsResponse.items);
    listBids.mockResolvedValue([]);
    productCounts.mockResolvedValue({
      counts: {
        BIO_METHANOL: 1,
        E_METHANOL: 0,
        BIO_ETHANOL: 0,
        SYNTHETIC_ETHANOL: 0,
      },
      total: 1,
    });
    myOrders.mockResolvedValue([]);
    products.mockResolvedValue([{ id: 'ucome-product', market_product: 'UCOME_B100', execution_mode: 'ORDERBOOK', is_active: true, available_delivery_point_ids: ['dp-1'] }]);
    rfqList.mockResolvedValue({ items: [], total: 0 });
    supplierOffersList.mockResolvedValue({ items: [], total: 0 });
    supplierOffersMy.mockResolvedValue({ items: [], total: 0 });
    deliveryPoints.mockResolvedValue([
      { id: 'dp-1', name: 'Singapore', region: 'Asia', is_active: true },
      { id: 'dp-2', name: 'Rotterdam', region: 'Europe', is_active: true },
      { id: 'dp-3', name: 'Santos', region: 'South America', is_active: true },
    ]);
    toggleSlice.mockResolvedValue(true);
    togglePin.mockResolvedValue(true);
    tradeTapeList.mockResolvedValue({ items: [], total: 0, market_hours: true });
    tradesInitiate.mockResolvedValue({ status: 'PENDING_CONFIRMATION' });
    pricingOverlay.mockResolvedValue({ overlays: {}, assumptions: overlayAssumptionsFixture });
  });

  it('collects and reviews buyer fuel terms before taking a B100 ask through the standard trade API', async () => {
    const b100 = { ...listingsResponse.items[0], id: 'b100-ask', version: 3, market_product: 'UCOME_B100', product_name: 'UCOME B100', fuel_type: 'FAME',
      fame_terms: { side: 'ASK', schema_version: 1, neat_fame: true, standard: 'EN_14214', standard_edition: '2012+A2:2019', sustainability_scheme: 'ISCC_EU', nomination_status: 'PENDING', uco_mass_pct: 100, evidence_status: 'PENDING', certificate_valid_until: '2027-12-31', evidence_due: 'BEFORE_LOADING', cfpp_c: null, ci_gco2e_mj: null } };
    listAsksPaged.mockResolvedValue({ items: [b100], total: 1, skip: 0, limit: 20 });
    renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=UCOME_B100' });
    fireEvent.click(await screen.findByRole('button', { name: 'Lift Ask' }));
    const edition = await screen.findByRole('textbox', { name: 'Standard edition' });
    expect(edition).toHaveProperty('value', '2012+A2:2019');
    fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
    expect(tradesInitiate).not.toHaveBeenCalled();
    expect(await screen.findByText(/Review both sides/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Trade' }));
    await waitFor(() => expect(tradesInitiate).toHaveBeenCalledWith(expect.objectContaining({
      order_id: 'b100-ask', expected_order_version: 3, fame_terms: expect.objectContaining({ side: 'BID', standard: 'EN_14214', standard_edition: '2012+A2:2019', max_ci_gco2e_mj: null }),
    })));
    expect(supplierOffersList).not.toHaveBeenCalled();
    expect(rfqList).not.toHaveBeenCalled();
  });

  it('uses the same executable Listings and My Listings for B100 as other fuels', async () => {
    const b100 = { ...listingsResponse.items[0], id: 'b100-ask', version: 3, market_product: 'UCOME_B100', product_name: 'UCOME B100', fuel_type: 'FAME' };
    listAsksPaged.mockResolvedValue({ items: [b100], total: 1, skip: 0, limit: 20 });
    renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=UCOME_B100' });
    expect(await screen.findByRole('button', { name: 'Lift Ask' })).toBeTruthy();
    expect(listAsksPaged).toHaveBeenCalledWith(expect.objectContaining({ market_product: 'UCOME_B100' }));
    expect(screen.getByRole('button', { name: 'Orderbook' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'UCOME B100 RFQ' })).toBeNull();
    expect(supplierOffersList).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'My Listings' }));
    await waitFor(() => expect(myOrders).toHaveBeenCalled());
  });

  it('recovers B100 execution capability on Refresh after a catalog load failure', async () => {
    const b100 = { ...listingsResponse.items[0], market_product: 'UCOME_B100', product_name: 'UCOME B100', fuel_type: 'FAME' };
    listAsksPaged.mockResolvedValue({ ...listingsResponse, items: [b100] });
    products.mockRejectedValueOnce(new Error('Temporary catalog failure'));
    renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=UCOME_B100' });
    expect(await screen.findByText('Could not check trading availability. Select Refresh to try again.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Lift Ask' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('button', { name: 'Lift Ask' })).toBeTruthy();
    expect(products).toHaveBeenLastCalledWith({ force: true });
  });

  it('includes B100 in All products and restores a stored B100 selection', async () => {
    localStorage.setItem('verdaxis_marketplace_product', 'UCOME_B100');
    const b100 = { ...listingsResponse.items[0], id: 'ucome-order', product_name: 'UCOME B100', market_product: 'UCOME_B100', fuel_type: 'FAME' };
    listAsksPaged.mockResolvedValue({ ...listingsResponse, items: [b100], total: 1 });
    renderWithProviders(<Marketplace />);
    expect(await screen.findByRole('button', { name: 'Lift Ask' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'UCOME B100' }).getAttribute('aria-pressed')).toBe('true');
    expect(listAsksPaged).toHaveBeenCalledWith(expect.objectContaining({ market_product: 'UCOME_B100' }));
    fireEvent.click(screen.getByRole('button', { name: 'All products' }));
    await waitFor(() => expect(listAsksPaged).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: undefined })));
    expect(document.querySelector('[data-order-id="ucome-order"]')).toBeTruthy();
    expect(tradesInitiate).not.toHaveBeenCalled();
  });

  it('uses the exact slice product when a conflicting product query is present', async () => {
    const CurrentLocation = () => {
      const location = useLocation();
      return <output data-testid="conflicting-url">{location.pathname}{location.search}</output>;
    };
    renderWithProviders(<><CurrentLocation /><Marketplace initialSlice={{ product: 'BIO_METHANOL', port: 'Singapore', window: '2028-Q1' }} /></>,
      { route: '/app/m/bio-methanol/singapore/2028-q1?product=UCOME_B100&view=orderbook' });
    await waitFor(() => expect(screen.getByTestId('conflicting-url').textContent).toBe('/app/m/bio-methanol/singapore/2028-q1?view=orderbook'));
    expect(listAsksPaged.mock.calls.every(([params]) => params.market_product === 'BIO_METHANOL')).toBe(true);
    expect(screen.getByRole('button', { name: /Bio Methanol/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Orderbook' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps B100 slice URLs and their delivery window on the standard market', async () => {
    const CurrentLocation = () => {
      const location = useLocation();
      return <output data-testid="current-url">{location.pathname}{location.search}</output>;
    };
    renderWithProviders(<><CurrentLocation /><Marketplace initialSlice={{ product: 'UCOME_B100', port: 'Singapore', window: '2026-Q4' }} /></>,
      { route: '/app/m/UCOME_B100/Singapore/2026-Q4' });
    await waitFor(() => expect(listAsksPaged).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: 'UCOME_B100', delivery_point_id: 'dp-1', availability: '2026-Q4' })));
    expect(screen.getByTestId('current-url').textContent).toBe('/app/m/ucome-b100/singapore/2026-q4');
    expect(screen.getByRole('button', { name: 'Orderbook' })).toBeTruthy();
    expect(supplierOffersList).not.toHaveBeenCalled();
  });

  it('opens standard Listings from the B100 chip and follows browser history', async () => {
    function HistoryControls() {
      const navigate = useNavigate();
      const location = useLocation();
      return <><button onClick={() => navigate(-1)}>Go back</button><button onClick={() => navigate(1)}>Go forward</button><output data-testid="current-url">{location.pathname}{location.search}</output></>;
    }
    renderWithProviders(<><HistoryControls /><Marketplace /></>, { route: '/app/marketplace' });
    await screen.findByRole('button', { name: 'Lift Ask' });
    fireEvent.click(screen.getByRole('button', { name: 'UCOME B100' }));
    await waitFor(() => expect(listAsksPaged).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: 'UCOME_B100' })));
    expect(screen.getByTestId('current-url').textContent).toBe('/app/marketplace?product=UCOME_B100');
    expect(screen.getByRole('button', { name: 'UCOME B100' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Orderbook' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'More Filters' })).toBeTruthy();
    expect(supplierOffersList).not.toHaveBeenCalled();
    expect(rfqList).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(await screen.findByRole('button', { name: 'Lift Ask' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go forward' }));
    await waitFor(() => expect(listAsksPaged).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: 'UCOME_B100' })));
  });

  it('uses the same delivery filters and Orderbook view for B100', async () => {
    setMarketplaceSlice({ product: 'BIO_ETHANOL', port: 'Singapore', window: 'Q4 2026' });
    renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=UCOME_B100&view=orderbook' });
    await waitFor(() => expect(listAsks).toHaveBeenCalledWith(expect.objectContaining({ market_product: 'UCOME_B100', delivery_point_id: 'dp-1', availability: '2026-Q4' })));
    expect(screen.getByRole('button', { name: 'Orderbook' }).getAttribute('aria-pressed')).toBe('true');
    expect(supplierOffersList).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Bio Methanol/ }));
    await waitFor(() => expect(listAsks).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: 'BIO_METHANOL', delivery_point_id: 'dp-1', availability: '2026-Q4' })));
  });

  it('keeps earlier offers and RFQs in history without new creation controls', async () => {
    renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=UCOME_B100' });
    fireEvent.click(await screen.findByRole('button', { name: 'History' }));
    await screen.findByRole('heading', { name: 'No B100 supplier offers yet' });
    expect(screen.queryByRole('button', { name: 'Post Supply' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Earlier RFQs' }));
    expect(await screen.findByRole('heading', { name: 'B100 RFQs' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create request' })).toBeNull();
    await waitFor(() => expect(rfqList).toHaveBeenCalledWith({ product_id: 'ucome-product', skip: 0, limit: 20 }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to market' }));
    expect(await screen.findByRole('button', { name: 'Orderbook' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'B100 RFQs' })).toBeNull();
  });

  it('opens history from an exact B100 slice without losing the standard market entry', async () => {
    renderWithProviders(<Marketplace initialSlice={{ product: 'UCOME_B100', port: 'Singapore', window: 'SPOT' }} />,
      { route: '/app/m/ucome-b100/singapore/spot' });
    fireEvent.click(await screen.findByRole('button', { name: 'History' }));
    expect(await screen.findByRole('button', { name: 'Back to market' })).toBeTruthy();
    await screen.findByRole('heading', { name: 'No B100 supplier offers yet' });
    expect(supplierOffersList).toHaveBeenCalled();
  });

  it('opens the shared ASK modal for B100 and uses standard supplier My Listings', async () => {
    userRole.current = 'SUPPLIER';
    renderWithProviders(<Marketplace viewMode="SUPPLIER" />, { route: '/app/marketplace?product=UCOME_B100' });
    fireEvent.click(await screen.findByRole('button', { name: 'Place Ask' }));
    expect(orderPlaceModalSpy).toHaveBeenLastCalledWith(expect.objectContaining({ isOpen: true, side: 'ASK', prefillMarketProduct: 'UCOME_B100' }));
    fireEvent.click(screen.getByRole('button', { name: 'My Listings' }));
    await waitFor(() => expect(myOrders).toHaveBeenCalled());
    expect(supplierOffersMy).not.toHaveBeenCalled();
    expect(listBidsPaged).toHaveBeenCalledWith(expect.objectContaining({ market_product: 'UCOME_B100' }));
  });

  it('preserves the historical RFQ restriction during assisted organization sessions', async () => {
    marketSupportActive.current = true;
    renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=UCOME_B100&view=history_rfqs' });
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'B100 offers and requests are unavailable while acting for an organization. Exit the assisted session to use your own account.');
    expect(rfqList).not.toHaveBeenCalled();
    expect(supplierOffersList).not.toHaveBeenCalled();
    expect(supplierOffersMy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Create request' })).toBeNull();
    expect(listAsksPaged).not.toHaveBeenCalled();
  });

  it('clears a canonical B100 query when clearing all market filters', async () => {
    myOrders.mockResolvedValue(listingsResponse.items);
    renderWithProviders(<Marketplace />, { route: '/app/marketplace?product=UCOME_B100&view=my_orders' });
    fireEvent.click(await screen.findByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(listAsksPaged).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: undefined })));
    expect(screen.getByRole('button', { name: 'All products' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('shows canonical market product chips instead of generic fuel families', async () => {
    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bio Methanol \(1\)/i })).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /e-Methanol/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bio Ethanol/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /e-Ethanol/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Methanol( \(|$)/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Ethanol$/i })).toBeNull();
    expect(productCounts).toHaveBeenCalledTimes(1);
    expect(productCounts).toHaveBeenCalledWith({
      side: 'ASK',
      region: undefined,
      delivery_point_id: undefined,
      availability_window: undefined,
      include_off_spec: false,
    });
  });

  it('keeps window, expiry and qualification accessible in the compact product cell', async () => {
    renderWithProviders(<Marketplace />);
    const action = await screen.findByRole('button', { name: 'Lift Ask' });
    const row = action.closest('tr')!;
    const productCell = row.querySelector('td')!;
    expect(within(productCell).getByText('Spot')).toBeTruthy();
    expect(productCell.textContent).toContain('Expiry');
    const disclosure = productCell.querySelector('details')!;
    expect(disclosure).toBeTruthy();
    expect(disclosure.textContent).toContain('ISCC');
    expect(disclosure.querySelector('summary')?.textContent).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Listings' }).getAttribute('aria-pressed')).toBe('true');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'My Listings' }));
    });
    expect(screen.getByRole('button', { name: 'My Listings' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Listings' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('forces fresh listings and grouped counts when the user refreshes', async () => {
    productCounts
      .mockResolvedValueOnce({
        counts: { BIO_METHANOL: 1, E_METHANOL: 0, BIO_ETHANOL: 0, SYNTHETIC_ETHANOL: 0 },
        total: 1,
      })
      .mockResolvedValueOnce({
        counts: { BIO_METHANOL: 2, E_METHANOL: 0, BIO_ETHANOL: 0, SYNTHETIC_ETHANOL: 0 },
        total: 2,
      });

    renderWithProviders(<Marketplace />);
    await screen.findByRole('button', { name: /Bio Methanol \(1\)/i });

    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }));

    await screen.findByRole('button', { name: /Bio Methanol \(2\)/i });
    expect(listAsksPaged).toHaveBeenLastCalledWith(expect.any(Object), { force: true });
    expect(productCounts).toHaveBeenLastCalledWith(expect.any(Object), { force: true });
  });

  it('keeps valid listings visible after a refresh error and resets them for a new filter', async () => {
    renderWithProviders(<Marketplace />);
    expect(await screen.findByRole('button', { name: /lift ask/i })).toBeTruthy();

    listAsksPaged.mockRejectedValueOnce(new Error('Refresh unavailable'));
    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('Refresh unavailable');
    expect(screen.getByRole('button', { name: /lift ask/i })).toBeTruthy();

    listAsksPaged.mockRejectedValueOnce(new Error('Changed filter unavailable'));
    fireEvent.click(screen.getByRole('button', { name: /^e-Methanol/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('Changed filter unavailable');
    expect(screen.queryByRole('button', { name: /lift ask/i })).toBeNull();
  });

  it('suppresses unknown backend English behind the Chinese listings fallback', async () => {
    await i18n.changeLanguage('zh');
    const backendError = new Error('Sensitive backend diagnostic in English');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    listAsksPaged.mockRejectedValue(backendError);

    try {
      renderWithProviders(<Marketplace />);

      expect(await screen.findByText('挂牌加载失败，请重试。')).toBeTruthy();
      expect(screen.queryByText(backendError.message)).toBeNull();
      expect(consoleError).toHaveBeenCalledWith('Marketplace fetch error:', backendError);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('shows the benchmark price next to the row delta in listings', async () => {
    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText(/Benchmark ref \$1,092.00/i)).toBeTruthy();
    });
    expect(screen.getByTitle(/vs order-book reference \$1,092.00\/MT · may include demo listings/i)).toBeTruthy();
    expect(screen.getByText(/-\$12.00/i)).toBeTruthy();
  });

  it('saves the exact listing when the row watchlist button is pressed', async () => {
    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pinned/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /pinned/i }));

    await waitFor(() => {
      expect(togglePin).toHaveBeenCalledWith('ask-1');
    });
    expect(toggleSlice).not.toHaveBeenCalled();
  });

  it('lets the user save the current filtered slice from the filter bar', async () => {
    localStorage.setItem('verdaxis_marketplace_port', 'Singapore');
    localStorage.setItem('verdaxis_marketplace_product', 'BIO_METHANOL');
    localStorage.setItem('verdaxis_marketplace_window', 'SPOT');

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /watching market/i })).toBeTruthy();
    });

    await waitFor(() => {
      expect(listAsksPaged).toHaveBeenCalledWith(expect.objectContaining({
        region: undefined,
        delivery_point_id: 'dp-1',
        market_product: 'BIO_METHANOL',
        availability: 'SPOT',
      }));
    });

    fireEvent.click(screen.getByRole('button', { name: /watching market/i }));

    await waitFor(() => {
      expect(toggleSlice).toHaveBeenCalledWith({
        marketProductCode: 'BIO_METHANOL',
        deliveryPointId: 'dp-1',
        availabilityWindowCode: 'SPOT',
      });
    });
  });


  it('uses the same slice filters when switching from listings to orderbook', async () => {
    localStorage.setItem('verdaxis_marketplace_port', 'Singapore');
    localStorage.setItem('verdaxis_marketplace_product', 'BIO_METHANOL');
    localStorage.setItem('verdaxis_marketplace_window', 'SPOT');

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^listings$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^orderbook$/i }));

    await waitFor(() => {
      expect(listAsks).toHaveBeenCalledWith({
        fuel_type: undefined,
        market_product: 'BIO_METHANOL',
        region: undefined,
        delivery_point_id: 'dp-1',
        availability: 'SPOT',
      });
      expect(listBids).toHaveBeenCalledWith({
        fuel_type: undefined,
        market_product: 'BIO_METHANOL',
        region: undefined,
        delivery_point_id: 'dp-1',
        availability: 'SPOT',
      });
      expect(tradeTapeList).toHaveBeenCalledWith({
        fuel_type: undefined,
        market_product: 'BIO_METHANOL',
        delivery_point_id: 'dp-1',
        region: undefined,
        availability_window: 'SPOT',
        limit: 20,
      });
    });

    expect(screen.getByText(/one exact product, port, and availability window/i)).toBeTruthy();
    expect(screen.getByText(/delivery-point trade tape history/i)).toBeTruthy();
    expect(await screen.findByText('Trade Tape')).toBeTruthy();
  });

  it('keeps orderbook inspection available while assisted trade execution stays blocked', async () => {
    marketSupportActive.current = true;
    setMarketplaceSlice();

    renderWithProviders(<Marketplace />);

    fireEvent.click(await screen.findByRole('button', { name: /^orderbook$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /open ask .* in listings/i }));

    await waitFor(() => {
      expect(document.querySelector('[data-order-id="ask-1"]')?.className).toContain('ring-2');
    });
    expect(screen.queryByRole('button', { name: /lift ask/i })).toBeNull();
  });

  it('does not combine a region-wide book when the named port cannot be resolved', async () => {
    setMarketplaceSlice();
    deliveryPoints.mockResolvedValue([
      { id: 'dp-2', name: 'Rotterdam', region: 'Europe', is_active: true },
    ]);
    renderWithProviders(<Marketplace />, { route: '/app/marketplace?view=orderbook' });
    expect(await screen.findByText(/select a fuel, port, and window to show orderbook/i)).toBeTruthy();
    expect(tradeTapeList).not.toHaveBeenCalled();
    expect(listAsks).not.toHaveBeenCalled();
    expect(listBids).not.toHaveBeenCalled();
  });

  it('does not expose supplied offers or Gasoil through the withdrawn preview URL', async () => {
    setMarketplaceSlice();
    renderWithProviders(<Marketplace />, { route: '/app/marketplace?view=orderbook&preview=supply' });
    expect(await screen.findByText('Trade Tape')).toBeTruthy();
    expect(screen.queryByText('Staging supply preview · 5 offers')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Preview supplied offers' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Gasoil' })).toBeNull();
    expect(document.querySelector('[data-preview-offer]')).toBeNull();
    expect(tradesInitiate).not.toHaveBeenCalled();
  });

  it('keeps the orderbook tab in the URL when changing the canonical product', async () => {
    function CurrentUrl() {
      const location = useLocation();
      return <output data-testid="current-url">{location.pathname}{location.search}</output>;
    }
    renderWithProviders(<>
      <Marketplace initialSlice={{ product: 'BIO_METHANOL', port: 'Singapore', window: 'SPOT' }} />
      <CurrentUrl />
    </>, { route: '/app/m/bio-methanol/singapore/spot?view=orderbook' });
    fireEvent.click(await screen.findByRole('button', { name: /^e-Methanol/ }));
    await waitFor(() => expect(screen.getByTestId('current-url').textContent)
      .toBe('/app/m/e-methanol/singapore/spot?view=orderbook'));
    expect(screen.getByRole('button', { name: 'Orderbook' }).getAttribute('aria-pressed')).toBe('true');
    await waitFor(() => expect(listAsks).toHaveBeenCalledWith(expect.objectContaining({ market_product: 'E_METHANOL' })));
  });

  it.each([
    {
      name: 'missing fuel',
      slice: { port: 'Singapore', product: null, window: 'SPOT' },
      labels: ['All products', 'Singapore', 'Spot'],
      states: [/fuel: missing/i, /port: selected/i, /window: selected/i],
    },
    {
      name: 'missing window',
      slice: { port: 'Singapore', product: 'BIO_METHANOL', window: null },
      labels: ['Bio Methanol', 'Singapore', 'Any window'],
      states: [/fuel: selected/i, /port: selected/i, /window: missing/i],
    },
    {
      name: 'missing port',
      slice: { port: null, product: 'BIO_METHANOL', window: 'SPOT' },
      labels: ['Bio Methanol', 'All ports', 'Spot'],
      states: [/fuel: selected/i, /port: missing/i, /window: selected/i],
    },
  ])('does not show orderbook depth for an inexact slice: $name', async ({ slice, labels, states }) => {
    setMarketplaceSlice(slice);
    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^orderbook$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^orderbook$/i }));

    expect(screen.getByText(/select a fuel, port, and window to show orderbook/i)).toBeTruthy();
    expect(screen.getByText(/choose a specific fuel, port, and availability window above/i)).toBeTruthy();
    const marketScope = document.querySelector('[data-tour="marketplace-market-scope"]') as HTMLElement;
    labels.forEach((label) => expect(within(marketScope).getByText(label)).toBeTruthy());
    states.forEach((state) => expect(screen.getByLabelText(state)).toBeTruthy());
    expect(listAsks).not.toHaveBeenCalled();
    expect(listBids).not.toHaveBeenCalled();
  });


  it('collapses advanced filters by default while keeping fuel selection visible', async () => {
    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /more filters/i })).toBeTruthy();
    });

    // The fuel-count badge fills in after the async listings fetch resolves.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /bio methanol \(1\)/i })).toBeTruthy();
    });
    expect(screen.queryByRole('combobox', { name: 'Port' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /more filters/i }));

    expect(screen.getByRole('combobox', { name: 'Port' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Window' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /hide filters/i })).toBeTruthy();
  });

  it('filters My Listings by the active market slice', async () => {
    localStorage.setItem('verdaxis_marketplace_product', 'E_METHANOL');
    myOrders.mockResolvedValue([
      {
        ...listingsResponse.items[0],
        id: 'mine-bio',
        side: 'BID',
        market_product: 'BIO_METHANOL',
        product_name: 'Bio Methanol',
      },
      {
        ...listingsResponse.items[0],
        id: 'mine-e',
        side: 'BID',
        market_product: 'E_METHANOL',
        product_name: 'e-Methanol',
      },
    ]);

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /my listings/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /my listings/i }));

    await waitFor(() => {
      expect(screen.getByText('e-Methanol')).toBeTruthy();
    });

    expect(screen.queryByText('Bio Methanol')).toBeNull();

    const myListingsRefresh = screen.getAllByRole('button', { name: /^refresh$/i }).at(-1);
    expect(myListingsRefresh).toBeTruthy();
    fireEvent.click(myListingsRefresh as HTMLButtonElement);
    await waitFor(() => expect(myOrders).toHaveBeenLastCalledWith({ force: true }));
  });

  it('forces My Listings after the order placement modal closes from that tab', async () => {
    renderWithProviders(<Marketplace />);
    fireEvent.click(await screen.findByRole('button', { name: /my listings/i }));
    await waitFor(() => expect(myOrders).toHaveBeenCalled());

    const placeOrder = document.querySelector('[data-tour="marketplace-primary-action"]');
    expect(placeOrder).toBeTruthy();
    fireEvent.click(placeOrder as HTMLButtonElement);
    await waitFor(() => expect(orderPlaceModalSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ isOpen: true, onClose: expect.any(Function) }),
    ));
    const modalProps = orderPlaceModalSpy.mock.calls.at(-1)?.[0] as { onClose: () => void };
    myOrders.mockClear();

    act(() => modalProps.onClose());

    await waitFor(() => expect(myOrders).toHaveBeenCalledWith({ force: true }));
  });

  it('shows a filtered empty state in My Listings when account orders exist outside the active slice', async () => {
    localStorage.setItem('verdaxis_marketplace_product', 'E_METHANOL');
    myOrders.mockResolvedValue([
      {
        ...listingsResponse.items[0],
        id: 'mine-bio-only',
        side: 'BID',
        market_product: 'BIO_METHANOL',
        product_name: 'Bio Methanol',
      },
    ]);

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /my listings/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /my listings/i }));

    await waitFor(() => {
      expect(screen.getByText(/no listings match current filters/i)).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: /clear/i })).toBeTruthy();
    expect(screen.queryByText('Bio Methanol')).toBeNull();
  });

  it('hides filled listings from My Listings even if the API returns them', async () => {
    myOrders.mockResolvedValue([
      {
        ...listingsResponse.items[0],
        id: 'open-order',
        side: 'BID',
        product_name: 'Bio Methanol',
        status: 'OPEN',
      },
      {
        ...listingsResponse.items[0],
        id: 'filled-order',
        side: 'BID',
        product_name: 'Filled Bio Methanol',
        status: 'FILLED',
        remaining_quantity_mt: 0,
      },
    ]);

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /my listings/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /my listings/i }));

    await waitFor(() => {
      expect(screen.getByText('Bio Methanol')).toBeTruthy();
    });

    expect(screen.queryByText('Filled Bio Methanol')).toBeNull();
  });

  it('opens the lift ask modal even when marketplace is nested inside a form', async () => {
    renderWithProviders(
      <form>
        <Marketplace />
      </form>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /lift ask/i })).toBeTruthy();
    });

    const liftAsk = screen.getByRole('button', { name: /lift ask/i });
    expect(liftAsk.getAttribute('type')).toBe('button');

    fireEvent.click(liftAsk);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit trade/i })).toBeTruthy();
    });
  });

  it('requires final confirmation and cancels post-trade refresh on unmount', async () => {
    const view = renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /lift ask/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /lift ask/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit trade/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /submit trade/i }));

    expect(tradesInitiate).not.toHaveBeenCalled();
    expect(screen.getByText(/confirm irreversible trade request/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /confirm trade/i }));

    await waitFor(() => {
      expect(tradesInitiate).toHaveBeenCalledWith(expect.objectContaining({
        order_id: 'ask-1',
        quantity_mt: 1000,
        idempotency_key: expect.any(String),
      }));
    });
    await screen.findByText('Trade Request Sent');
    const readsBeforeUnmount = listAsksPaged.mock.calls.length;
    view.unmount();
    await new Promise(resolve => setTimeout(resolve, 2100));
    expect(listAsksPaged).toHaveBeenCalledTimes(readsBeforeUnmount);
  });

  it('retries a timed-out trade with the same payload and idempotency key', async () => {
    tradesInitiate
      .mockRejectedValueOnce(new Error('Request timed out. Please try again.'))
      .mockResolvedValueOnce({});
    renderWithProviders(<Marketplace />);
    await waitFor(() => expect(screen.getByRole('button', { name: /lift ask/i })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /lift ask/i }));
    fireEvent.click(await screen.findByRole('button', { name: /submit trade/i }));
    fireEvent.click(await screen.findByRole('button', { name: /confirm trade/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /retry safely/i })).toBeTruthy());
    const firstPayload = tradesInitiate.mock.calls[0]?.[0];
    expect(firstPayload?.idempotency_key).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /retry safely/i }));

    await waitFor(() => expect(tradesInitiate).toHaveBeenCalledTimes(2));
    expect(tradesInitiate.mock.calls[1]?.[0]).toEqual(firstPayload);
  });

  it('marks demo listings and blocks trade submission', async () => {
    const demoResponse = {
      ...listingsResponse,
      items: listingsResponse.items.map((item) => ({
        ...item,
        is_demo_listing: true,
      })),
    };
    listAsksPaged.mockImplementation(async (params?: { market_product?: string }) => {
      if (!params?.market_product || params.market_product === 'BIO_METHANOL') {
        return demoResponse;
      }
      return { items: [], total: 0, skip: 0, limit: 20 };
    });

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view demo/i })).toBeTruthy();
    });

    expect(screen.getByText('Demo')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /view demo/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/demo listing/i).length).toBeGreaterThan(0);
    });

    const disabledTrade = screen.getByRole('button', { name: /demo listing - trading disabled/i });
    expect((disabledTrade as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(disabledTrade);
    expect(tradesInitiate).not.toHaveBeenCalled();
  });

  it('passes the active canonical slice into the supplier ask modal', async () => {
    userRole.current = 'SUPPLIER';
    localStorage.setItem('verdaxis_marketplace_port', 'Singapore');
    localStorage.setItem('verdaxis_marketplace_product', 'BIO_METHANOL');
    localStorage.setItem('verdaxis_marketplace_window', 'SPOT');

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /place ask/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /place ask/i }));

    await waitFor(() => {
      expect(orderPlaceModalSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isOpen: true,
          side: 'ASK',
          prefillMarketProduct: 'BIO_METHANOL',
          prefillDeliveryPointId: 'dp-1',
          prefillAvailabilityWindow: 'SPOT',
        })
      );
    });
  });

  it('uses the supplier-side controls when an admin switches to supplier view', async () => {
    userRole.current = 'ADMIN';
    localStorage.setItem('verdaxis_marketplace_port', 'Singapore');
    localStorage.setItem('verdaxis_marketplace_product', 'BIO_METHANOL');
    localStorage.setItem('verdaxis_marketplace_window', 'SPOT');

    renderWithProviders(<Marketplace viewMode="SUPPLIER" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /place ask/i })).toBeTruthy();
    });

    expect(listBidsPaged).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /place ask/i }));

    await waitFor(() => {
      expect(orderPlaceModalSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isOpen: true,
          side: 'ASK',
          prefillMarketProduct: 'BIO_METHANOL',
          prefillDeliveryPointId: 'dp-1',
          prefillAvailabilityWindow: 'SPOT',
        })
      );
    });
  });

  it('disables trade submission when the quantity input is invalid', async () => {
    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /lift ask/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /lift ask/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit trade/i })).toBeTruthy();
    });

    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: 'abc' },
    });

    const submit = screen.getByRole('button', { name: /submit trade/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(submit);
    expect(tradesInitiate).not.toHaveBeenCalled();
  });

  it('fetches the FuelEU overlay for visible asks and renders the hint', async () => {
    pricingOverlay.mockResolvedValue({
      overlays: {
        'ask-1': {
          penalty_avoided_eur_per_mt: '768.75',
          penalty_avoided_usd_per_mt: '830.25',
          tco2e_avoided_per_mt: '1.197',
          ci_gco2_mj: '31',
          ci_basis: 'LISTING',
          lcv_mj_kg: '19.9',
          lcv_basis: 'PRODUCT_DEFAULT',
        },
      },
      assumptions: overlayAssumptionsFixture,
    });

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(pricingOverlay).toHaveBeenCalledWith(['ask-1']);
    });
    await waitFor(() => {
      expect(screen.getByText('Regulatory benefit unpriced')).toBeTruthy();
    });
    expect(screen.getByText('1.20 tCO₂e/MT lifecycle gap')).toBeTruthy();
  });

  it('degrades to no hint when the overlay fetch fails', async () => {
    pricingOverlay.mockRejectedValue(new Error('boom'));

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(pricingOverlay).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /lift ask/i })).toBeTruthy();
    });
    expect(screen.queryByText(/Regulatory benefit unpriced/)).toBeNull();
  });

  it('does not request overlays for bid listings (supplier view)', async () => {
    userRole.current = 'SUPPLIER';

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(listBidsPaged).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
    expect(pricingOverlay).not.toHaveBeenCalled();
  });

  it('discards a stale response after the user changes market product', async () => {
    let resolveBio!: (value: typeof listingsResponse) => void;
    let resolveE!: (value: typeof listingsResponse) => void;
    const bioRequest = new Promise<typeof listingsResponse>(resolve => { resolveBio = resolve; });
    const eRequest = new Promise<typeof listingsResponse>(resolve => { resolveE = resolve; });
    setMarketplaceSlice();
    listAsksPaged.mockImplementation(({ market_product } = {}) => (
      market_product === 'E_METHANOL' ? eRequest : bioRequest
    ));

    renderWithProviders(<Marketplace />);
    fireEvent.click(await screen.findByRole('button', { name: /e-Methanol/i }));

    await act(async () => {
      resolveE({
        ...listingsResponse,
        items: [{ ...listingsResponse.items[0], id: 'ask-e', market_product: 'E_METHANOL', product_name: 'e-Methanol' }],
      });
    });
    let listingRow = (await screen.findByRole('button', { name: /lift ask/i })).closest('tr') as HTMLElement;
    expect(within(listingRow).getByText('e-Methanol')).toBeTruthy();

    await act(async () => {
      resolveBio(listingsResponse);
    });
    listingRow = screen.getByRole('button', { name: /lift ask/i }).closest('tr') as HTMLElement;
    expect(within(listingRow).getByText('e-Methanol')).toBeTruthy();
    expect(within(listingRow).queryByText('Bio Methanol')).toBeNull();
  });

});
