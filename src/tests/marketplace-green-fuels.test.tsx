import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from './test-utils';
import { Marketplace } from '../components/Marketplace';

const { listAsksPaged, myOrders, toggleSlice, togglePin, tradesInitiate } = vi.hoisted(() => ({
  listAsksPaged: vi.fn(),
  myOrders: vi.fn(),
  toggleSlice: vi.fn(),
  togglePin: vi.fn(),
  tradesInitiate: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'BUYER' },
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
  OrderPlaceModal: () => null,
}));

vi.mock('../components/ui/Pagination', () => ({
  Pagination: () => null,
}));

vi.mock('../services/api', () => ({
  api: {
    orderbook: {
      listAsksPaged,
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
    localStorage.clear();
    listAsksPaged.mockResolvedValue(listingsResponse);
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
      expect(screen.getByRole('button', { name: /watching slice/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /watching slice/i }));

    await waitFor(() => {
      expect(toggleSlice).toHaveBeenCalledWith({
        marketProductCode: 'BIO_METHANOL',
        deliveryPointId: 'dp-1',
        availabilityWindowCode: 'SPOT',
      });
    });
  });

  it('disables trade submission when the quantity input is invalid', async () => {
    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hit ask/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /hit ask/i }));

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
