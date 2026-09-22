import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IntelligencePanel } from '../components/map/IntelligencePanel';
import i18n, { loadNamespace } from '../i18n';
import { api } from '../services/api';
import type { ForwardCurvePoint, ForwardCurveResponse, Port, Product } from '../types';
import { renderWithProviders } from './test-utils';

vi.mock('../services/api', () => ({
  api: {
    catalog: { products: vi.fn() },
    curves: { forward: vi.fn() },
  },
}));
vi.mock('../components/NewsFeed', () => ({ NewsFeed: () => <div data-testid="news-feed" /> }));
vi.mock('../components/map/ComplianceEstimatorCard', () => ({ ComplianceEstimatorCard: () => <div data-testid="compliance-estimator" /> }));

const products: Product[] = [
  ['BIO_METHANOL', 'Bio Methanol'],
  ['E_METHANOL', 'e-Methanol'],
  ['BIO_ETHANOL', 'Bio Ethanol'],
  ['SYNTHETIC_ETHANOL', 'e-Ethanol'],
  ['UCOME_B100', 'UCOME B100'],
].map(([marketProduct, name]) => ({
  id: `product-${marketProduct}`,
  market_product: marketProduct as Product['market_product'],
  name,
  fuel_type: marketProduct === 'UCOME_B100' ? 'FAME' : 'ALCOHOL',
  fuel_grade: marketProduct === 'UCOME_B100' ? 'UCOME' : null,
  unit: 'MT',
  min_lot_size: 100,
  is_active: true,
  execution_mode: 'ORDERBOOK',
  ...(marketProduct === 'UCOME_B100' ? { available_delivery_point_ids: ['dp-singapore'] } : {}),
}));
const ucomeProduct = products[4];
const singapore: Port = {
  id: 'map-singapore', catalogDeliveryPointId: 'dp-singapore', name: 'Singapore',
  location: { lat: 1.26, lng: 103.8 }, country: 'Singapore',
  methanolSupply: 'Unknown', biofuelSupply: 'Unknown', priceMethanol: 0,
};
const point = (window: string, mid: number | null): ForwardCurvePoint => ({
  availability_window: window,
  mid_price: mid,
  best_bid: mid == null ? null : mid - 10,
  best_ask: mid == null ? null : mid + 10,
  spread: mid == null ? null : 20,
  volume_mt: 100,
  order_count: 2,
});
const curve = (product: Product, points: ForwardCurvePoint[] = []): ForwardCurveResponse => ({
  product_id: product.id, product_name: product.name, curve: points, generated_at: '2026-09-22T00:00:00Z',
});
const openPanel = (selectedPort?: Port, selectedProduct?: string) => {
  const result = renderWithProviders(
    <IntelligencePanel isOpen onClose={vi.fn()} selectedPort={selectedPort} selectedProduct={selectedProduct} onPortSelect={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole('tab', { name: selectedPort ? 'Port Intel' : 'Estimator' }));
  return result;
};

describe('IntelligencePanel market references', () => {
  beforeEach(async () => {
    vi.mocked(api.catalog.products).mockReset().mockResolvedValue(products);
    vi.mocked(api.curves.forward).mockReset().mockImplementation(async ({ product_id }) => (
      curve(products.find(product => product.id === product_id)!)
    ));
    await loadNamespace('dashboard');
    await i18n.changeLanguage('en');
  });

  it('includes all orderbook fuels and keeps B100 visible when it has no data', async () => {
    openPanel();

    expect(await screen.findByText('UCOME B100')).toBeTruthy();
    expect(api.curves.forward).toHaveBeenCalledTimes(5);
    expect(api.curves.forward).toHaveBeenCalledWith({ product_id: ucomeProduct.id });
    expect(screen.getAllByText('No data')).toHaveLength(5);
    expect(screen.queryByText('Loading indicative curve references...')).toBeNull();
    expect(screen.queryByText(/\+0.0%|Contango/)).toBeNull();
  });

  it('uses the exact selected port and the canonical B100 product', async () => {
    vi.mocked(api.curves.forward).mockResolvedValue(curve(ucomeProduct, [point('SPOT', 1000), point('Q4_2026', 1100)]));
    openPanel(singapore, 'UCOME_B100');

    expect(await screen.findByText('Spot ref $1000/MT')).toBeTruthy();
    expect(screen.getByText('+10.0%')).toBeTruthy();
    expect(screen.getByText('Filtered to Singapore')).toBeTruthy();
    expect(screen.getByText('Selected port reference')).toBeTruthy();
    expect(screen.getByText(i18n.t('buyerMap.specificationScope', { ns: 'dashboard' }))).toBeTruthy();
    expect(api.curves.forward).toHaveBeenCalledExactlyOnceWith({ product_id: ucomeProduct.id, delivery_point_id: 'dp-singapore' });
    expect(screen.queryByText('Bio Methanol')).toBeNull();
  });

  it('does not request a B100 curve for a port outside its catalog coverage', async () => {
    openPanel({ ...singapore, id: 'map-rotterdam', name: 'Rotterdam', catalogDeliveryPointId: 'dp-rotterdam' });

    expect(await screen.findByText('Bio Methanol')).toBeTruthy();
    expect(api.curves.forward).toHaveBeenCalledTimes(4);
    expect(api.curves.forward).not.toHaveBeenCalledWith(expect.objectContaining({ product_id: ucomeProduct.id }));
    expect(screen.queryByText('UCOME B100')).toBeNull();
  });

  it('requires explicit B100 coverage before requesting a selected port curve', async () => {
    vi.mocked(api.catalog.products).mockResolvedValue([{ ...ucomeProduct, available_delivery_point_ids: undefined }]);
    openPanel(singapore, 'UCOME_B100');

    expect(await screen.findByText('No active orderbook products available.')).toBeTruthy();
    expect(api.curves.forward).not.toHaveBeenCalled();
  });

  it('labels a product-level result when the map port has no catalog delivery point', async () => {
    vi.mocked(api.curves.forward).mockResolvedValue(curve(ucomeProduct, [point('SPOT', 1000)]));
    openPanel({ ...singapore, catalogDeliveryPointId: undefined }, 'UCOME_B100');

    expect(await screen.findByText('Spot ref $1000/MT')).toBeTruthy();
    expect(screen.getByText('Product-level reference')).toBeTruthy();
    expect(screen.queryByText('Selected port reference')).toBeNull();
    expect(screen.queryByText(/\+0.0%|Contango/)).toBeNull();
    expect(api.curves.forward).toHaveBeenCalledExactlyOnceWith({ product_id: ucomeProduct.id });
  });

  it('does not relabel a forward-only price as spot or invent a trend', async () => {
    vi.mocked(api.curves.forward).mockResolvedValue(curve(ucomeProduct, [point('Q4_2026', 1100)]));
    openPanel(undefined, 'UCOME_B100');

    expect(await screen.findByText('No two-sided spot reference')).toBeTruthy();
    expect(screen.queryByText(/Spot ref \$1100|\+0.0%|Contango/)).toBeNull();
  });

  it('separates pending requests from failed and empty curve results', async () => {
    let resolveProducts!: (value: Product[]) => void;
    vi.mocked(api.catalog.products).mockReturnValue(new Promise(resolve => { resolveProducts = resolve; }));
    vi.mocked(api.curves.forward).mockRejectedValue(new Error('Unavailable'));
    openPanel(undefined, 'UCOME_B100');

    expect(screen.getByRole('status').textContent).toBe('Loading indicative curve references...');
    await act(async () => { resolveProducts(products); });

    expect(await screen.findByText('Curve data unavailable')).toBeTruthy();
    expect(screen.getByText('UCOME B100')).toBeTruthy();
    expect(screen.queryByText('Loading indicative curve references...')).toBeNull();
    expect(screen.queryByText('No data')).toBeNull();
  });

  it('reports a catalog failure instead of loading forever', async () => {
    vi.mocked(api.catalog.products).mockRejectedValue(new Error('Unavailable'));
    openPanel();

    expect(await screen.findByText('Curve data unavailable')).toBeTruthy();
    expect(api.curves.forward).not.toHaveBeenCalled();
  });

  it('ignores a previous product request that resolves after the product changes', async () => {
    let resolveOldCurve!: (value: ForwardCurveResponse) => void;
    vi.mocked(api.curves.forward).mockImplementation(({ product_id }) => (
      product_id === products[0].id
        ? new Promise(resolve => { resolveOldCurve = resolve; })
        : Promise.resolve(curve(ucomeProduct, [point('SPOT', 1000)]))
    ));
    const props = { isOpen: true, onClose: vi.fn(), selectedPort: undefined, onPortSelect: vi.fn() };
    const { rerender } = renderWithProviders(<IntelligencePanel {...props} selectedProduct="BIO_METHANOL" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Estimator' }));
    await waitFor(() => expect(api.curves.forward).toHaveBeenCalledWith({ product_id: products[0].id }));

    rerender(<IntelligencePanel {...props} selectedProduct="UCOME_B100" />);
    expect(await screen.findByText('Spot ref $1000/MT')).toBeTruthy();
    await act(async () => { resolveOldCurve(curve(products[0], [point('SPOT', 400)])); });

    expect(screen.getByText('UCOME B100')).toBeTruthy();
    expect(screen.queryByText('Bio Methanol')).toBeNull();
    expect(screen.queryByText('Spot ref $400/MT')).toBeNull();
  });
});
