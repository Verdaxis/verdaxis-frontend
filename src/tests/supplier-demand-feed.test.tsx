import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SupplierDemandFeed } from '../components/SupplierDemandFeed';
import { renderWithProviders } from './test-utils';

const listBidsMock = vi.fn();

vi.mock('../services/api', () => ({
  api: {
    orderbook: {
      listBids: (...args: unknown[]) => listBidsMock(...args),
    },
  },
}));

describe('SupplierDemandFeed', () => {
  beforeEach(() => {
    listBidsMock.mockReset();
    listBidsMock.mockResolvedValue([
      {
        id: 'bid-1',
        side: 'BID',
        fuel_type: 'Methanol',
        fuel_grade: 'Bio',
        region: 'Singapore',
        quantity_mt: 2500,
        price_per_mt_usd: 720,
        availability_window: 'SPOT',
        status: 'OPEN',
        created_at: '2026-04-13T00:00:00Z',
      },
    ]);
  });

  it('renders active buyer bids as supplier demand shortcuts', async () => {
    const onNavigate = vi.fn();

    renderWithProviders(<SupplierDemandFeed onNavigate={onNavigate} />);

    expect(await screen.findByText('1 active bid')).toBeTruthy();
    expect(screen.getByText('Methanol')).toBeTruthy();
    expect(screen.getByText('Bio')).toBeTruthy();
    expect(screen.getByText('2,500 MT')).toBeTruthy();
    expect(screen.getByText('$720/MT')).toBeTruthy();
    expect(screen.getByText('Singapore • Spot')).toBeTruthy();
    expect(listBidsMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Methanol/i }));
    expect(onNavigate).toHaveBeenCalledWith('MARKETPLACE');
  });

  it('shows the empty buyer demand state when no open bids are visible', async () => {
    listBidsMock.mockResolvedValueOnce([]);

    renderWithProviders(<SupplierDemandFeed onNavigate={() => undefined} />);

    expect(await screen.findByText(/No buyer demand matches your profile yet/i)).toBeTruthy();
  });

  it('uses the same non-critical empty state when bid loading fails', async () => {
    listBidsMock.mockRejectedValueOnce(new Error('backend unavailable'));

    renderWithProviders(<SupplierDemandFeed onNavigate={() => undefined} />);

    expect(await screen.findByText(/No buyer demand matches your profile yet/i)).toBeTruthy();
  });
});
