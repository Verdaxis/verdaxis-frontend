import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PriceTicker } from '../PriceTicker';
import { fetchFuelPrices } from '../../../data/fuelPrices';

vi.mock('../../../data/fuelPrices', () => ({
  fetchFuelPrices: vi.fn(),
}));

const mockedFetchFuelPrices = vi.mocked(fetchFuelPrices);

const fuelPrices = [
  {
    fuel: 'VLSFO',
    region: 'Global bunker',
    price: 896.5,
    unit: 'USD/mt',
    change: 0.73,
    source: 'ship_bunker',
    sourceLabel: 'Ship & Bunker',
    priceDate: '2026-04-24',
  },
  {
    fuel: 'Corn',
    region: 'Biofuel feedstock',
    price: 464,
    unit: 'USc/bu',
    change: -0.87,
    source: 'yfinance',
    sourceLabel: 'Yahoo Finance',
    priceDate: '2026-04-24',
  },
];

describe('PriceTicker', () => {
  beforeEach(() => {
    mockedFetchFuelPrices.mockResolvedValue(fuelPrices);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders ready benchmark items in a focus-pausable ticker', async () => {
    const { container } = render(<PriceTicker />);

    const ticker = await screen.findByLabelText(/market benchmark ticker/i);
    const track = container.querySelector('.public-price-ticker__track');

    expect(ticker).toBeTruthy();
    expect((ticker as HTMLElement).tabIndex).toBe(0);
    expect(track).toBeTruthy();
    expect(screen.getAllByText('VLSFO')).toHaveLength(2);
    expect(screen.getAllByText('Corn')).toHaveLength(2);
    expect(container.querySelectorAll('[data-ticker-sequence="primary"]')).toHaveLength(fuelPrices.length);
    expect(container.querySelectorAll('[data-ticker-sequence="duplicate"][aria-hidden="true"]')).toHaveLength(fuelPrices.length);
    expect(mockedFetchFuelPrices).toHaveBeenCalledTimes(1);
    expect(mockedFetchFuelPrices.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });

  it('keeps loading and error states non-focusable', async () => {
    mockedFetchFuelPrices.mockRejectedValue(new Error('unavailable'));

    const { container } = render(<PriceTicker />);

    expect(screen.getByRole('status').textContent).toContain('Loading market benchmarks…');

    await waitFor(() => {
      expect(screen.getByText('Market benchmarks unavailable')).toBeTruthy();
    });

    expect(container.querySelector('.public-price-ticker')?.getAttribute('tabindex')).toBeNull();
    expect(screen.queryByLabelText(/market benchmark ticker/i)).toBeNull();
  });
});
