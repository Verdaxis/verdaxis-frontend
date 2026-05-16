import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './test-utils';
import { SupplierDemandFeed } from '../components/SupplierDemandFeed';

const demandSignalsMock = vi.fn();
const listBidsMock = vi.fn();

vi.mock('../services/api', () => ({
  api: {
    demand: {
      signals: (...args: unknown[]) => demandSignalsMock(...args),
    },
    orderbook: {
      listBids: (...args: unknown[]) => listBidsMock(...args),
    },
  },
}));

describe('SupplierDemandFeed', () => {
  beforeEach(() => {
    demandSignalsMock.mockReset();
    listBidsMock.mockReset();
	    demandSignalsMock.mockResolvedValue([
	      {
	        fuel_type: 'Methanol',
	        region: 'Asia',
	        market_product_code: 'BIO_METHANOL',
	        delivery_point_id: 'dp-1',
	        delivery_point_name: 'Singapore',
	        availability_window_code: 'SPOT',
	        volume_mt: 2500,
	        max_price_per_mt: 720,
        urgency: 'HIGH',
        bid_count: 3,
        earliest_delivery: 'Spot',
        created_at: '2026-04-13T00:00:00Z',
	      },
	    ]);
	    localStorage.clear();
	  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders aggregated buyer demand signals without reading raw bid listings', async () => {
    const onNavigate = vi.fn();
    const onPostAsk = vi.fn();

	    renderWithProviders(<SupplierDemandFeed onNavigate={onNavigate} onPostAsk={onPostAsk} />);

	    expect(await screen.findByText('Where buyers are looking')).toBeTruthy();
	    expect(await screen.findByText('Bio Methanol')).toBeTruthy();
	    expect(screen.getByText('Singapore · Spot')).toBeTruthy();
	    expect(screen.getByText('2,500 MT')).toBeTruthy();
    expect(screen.getByText('$720')).toBeTruthy();
    expect(demandSignalsMock).toHaveBeenCalledTimes(1);
    expect(listBidsMock).not.toHaveBeenCalled();

	    fireEvent.click(screen.getByRole('button', { name: /View live bids/i }));
	    expect(onNavigate).toHaveBeenCalledWith('MARKETPLACE');
	    expect(localStorage.getItem('verdaxis_marketplace_product')).toBe('BIO_METHANOL');
	    expect(localStorage.getItem('verdaxis_marketplace_port')).toBe('Singapore');
	    expect(localStorage.getItem('verdaxis_marketplace_window')).toBe('SPOT');

    fireEvent.click(screen.getByRole('button', { name: /Post Ask/i }));
    expect(onPostAsk).toHaveBeenCalledTimes(1);
  });

  it('distinguishes zero demand from a failed demand load', async () => {
    demandSignalsMock.mockResolvedValueOnce([]);
    const onNavigate = vi.fn();

    renderWithProviders(<SupplierDemandFeed onNavigate={onNavigate} onPostAsk={() => undefined} />);

    expect(await screen.findByText(/No aggregated buyer demand is visible yet/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Browse bids/i }));
    expect(onNavigate).toHaveBeenCalledWith('MARKETPLACE');
  });

  it('shows a degraded state when demand signals fail', async () => {
    demandSignalsMock.mockRejectedValueOnce(new Error('backend unavailable'));

    renderWithProviders(<SupplierDemandFeed onNavigate={() => undefined} onPostAsk={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText('Demand signals unavailable')).toBeTruthy();
      expect(screen.getByText('backend unavailable')).toBeTruthy();
    });
  });
});
