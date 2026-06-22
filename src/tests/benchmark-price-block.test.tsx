import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { BenchmarkPriceBlock } from '../components/trading/BenchmarkPriceBlock';
import { renderWithProviders } from './test-utils';

describe('BenchmarkPriceBlock', () => {
  it('labels benchmark context as reference data and keeps the delta pill unchanged', () => {
    renderWithProviders(
      <BenchmarkPriceBlock priceUsd={1080} benchmarkUsd={1092} deltaUsd={-12} />
    );

    expect(screen.getByText('$1,080.00')).toBeTruthy();
    expect(screen.getByText('Benchmark ref $1,092.00')).toBeTruthy();
    expect(screen.getByTitle('vs benchmark reference $1,092.00/MT')).toBeTruthy();
    expect(screen.getByText('-$12.00')).toBeTruthy();
    expect(screen.queryByText(/live benchmark/i)).toBeNull();
  });

  it('does not imply live liquidity when the benchmark reference is missing', () => {
    renderWithProviders(
      <BenchmarkPriceBlock priceUsd={1080} benchmarkUsd={null} deltaUsd={null} />
    );

    expect(screen.getByText('No benchmark reference')).toBeTruthy();
    expect(screen.queryByText(/live benchmark/i)).toBeNull();
  });
});
