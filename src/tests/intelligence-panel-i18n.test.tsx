import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';

import { api } from '../services/api';
import { IntelligencePanel } from '../components/map/IntelligencePanel';
import { PORTS } from '../data';
import i18n, { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';

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
    vi.mocked(api.catalog.products).mockResolvedValue([]);
    vi.mocked(api.curves.forward).mockReset();
    await loadNamespace('dashboard');
    await i18n.changeLanguage('zh');
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
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
