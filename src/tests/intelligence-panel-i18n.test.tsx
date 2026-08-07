import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';

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
    await loadNamespace('dashboard');
    await i18n.changeLanguage('zh');
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
