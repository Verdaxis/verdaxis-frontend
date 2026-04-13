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
    watchlists: [
      {
        id: 'watchlist-1',
        entries: [
          {
            product_id: 'product-1',
            product_name: 'Methanol Green',
            delivery_point_id: 'dp-1',
            delivery_point_name: 'Singapore',
          },
          {
            product_id: 'product-2',
            product_name: 'Biofuel Bio',
            delivery_point_id: 'dp-1',
            delivery_point_name: 'Singapore',
          },
        ],
      },
    ],
    defaultWatchlistId: 'watchlist-1',
    isWatched: () => false,
    toggleWatch: vi.fn(),
    loading: false,
  }),
}));

vi.mock('../components/OrderBook', () => ({
  OrderBook: () => <div>Live Orderbook</div>,
}));

vi.mock('../components/TradeTape', () => ({
  TradeTape: () => <div>Trade Tape</div>,
}));

vi.mock('../components/NewsFeed', () => ({
  NewsFeed: () => <div>News Feed</div>,
}));

vi.mock('../components/RFQPanel', () => ({
  RFQPanel: () => <div>RFQ</div>,
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
  it('hides the old orderbook surface and unsupported fuel chips', async () => {
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

    expect(screen.queryByText('Live Orderbook')).toBeNull();
    expect(screen.queryByText('Biofuel')).toBeNull();
    expect(screen.queryByText('Ammonia')).toBeNull();
    expect(screen.queryByText('Biofuel Bio')).toBeNull();
  });
});
