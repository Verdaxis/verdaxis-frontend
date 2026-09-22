import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';

import { IntelligencePanel } from '../components/map/IntelligencePanel';
import { PORTS } from '../data';
import i18n, { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';
import { api } from '../services/api';
import type { Product } from '../types';

vi.mock('../services/api', () => ({
  api: {
    catalog: { products: vi.fn().mockResolvedValue([]) },
    curves: { forward: vi.fn() },
  },
}));

vi.mock('../components/NewsFeed', () => ({ NewsFeed: () => <div data-testid="news-feed" /> }));
vi.mock('../components/map/ComplianceEstimatorCard', () => ({ ComplianceEstimatorCard: () => <div data-testid="compliance-estimator" /> }));

const ucomeProduct: Product = {
  id: 'ucome-b100', name: 'UCOME B100', market_product: 'UCOME_B100',
  fuel_type: 'FAME', fuel_grade: 'UCOME', unit: 'MT', min_lot_size: 100,
  is_active: true, execution_mode: 'RFQ_ONLY', available_delivery_point_ids: ['sg-sin'],
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

    await waitFor(() => expect(api.curves.forward).toHaveBeenCalled());
    expect(api.curves.forward).toHaveBeenCalledExactlyOnceWith({ product_id: alcoholProduct.id });
  });

  it('opens a localized wholesale RFQ panel without alcohol market signals', async () => {
    renderWithProviders(
      <IntelligencePanel
        isOpen
        onClose={vi.fn()}
        selectedPort={PORTS[0]}
        onPortSelect={vi.fn()}
        rfqProduct={ucomeProduct}
        rfqOnly
      />,
    );

    expect(screen.getByRole('tab', { name: 'UCOME B100' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('heading', { name: '新加坡 UCOME B100', level: 3 })).toBeTruthy();
    expect(screen.getByText('最低询购量：100 MT')).toBeTruthy();
    expect(screen.getByText('分别审核燃料规格、批次检测结果、货物可持续性证明及供应商证书。')).toBeTruthy();
    expect(screen.getByRole('link', { name: '前往市场查看 UCOME B100' }).getAttribute('href'))
      .toBe('/app/marketplace?product=UCOME_B100');
    expect(screen.queryByText('市场价格')).toBeNull();
    expect(screen.queryByText('供应情况')).toBeNull();
    expect(screen.queryByText('参考性远期价格')).toBeNull();
    expect(screen.queryByText('所选产品参考（7天）')).toBeNull();
    expect(screen.queryByText(/\$520|Jurong Green Methanol/)).toBeNull();
    expect(screen.queryByTestId('compliance-estimator')).toBeNull();
    expect(api.catalog.products).not.toHaveBeenCalled();
    expect(api.curves.forward).not.toHaveBeenCalled();

    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(screen.getByRole('heading', { name: 'Singapore UCOME B100', level: 3 })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View UCOME B100 in Marketplace' })).toBeTruthy();
    expect(screen.getByText('Listing prices are indicative. A supplier quote confirms price and available volume for your request.')).toBeTruthy();
  });

  it('selects the RFQ tab when the selected map product changes to B100', () => {
    const props = { isOpen: true, onClose: vi.fn(), selectedPort: PORTS[0], onPortSelect: vi.fn() };
    const { rerender } = renderWithProviders(<IntelligencePanel {...props} />);
    expect(screen.getByRole('tab', { name: '新闻' }).getAttribute('aria-selected')).toBe('true');

    rerender(<IntelligencePanel {...props} rfqProduct={ucomeProduct} rfqOnly />);

    expect(screen.getByRole('tab', { name: 'UCOME B100' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByTestId('news-feed')).toBeNull();
    expect(screen.queryByTestId('compliance-estimator')).toBeNull();
    expect(screen.getByRole('link', { name: '前往市场查看 UCOME B100' })).toBeTruthy();
  });

  it('keeps port intelligence and adds UCOME discovery when the all-products view supplies the RFQ lane', async () => {
    renderWithProviders(
      <IntelligencePanel
        isOpen
        onClose={vi.fn()}
        selectedPort={PORTS[0]}
        onPortSelect={vi.fn()}
        rfqProduct={ucomeProduct}
      />,
    );

    expect(screen.getByRole('tab', { name: '新闻' }).getAttribute('aria-selected')).toBe('true');
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '港口情报' }));
    });
    expect(screen.getByRole('link', { name: '前往市场查看 UCOME B100' })).toBeTruthy();
    expect(screen.getByText('市场价格')).toBeTruthy();
    expect(screen.getByTestId('compliance-estimator')).toBeTruthy();
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
