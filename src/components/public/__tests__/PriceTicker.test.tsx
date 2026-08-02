import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PriceTicker } from '../PriceTicker';
import { fetchFuelPrices } from '../../../data/fuelPrices';

vi.mock('../../../data/fuelPrices', () => ({
  fetchFuelPrices: vi.fn(),
  buildFuelTickerItems: (prices: unknown[]) => prices.map(price => ({ ...price, kind: 'price' })),
  DEMO_FUEL_PRICES: [
    {
      fuel: 'Bio Methanol',
      region: 'Singapore',
      price: 985,
      unit: 'USD/mt',
      change: null,
      source: 'marketplace-demo',
      sourceLabel: 'Demo',
      priceDate: '',
      availabilityWindow: '2026-08',
    },
  ],
}));

const mockedFetchFuelPrices = vi.mocked(fetchFuelPrices);

const fuelPrices = [
  {
    fuel: 'Bio Methanol',
    region: 'Singapore',
    price: 985,
    unit: 'USD/mt',
    change: null,
    source: 'marketplace-demo',
    sourceLabel: 'Demo',
    priceDate: '2026-08-01',
    availabilityWindow: '2026-08',
  },
  {
    fuel: 'e-Ethanol',
    region: 'Shanghai',
    price: 1207.5,
    unit: 'USD/mt',
    change: null,
    source: 'marketplace-demo',
    sourceLabel: 'Demo',
    priceDate: '2026-08-01',
    availabilityWindow: '2026-08',
  },
];

describe('PriceTicker', () => {
  beforeEach(() => {
    mockedFetchFuelPrices.mockResolvedValue(fuelPrices);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders marketplace demo items in a focus-pausable ticker', async () => {
    const { container } = render(<PriceTicker />);

    const ticker = await screen.findByLabelText(/demo marketplace price ticker/i);
    const track = container.querySelector('.public-price-ticker__track');

    expect(ticker).toBeTruthy();
    expect((ticker as HTMLElement).tabIndex).toBe(0);
    expect(track).toBeTruthy();
    expect(screen.getAllByText('Bio Methanol')).toHaveLength(2);
    expect(screen.getAllByText('e-Ethanol')).toHaveLength(2);
    expect(screen.getAllByText('Demo')).toHaveLength(4);
    expect(screen.getAllByText('Verdaxis')).toHaveLength(4);
    expect(screen.getAllByText('1 Aug 2026')).toHaveLength(4);
    expect(container.querySelectorAll('[data-ticker-sequence="primary"]')).toHaveLength(fuelPrices.length);
    expect(container.querySelectorAll('[data-ticker-sequence="duplicate"][aria-hidden="true"]')).toHaveLength(fuelPrices.length);
    expect(mockedFetchFuelPrices).toHaveBeenCalledTimes(1);
    expect(mockedFetchFuelPrices.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });

  it('retains visible demo values if the marketplace request fails', async () => {
    mockedFetchFuelPrices.mockRejectedValue(new Error('unavailable'));

    const { container } = render(<PriceTicker />);

    await waitFor(() => {
      expect(screen.getAllByText('Bio Methanol')).toHaveLength(2);
    });

    expect(container.querySelector('.public-price-ticker')?.getAttribute('tabindex')).toBe('0');
    expect(screen.queryByText(/unavailable/i)).toBeNull();
  });
});
