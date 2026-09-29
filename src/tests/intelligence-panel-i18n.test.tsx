import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';

import { IntelligencePanel } from '../components/map/IntelligencePanel';
import { PORTS } from '../data';
import i18n, { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';
import { api } from '../services/api';
import type { ForwardCurveResponse, Product } from '../types';

vi.mock('../services/api', () => ({
  api: {
    catalog: { products: vi.fn().mockResolvedValue([]) },
    curves: { forward: vi.fn() },
  },
}));

vi.mock('../components/NewsFeed', () => ({
  NewsFeed: ({ active }: { active: boolean }) => <div data-testid="news-feed" data-active={active} />,
}));
vi.mock('../components/map/ComplianceEstimatorCard', () => ({ ComplianceEstimatorCard: () => <div data-testid="compliance-estimator" /> }));

const ucomeProduct: Product = {
  id: 'ucome-b100', name: 'UCOME B100', market_product: 'UCOME_B100',
  fuel_type: 'FAME', fuel_grade: 'UCOME', unit: 'MT', min_lot_size: 100,
  is_active: true, execution_mode: 'ORDERBOOK', available_delivery_point_ids: ['dp-singapore-uuid'],
};

function curveResponse(price: number): ForwardCurveResponse {
  return {
    product_id: ucomeProduct.id,
    product_name: ucomeProduct.name,
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

describe('IntelligencePanel localization', () => {
  beforeEach(async () => {
    vi.mocked(api.catalog.products).mockReset().mockResolvedValue([]);
    vi.mocked(api.curves.forward).mockReset();
    await loadNamespace('dashboard');
    await i18n.changeLanguage('zh');
  });

  it('does not request a forward curve for an RFQ-only catalog product', async () => {
    const alcoholProduct: Product = {
      id: 'bio-methanol', name: 'Bio Methanol', market_product: 'BIO_METHANOL',
      fuel_type: 'Methanol', fuel_grade: 'Bio', unit: 'MT', min_lot_size: 100,
      is_active: true,
    };
    vi.mocked(api.catalog.products).mockResolvedValue([
      { ...alcoholProduct, id: 'ucome-b100', name: 'UCOME B100', market_product: 'UCOME_B100', fuel_type: 'FAME', execution_mode: 'RFQ_ONLY' },
      alcoholProduct,
    ]);
    vi.mocked(api.curves.forward).mockResolvedValue({
      product_id: alcoholProduct.id, product_name: alcoholProduct.name, curve: [], generated_at: new Date().toISOString(),
    });

    renderWithProviders(
      <IntelligencePanel isOpen onClose={vi.fn()} selectedPort={undefined} onPortSelect={vi.fn()} />,
    );

    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: '估算器' })); });
    await waitFor(() => expect(api.curves.forward).toHaveBeenCalled());
    expect(api.curves.forward).toHaveBeenCalledExactlyOnceWith({ product_id: alcoholProduct.id });
  });

  it('uses the shared localized port panel for B100 and opens its market', async () => {
    const onPortSelect = vi.fn();
    vi.mocked(api.catalog.products).mockResolvedValue([ucomeProduct]);
    vi.mocked(api.curves.forward).mockResolvedValue({
      product_id: ucomeProduct.id, product_name: ucomeProduct.name, curve: [], generated_at: new Date().toISOString(),
    });
    renderWithProviders(
      <IntelligencePanel
        isOpen
        onClose={vi.fn()}
        selectedPort={PORTS[0]}
        selectedProduct="UCOME_B100"
        onPortSelect={onPortSelect}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: '港口情报' }));
    expect(await screen.findByText('UCOME B100')).toBeTruthy();
    expect(screen.getByText('市场价格')).toBeTruthy();
    expect(screen.getByText('供应情况')).toBeTruthy();
    expect(screen.getByText('参考性远期价格')).toBeTruthy();
    expect(screen.getByTestId('compliance-estimator')).toBeTruthy();
    expect(screen.queryByText('批发报价与询价')).toBeNull();

    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByText('No data')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'View Market & Procure' }));
    expect(onPortSelect).toHaveBeenCalledWith(PORTS[0]);
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
  ])('defers global curves for a $name until global Primary content is visible', async ({ props, tab }) => {
    vi.mocked(api.catalog.products).mockResolvedValue([ucomeProduct]);
    vi.mocked(api.curves.forward).mockResolvedValue(curveResponse(790));
    const { rerender } = renderWithProviders(<IntelligencePanel {...panelProps} {...props} />);
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: tab })); });
    expect(api.catalog.products).not.toHaveBeenCalled();
    expect(api.curves.forward).not.toHaveBeenCalled();

    rerender(<IntelligencePanel {...panelProps} />);
    expect(await screen.findByText(/\$790/)).toBeTruthy();
    expect(api.catalog.products).toHaveBeenCalledTimes(1);
    expect(api.curves.forward).toHaveBeenCalledExactlyOnceWith({ product_id: ucomeProduct.id });
  });

  it('loads the selected delivery point curve for port Primary content', async () => {
    const selectedPort = { ...PORTS[0], catalogDeliveryPointId: 'dp-singapore-uuid' };
    vi.mocked(api.catalog.products).mockResolvedValue([
      { ...ucomeProduct, id: 'bio-methanol', name: 'Bio Methanol', market_product: 'BIO_METHANOL' },
      ucomeProduct,
    ]);
    vi.mocked(api.curves.forward).mockResolvedValue(curveResponse(790));
    renderWithProviders(<IntelligencePanel {...panelProps} selectedPort={selectedPort} selectedProduct="UCOME_B100" />);
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: '港口情报' })); });
    expect(await screen.findByText(/\$790/)).toBeTruthy();
    expect(api.curves.forward).toHaveBeenCalledExactlyOnceWith({
      product_id: ucomeProduct.id,
      delivery_point_id: 'dp-singapore-uuid',
    });
  });

  it('clears global references and ignores their late response after selecting a port', async () => {
    const globalCurve = deferred<ForwardCurveResponse>();
    const portCurve = deferred<ForwardCurveResponse>();
    const selectedPort = { ...PORTS[0], catalogDeliveryPointId: 'dp-singapore-uuid' };
    vi.mocked(api.catalog.products).mockResolvedValue([ucomeProduct]);
    vi.mocked(api.curves.forward)
      .mockReturnValueOnce(globalCurve.promise)
      .mockReturnValueOnce(portCurve.promise);
    const { rerender } = renderWithProviders(<IntelligencePanel {...panelProps} />);
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: '估算器' })); });
    expect(api.curves.forward).toHaveBeenCalledTimes(1);

    rerender(<IntelligencePanel {...panelProps} selectedPort={selectedPort} selectedProduct="UCOME_B100" />);
    await waitFor(() => expect(api.curves.forward).toHaveBeenCalledTimes(2));
    expect(api.curves.forward).toHaveBeenLastCalledWith({
      product_id: ucomeProduct.id,
      delivery_point_id: 'dp-singapore-uuid',
    });
    await act(async () => { globalCurve.resolve(curveResponse(790)); });
    expect(screen.queryByText(/\$790/)).toBeNull();
    await act(async () => { portCurve.resolve(curveResponse(900)); });
    expect(screen.getByText(/\$900/)).toBeTruthy();
  });

  it('does not fan out curve requests if the panel closes while the catalog loads', async () => {
    const catalog = deferred<Product[]>();
    vi.mocked(api.catalog.products).mockReturnValueOnce(catalog.promise);
    const { rerender } = renderWithProviders(<IntelligencePanel {...panelProps} />);
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: '估算器' })); });
    expect(api.catalog.products).toHaveBeenCalledTimes(1);

    rerender(<IntelligencePanel {...panelProps} isOpen={false} />);
    await act(async () => { catalog.resolve([ucomeProduct]); });
    expect(api.curves.forward).not.toHaveBeenCalled();
  });

  it('does not let an earlier curve response overwrite the reopened panel', async () => {
    const earlierCurve = deferred<ForwardCurveResponse>();
    vi.mocked(api.catalog.products).mockResolvedValue([ucomeProduct]);
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

  it('includes UCOME B100 after the existing catalog products in forward references', async () => {
    const alcoholProducts: Product[] = ([
      'BIO_METHANOL', 'E_METHANOL', 'BIO_ETHANOL', 'SYNTHETIC_ETHANOL',
    ] as const).map(market_product => ({
      id: market_product, name: market_product, market_product,
      fuel_type: 'Methanol', fuel_grade: market_product, unit: 'MT', min_lot_size: 1, is_active: true,
    }));
    vi.mocked(api.catalog.products).mockResolvedValue(alcoholProducts.concat(ucomeProduct));
    vi.mocked(api.curves.forward).mockResolvedValue(curveResponse(790));
    renderWithProviders(<IntelligencePanel isOpen selectedPort={undefined} onClose={vi.fn()} onPortSelect={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '估算器' }));
    });
    expect(await screen.findByText('UCOME B100')).toBeTruthy();
    expect(api.curves.forward).toHaveBeenCalledWith({ product_id: ucomeProduct.id });
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
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
