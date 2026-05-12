import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from './test-utils';
import { Marketplace } from '../components/Marketplace';

const { userRole, orderPlaceModalSpy, listAsksPaged, listBidsPaged, listAsks, listBids, myOrders, toggleSlice, togglePin, tradesInitiate } = vi.hoisted(() => ({
  userRole: { current: 'BUYER' as 'BUYER' | 'SUPPLIER' },
  orderPlaceModalSpy: vi.fn(),
  listAsksPaged: vi.fn(),
  listBidsPaged: vi.fn(),
  listAsks: vi.fn(),
  listBids: vi.fn(),
  myOrders: vi.fn(),
  toggleSlice: vi.fn(),
  togglePin: vi.fn(),
  tradesInitiate: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: userRole.current },
  }),
}));

vi.mock('../context/CopilotContext', () => ({
  useCopilotContext: () => ({
    setPageContext: vi.fn(),
  }),
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
  },
}));

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

describe('Marketplace green fuels surface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userRole.current = 'BUYER';
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
    toggleSlice.mockResolvedValue(true);
    togglePin.mockResolvedValue(true);
    tradesInitiate.mockResolvedValue({ status: 'PENDING_CONFIRMATION' });
  });

  it('shows canonical market product chips instead of generic fuel families', async () => {
    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: /Bio Methanol \(1\)/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /e-Methanol/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bio Ethanol/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Synthetic Ethanol/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Methanol( \(|$)/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Ethanol$/i })).toBeNull();
  });


  it('shows the benchmark price next to the row delta in listings', async () => {
    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });

    expect(screen.getByText(/vs benchmark \$1,092.00\/MT/i)).toBeTruthy();
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
        region: 'Singapore',
        availability: 'SPOT',
      });
      expect(listBids).toHaveBeenCalledWith({
        fuel_type: undefined,
        market_product: 'BIO_METHANOL',
        region: 'Singapore',
        availability: 'SPOT',
      });
    });

    expect(screen.getByText(/exact same product, port, and window filters as listings/i)).toBeTruthy();
  });

  it('anchors demo ask markers on the ask edge and blocks demo trade execution', async () => {
    localStorage.setItem('verdaxis_marketplace_port', 'Singapore');
    localStorage.setItem('verdaxis_marketplace_product', 'BIO_METHANOL');
    localStorage.setItem('verdaxis_marketplace_window', 'SPOT');
    listAsks.mockResolvedValue([{ ...listingsResponse.items[0], is_demo_listing: true }]);
    listBids.mockResolvedValue([]);

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^orderbook$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^orderbook$/i }));

    const marker = await screen.findByLabelText('Demo ask listing');
    expect(marker.parentElement?.className).toContain('right-1');

    fireEvent.click(screen.getByTitle(/click to buy at this price/i));

    await waitFor(() => {
      expect(screen.getByText(/not user-posted liquidity/i)).toBeTruthy();
    });

    expect(screen.queryByRole('button', { name: /submit trade/i })).toBeNull();
    expect((screen.getByRole('button', { name: /demo listing/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(tradesInitiate).not.toHaveBeenCalled();
  });

  it('asks the user to select a fuel before showing the orderbook when all products are selected', async () => {
    localStorage.setItem('verdaxis_marketplace_port', 'Singapore');
    localStorage.removeItem('verdaxis_marketplace_product');
    localStorage.setItem('verdaxis_marketplace_window', 'SPOT');

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^orderbook$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^orderbook$/i }));

    expect(screen.getByText(/select a fuel to show orderbook/i)).toBeTruthy();
    expect(screen.getByText(/choose a fuel above to load bids and asks/i)).toBeTruthy();
    expect(listAsks).not.toHaveBeenCalled();
    expect(listBids).not.toHaveBeenCalled();
  });


  it('collapses advanced filters by default while keeping fuel selection visible', async () => {
    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /more filters/i })).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: /bio methanol \(1\)/i })).toBeTruthy();
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

});
