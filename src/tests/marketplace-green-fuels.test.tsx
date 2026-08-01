import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from './test-utils';
import { Marketplace } from '../components/Marketplace';

const { userRole, marketSupportActive, orderPlaceModalSpy, listAsksPaged, listBidsPaged, listAsks, listBids, myOrders, deliveryPoints, toggleSlice, togglePin, tradeTapeList, tradesInitiate, pricingOverlay } = vi.hoisted(() => ({
  userRole: { current: 'BUYER' as 'BUYER' | 'SUPPLIER' | 'ADMIN' },
  marketSupportActive: { current: false },
  pricingOverlay: vi.fn(),
  orderPlaceModalSpy: vi.fn(),
  listAsksPaged: vi.fn(),
  listBidsPaged: vi.fn(),
  listAsks: vi.fn(),
  listBids: vi.fn(),
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
      deliveryPoints,
    },
    orderbook: {
      listAsksPaged,
      listBidsPaged,
      listAsks,
      listBids,
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
  beforeEach(() => {
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
    myOrders.mockResolvedValue([]);
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
  });

  it('shows the benchmark price next to the row delta in listings', async () => {
    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText(/Benchmark ref \$1,092.00/i)).toBeTruthy();
    });
    expect(screen.getByTitle(/vs benchmark reference \$1,092.00\/MT/i)).toBeTruthy();
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

  it('labels trade tape as region-level when the selected port has no resolved delivery point', async () => {
    localStorage.setItem('verdaxis_marketplace_port', 'Singapore');
    localStorage.setItem('verdaxis_marketplace_product', 'BIO_METHANOL');
    localStorage.setItem('verdaxis_marketplace_window', 'SPOT');
    deliveryPoints.mockResolvedValue([
      { id: 'dp-2', name: 'Rotterdam', region: 'Europe', is_active: true },
    ]);

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^orderbook$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^orderbook$/i }));

    await waitFor(() => {
      expect(tradeTapeList).toHaveBeenCalledWith(expect.objectContaining({
        delivery_point_id: undefined,
        region: 'Singapore',
      }));
    });

    // The labels render only after the tape response is processed, one React
    // commit after the mock-call assertion above resolves.
    await waitFor(() => {
      expect(screen.getByText(/trade tape history is shown at region level/i)).toBeTruthy();
      expect(screen.getByText('24h market · 7D region history')).toBeTruthy();
    });
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
    labels.forEach((label) => expect(screen.getByText(label)).toBeTruthy());
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

  it('requires a final confirmation before submitting a real trade', async () => {
    renderWithProviders(<Marketplace />);

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
      expect(tradesInitiate).toHaveBeenCalledWith({
        order_id: 'ask-1',
        quantity_mt: 1000,
      });
    });
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
      expect(screen.getByRole('button', { name: /lift ask/i })).toBeTruthy();
    });

    expect(screen.getByText('Demo')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /lift ask/i }));

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
          ci_basis: 'PRODUCT_DEFAULT',
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
      expect(screen.getByText('FuelEU −$830/MT')).toBeTruthy();
    });
    expect(screen.getByText('1.20 tCO₂e/MT avoided')).toBeTruthy();
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
    expect(screen.queryByText(/FuelEU −\$/)).toBeNull();
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

});
