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

vi.mock('../components/NewsFeed', () => ({ NewsFeed: () => null }));
vi.mock('../components/map/ComplianceEstimatorCard', () => ({ ComplianceEstimatorCard: () => null }));

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
