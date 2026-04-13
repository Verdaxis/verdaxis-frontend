import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from './test-utils';
import { Marketplace } from '../components/Marketplace';

const { listAsksPaged, myOrders } = vi.hoisted(() => ({
  listAsksPaged: vi.fn(),
  myOrders: vi.fn(),
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
      name: 'Market Radar',
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
    toggleSlice: vi.fn(),
    togglePin: vi.fn(),
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
      initiate: vi.fn(),
    },
  },
}));

describe('Marketplace green fuels surface', () => {
  it('shows radar actions only for supported green-fuel listings', async () => {
    listAsksPaged.mockResolvedValue({
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
    });
    myOrders.mockResolvedValue([]);

    renderWithProviders(<Marketplace />);

    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });

    expect(screen.queryByText('Biofuel')).toBeNull();
    expect(screen.queryByText('Ammonia')).toBeNull();
    expect(screen.getByRole('button', { name: /tracked/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /pinned/i })).toBeTruthy();
  });
});
