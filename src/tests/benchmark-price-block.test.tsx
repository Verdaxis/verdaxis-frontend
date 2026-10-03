import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { BenchmarkPriceBlock } from '../components/trading/BenchmarkPriceBlock';
import { renderWithProviders } from './test-utils';

describe('BenchmarkPriceBlock', () => {
  it('labels benchmark context as reference data and keeps the delta pill unchanged', () => {
    renderWithProviders(
      <BenchmarkPriceBlock
        priceUsd={1080}
        benchmarkUsd={1092}
        deltaUsd={-12}
        benchmarkSource="live_slice_ask_vwap"
        contextUpdatedAt="2026-10-03 07:00 UTC"
      />
    );

    expect(screen.getByText('$1,080.00')).toBeTruthy();
    expect(screen.getByText('Benchmark ref $1,092.00')).toBeTruthy();
    expect(screen.getByText('Volume-weighted resting ASK quotes')).toBeTruthy();
    expect(screen.getByText('Order context updated: 2026-10-03 07:00 UTC')).toBeTruthy();
    expect(screen.getByTitle(/open-order quote reference, not confirmed-trade VWAP/)).toBeTruthy();
    expect(screen.getByTitle(/source: live_slice_ask_vwap/)).toBeTruthy();
    expect(screen.getByText('-$12.00')).toBeTruthy();
    expect(screen.queryByText(/live benchmark/i)).toBeNull();
  });

  it('states when the reference time is not available', () => {
    renderWithProviders(
      <BenchmarkPriceBlock
        priceUsd={1080}
        benchmarkUsd={1092}
        deltaUsd={12}
        benchmarkSource="live_slice_bid_vwap"
      />
    );

    expect(screen.getByText('Volume-weighted resting BID quotes')).toBeTruthy();
    expect(screen.getByText('Reference time unavailable')).toBeTruthy();
  });

  it('does not imply live liquidity when the benchmark reference is missing', () => {
    renderWithProviders(
      <BenchmarkPriceBlock priceUsd={1080} benchmarkUsd={null} deltaUsd={null} />
    );

    expect(screen.getByText('No benchmark reference')).toBeTruthy();
    expect(screen.queryByText(/live benchmark/i)).toBeNull();
  });
});
