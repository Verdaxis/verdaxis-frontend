import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { MarketWatchTicker } from '../components/map/MarketWatchTicker';
import { PORTS } from '../data';
import { renderWithProviders } from './test-utils';

const priceSummariesMock = vi.fn();

vi.mock('../services/api', () => ({
  api: {
    prices: {
      getSummaries: (...args: unknown[]) => priceSummariesMock(...args),
    },
  },
}));

const STORAGE_KEY = 'verdaxis_market_watch_preferences_v1';

const makeSummary = (overrides: Record<string, unknown> = {}) => ({
  market_product: 'BIO_METHANOL',
  delivery_point_id: 'sg-sin',
  delivery_point_name: 'Singapore',
  availability_window: 'SPOT',
  fuel_type: 'Methanol',
  region: 'Singapore',
  last_price: 777,
  avg_price_24h: 770,
  high_24h: 790,
  low_24h: 760,
  volume_24h: 5000,
  trade_count_24h: 2,
  price_change_pct: 1.4,
  last_trade_at: new Date().toISOString(),
  ...overrides,
});

describe('MarketWatchTicker', () => {
  beforeEach(() => {
    localStorage.clear();
    priceSummariesMock.mockReset();
    priceSummariesMock.mockResolvedValue({ summaries: [], generated_at: new Date().toISOString() });
  });

  it('renders mixed live, reference, and no-data rows with row-level source labels', async () => {
    priceSummariesMock.mockImplementation(({ delivery_point_id }) => Promise.resolve({
      summaries: delivery_point_id === 'sg-sin' ? [makeSummary()] : [],
      generated_at: new Date().toISOString(),
    }));

    renderWithProviders(<MarketWatchTicker isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => {
      expect(screen.getByText('$777')).toBeTruthy();
    });

    expect(screen.getByText('$680')).toBeTruthy();
    expect(screen.getByText('--')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('Reference')).toBeTruthy();
    expect(screen.getByText('No data')).toBeTruthy();
    expect(priceSummariesMock).toHaveBeenCalledWith(expect.objectContaining({
      market_product: 'BIO_METHANOL',
      delivery_point_id: 'sg-sin',
      availability_window: 'SPOT',
      hours: 168,
    }));
    expect(priceSummariesMock).not.toHaveBeenCalledWith(expect.objectContaining({ region: 'Singapore' }));
  });

  it('does not use generic fuel-family summaries for a different canonical product', async () => {
    priceSummariesMock.mockImplementation(({ delivery_point_id }) => Promise.resolve({
      summaries: delivery_point_id === 'sg-sin'
        ? [makeSummary({ market_product: 'E_METHANOL', delivery_point_id: 'sg-sin' })]
        : [],
      generated_at: new Date().toISOString(),
    }));

    renderWithProviders(<MarketWatchTicker isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => {
      expect(screen.queryByText('$777')).toBeNull();
    });
    expect(screen.getAllByText('No data').length).toBeGreaterThan(0);
  });

  it('marks old seven-day summary trades as stale, not live', async () => {
    priceSummariesMock.mockImplementation(({ delivery_point_id }) => Promise.resolve({
      summaries: delivery_point_id === 'sg-sin'
        ? [makeSummary({ trade_count_24h: 3, last_trade_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() })]
        : [],
      generated_at: new Date().toISOString(),
    }));

    renderWithProviders(<MarketWatchTicker isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => {
      expect(screen.getByText('$777')).toBeTruthy();
    });

    expect(screen.getByText('Stale')).toBeTruthy();
    expect(screen.queryByText('Live')).toBeNull();
  });

  it('recovers from malformed preferences and persists sanitized defaults', async () => {
    localStorage.setItem(STORAGE_KEY, '{bad-json');

    renderWithProviders(<MarketWatchTicker isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => {
      expect(priceSummariesMock).toHaveBeenCalled();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.product).toBe('BIO_METHANOL');
    expect(stored.portIds).toEqual(['nl-rtm', 'sg-sin', 'br-ssz']);
  });

  it('validates stored product and clamps pinned ports to three approved ports', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      product: 'Methanol',
      portIds: ['sg-sin', 'nl-rtm', 'br-ssz', 'bad-port', 'us-hou'],
    }));

    renderWithProviders(<MarketWatchTicker isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => {
      expect(priceSummariesMock).toHaveBeenCalled();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.product).toBe('BIO_METHANOL');
    expect(stored.portIds).toEqual(['sg-sin', 'nl-rtm', 'br-ssz']);
  });

  it('prevents adding a fourth pinned delivery point until one is removed', async () => {
    renderWithProviders(<MarketWatchTicker isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => {
      expect(priceSummariesMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Configure market watch' }));

    const shanghaiButton = screen.getByRole('button', { name: 'Shanghai' }) as HTMLButtonElement;
    expect(shanghaiButton.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Rotterdam' }));
    expect(shanghaiButton.getAttribute('aria-disabled')).toBe('false');

    fireEvent.click(shanghaiButton);
    await waitFor(() => {
      expect(shanghaiButton.getAttribute('aria-pressed')).toBe('true');
    });
  });
});
