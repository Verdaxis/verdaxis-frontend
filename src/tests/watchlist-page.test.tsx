import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from './test-utils';
import { WatchlistPage } from '../components/WatchlistPage';

vi.mock('../hooks/useWatchlist', () => ({
  useWatchlist: () => ({
    radar: {
      id: 'radar-1',
      name: 'Watchlist',
      kind: 'RADAR_DEFAULT',
      unread_event_count: 2,
      latest_event_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      slices: [
        {
          id: 'slice-1',
          target_type: 'SLICE',
          market_product_code: 'BIO_METHANOL',
          delivery_point_id: 'dp-1',
          delivery_point_name: 'Singapore',
          availability_window_code: 'SPOT',
          active_order_count: 3,
          unread_event_count: 2,
          latest_event_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          pins: [
            {
              id: 'pin-1',
              target_type: 'PIN',
              market_product_code: 'BIO_METHANOL',
              delivery_point_id: 'dp-1',
              delivery_point_name: 'Singapore',
              availability_window_code: 'SPOT',
              order_id: 'ask-1',
              snapshot_price_per_mt_usd: 1080,
              snapshot_quantity_mt: 1000,
              snapshot_remaining_quantity_mt: 600,
              snapshot_status: 'PARTIALLY_FILLED',
              snapshot_side: 'ASK',
              snapshot_market_product: 'Bio Methanol',
              snapshot_delivery_point_name: 'Singapore',
              snapshot_availability_window: 'SPOT',
              snapshot_counterparty_label: null,
              active_order_count: 0,
              unread_event_count: 1,
              latest_event_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          ],
        },
      ],
    },
    events: [
      {
        id: 'event-1',
        watchlist_id: 'radar-1',
        watchlist_target_id: 'slice-1',
        target_type: 'SLICE',
        event_type: 'SLICE_NEW_ORDER',
        event_payload: { side: 'ASK', price_per_mt_usd: 1080 },
        is_read: false,
        created_at: '2026-04-13T12:00:00Z',
      },
      {
        id: 'event-2',
        watchlist_id: 'radar-1',
        watchlist_target_id: 'pin-1',
        target_type: 'PIN',
        event_type: 'PIN_PARTIALLY_FILLED',
        event_payload: { new_remaining_quantity_mt: 600 },
        is_read: false,
        created_at: '2026-04-13T12:05:00Z',
      },
    ],
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

describe('WatchlistPage', () => {
  it('renders market slices, pinned orders, and event feed', () => {
    renderWithProviders(<WatchlistPage />);

    expect(screen.getByRole('heading', { name: /Everything you are watching, in one place\./i })).toBeTruthy();
    expect(screen.getAllByText(/Bio Methanol · Singapore · Spot/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/No Watchlist activity yet/i)).toBeNull();
    expect(screen.getAllByText(/Pinned order partially filled/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /mark read/i }).length).toBeGreaterThan(0);
  });
});
