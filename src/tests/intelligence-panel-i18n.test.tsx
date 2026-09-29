import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';

import { api } from '../services/api';
import { IntelligencePanel } from '../components/map/IntelligencePanel';
import { PORTS } from '../data';
import type { ForwardCurveResponse, Product } from '../types';
import i18n, { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';

vi.mock('../services/api', () => ({
  api: {
    catalog: { products: vi.fn().mockResolvedValue([]) },
    curves: { forward: vi.fn() },
  },
}));

vi.mock('../components/NewsFeed', () => ({
  NewsFeed: ({ active }: { active: boolean }) => <div data-testid="news-feed" data-active={active} />,
}));
vi.mock('../components/map/ComplianceEstimatorCard', () => ({ ComplianceEstimatorCard: () => null }));

const product: Product = {
  id: 'b30', name: 'B30', market_product: 'B30', fuel_type: 'Biodiesel',
  fuel_grade: 'B30', unit: 'MT', min_lot_size: 1, is_active: true,
};

function curveResponse(price: number): ForwardCurveResponse {
  return {
    product_id: product.id,
    product_name: product.name,
    generated_at: '2026-09-29T12:00:00Z',
    curve: [{
      availability_window: 'SPOT', mid_price: price,
      best_bid: null, best_ask: null, spread: null, volume_mt: 0, order_count: 0,
    }],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

const panelProps = {
  isOpen: true,
  selectedPort: undefined,
  onClose: vi.fn(),
  onPortSelect: vi.fn(),
};

describe('IntelligencePanel', () => {
  beforeEach(async () => {
    vi.mocked(api.catalog.products).mockReset().mockResolvedValue([]);
    vi.mocked(api.curves.forward).mockReset();
    await loadNamespace('dashboard');
    await i18n.changeLanguage('zh');
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('loads News only while the panel is open and active, without loading curves', () => {
    const { rerender } = renderWithProviders(<IntelligencePanel {...panelProps} isOpen={false} />);
    expect(screen.getByTestId('news-feed').getAttribute('data-active')).toBe('false');

    rerender(<IntelligencePanel {...panelProps} />);
    expect(screen.getByTestId('news-feed').getAttribute('data-active')).toBe('true');
    rerender(<IntelligencePanel {...panelProps} active={false} />);
    expect(screen.getByTestId('news-feed').getAttribute('data-active')).toBe('false');
    expect(api.catalog.products).not.toHaveBeenCalled();
    expect(api.curves.forward).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'inactive map', props: { active: false }, tab: '估算器' },
    { name: 'closed panel', props: { isOpen: false }, tab: '估算器' },
    { name: 'selected port', props: { selectedPort: PORTS[0] }, tab: '港口情报' },
  ])('defers global curves for a $name until global Primary content is visible', async ({ props, tab }) => {
    vi.mocked(api.catalog.products).mockResolvedValue([product]);
    vi.mocked(api.curves.forward).mockResolvedValue(curveResponse(790));
    const { rerender } = renderWithProviders(<IntelligencePanel {...panelProps} {...props} />);
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: tab })); });
    expect(api.catalog.products).not.toHaveBeenCalled();
    expect(api.curves.forward).not.toHaveBeenCalled();

    rerender(<IntelligencePanel {...panelProps} />);
    expect(await screen.findByText(/\$790/)).toBeTruthy();
    expect(api.catalog.products).toHaveBeenCalledTimes(1);
    expect(api.curves.forward).toHaveBeenCalledExactlyOnceWith({ product_id: product.id });
  });

  it('does not fan out curve requests if the panel closes while the catalog loads', async () => {
    const catalog = deferred<Product[]>();
    vi.mocked(api.catalog.products).mockReturnValueOnce(catalog.promise);
    const { rerender } = renderWithProviders(<IntelligencePanel {...panelProps} />);
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: '估算器' })); });
    expect(api.catalog.products).toHaveBeenCalledTimes(1);

    rerender(<IntelligencePanel {...panelProps} isOpen={false} />);
    await act(async () => { catalog.resolve([product]); });
    expect(api.curves.forward).not.toHaveBeenCalled();
  });

  it('does not let an earlier curve response overwrite the reopened panel', async () => {
    const earlierCurve = deferred<ForwardCurveResponse>();
    vi.mocked(api.catalog.products).mockResolvedValue([product]);
    vi.mocked(api.curves.forward)
      .mockReturnValueOnce(earlierCurve.promise)
      .mockResolvedValueOnce(curveResponse(900));
    const { rerender } = renderWithProviders(<IntelligencePanel {...panelProps} />);
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: '估算器' })); });
    expect(api.curves.forward).toHaveBeenCalledTimes(1);

    rerender(<IntelligencePanel {...panelProps} isOpen={false} />);
    rerender(<IntelligencePanel {...panelProps} />);
    expect(await screen.findByText(/\$900/)).toBeTruthy();
    await act(async () => { earlierCurve.resolve(curveResponse(790)); });
    expect(screen.queryByText(/\$790/)).toBeNull();
    expect(screen.getByText(/\$900/)).toBeTruthy();
    expect(api.curves.forward).toHaveBeenCalledTimes(2);
  });

  it('includes B30 and B100 after the existing catalog products in forward references', async () => {
    vi.mocked(api.catalog.products).mockResolvedValue([
      'BIO_METHANOL', 'E_METHANOL', 'BIO_ETHANOL', 'SYNTHETIC_ETHANOL', 'B30', 'B100',
    ].map(market_product => ({ id: market_product, name: market_product, market_product, is_active: true })) as any);
    vi.mocked(api.curves.forward).mockResolvedValue({ curve: [
      { availability_window: 'SPOT', mid_price: '790' },
    ] } as any);
    renderWithProviders(<IntelligencePanel isOpen selectedPort={undefined} onClose={vi.fn()} onPortSelect={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '估算器' }));
    });
    expect(await screen.findByText('B30')).toBeTruthy();
    expect(await screen.findByText('B100')).toBeTruthy();
    expect(api.curves.forward).toHaveBeenCalledWith({ product_id: 'B30' });
  });

  it('uses localized fallbacks for unknown market enums', async () => {
    const port = {
      ...PORTS[0],
      methanolSupply: 'Unexpected availability',
      details: {
        ...PORTS[0].details!,
        avgWaitingTime: 1,
        activeBarges: 1,
        congestionLevel: 'Unexpected congestion',
        forecastSupply: 'Unexpected supply',
      },
    } as unknown as typeof PORTS[number];

    renderWithProviders(
      <IntelligencePanel
        isOpen
        onClose={vi.fn()}
        selectedPort={port}
        onPortSelect={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '港口情报' }));
    });
    expect((await screen.findAllByText('未知')).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(/Unexpected/)).toBeNull();
  });
});
