import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';

import { BuyerMap } from '../components/BuyerMap';
import i18n, { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';

const portsListMock = vi.fn();
const mapOptionsMock = vi.fn();

vi.mock('../services/api', () => ({
  api: {
    ports: { list: (...args: unknown[]) => portsListMock(...args) },
    catalog: { deliveryPoints: vi.fn().mockResolvedValue([]) },
    orderbook: {
      listAsks: vi.fn().mockResolvedValue([]),
      aggregated: vi.fn().mockResolvedValue([]),
    },
    vessels: { list: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('../map/addEcaLayers', () => ({
  addEcaLayers: vi.fn(),
  setEcaLayersVisible: vi.fn(),
}));

vi.mock('../components/map/MarketWatchTicker', () => ({
  MarketWatchTicker: () => null,
}));

vi.mock('../components/map/IntelligencePanel', () => ({
  IntelligencePanel: ({ portOptions = [] }: { portOptions?: unknown[] }) => (
    <div data-testid="fallback-port-count">{portOptions.length}</div>
  ),
}));

vi.mock('maplibre-gl', () => {
  class MockMap {
    constructor(options: unknown) { mapOptionsMock(options); }
    addControl() {}
    addLayer() {}
    addSource() {}
    getCanvas() { return { style: {} }; }
    getLayer() { return undefined; }
    getSource() { return undefined; }
    getZoom() { return 2.5; }
    hasImage() { return true; }
    loaded() { return true; }
    on() {}
    off() {}
    once(_event: string, callback: () => void) { callback(); }
    remove() {}
  }

  class MockPopup {
    addTo() { return this; }
    getElement() { return document.createElement('div'); }
    remove() {}
    setHTML() { return this; }
    setLngLat() { return this; }
  }

  return {
    default: {
      Map: MockMap,
      Popup: MockPopup,
      AttributionControl: class {},
    },
  };
});

describe('BuyerMap failure localization', () => {
  beforeEach(async () => {
    portsListMock.mockReset();
    mapOptionsMock.mockReset();
    portsListMock.mockRejectedValue(new Error('ports unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await loadNamespace('dashboard');
    await i18n.changeLanguage('zh');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('keeps the fallback map workspace and localized legend after a ports failure', async () => {
    renderWithProviders(<BuyerMap onPortSelect={vi.fn()} onNavigate={vi.fn()} />);

    expect(await screen.findByRole('region', { name: '交互式市场情报地图' })).toBeTruthy();
    expect(screen.getByTestId('fallback-port-count').textContent).toBe('8');
    expect(screen.getByRole('alert').textContent).toContain('无法加载情报地图');
    expect(screen.getByText('市场可售量')).toBeTruthy();
    expect(screen.getByText('暂无有效卖单。')).toBeTruthy();
    expect(screen.getByText('暂无有效挂牌指示价。')).toBeTruthy();
    expect(mapOptionsMock).toHaveBeenCalledWith(expect.objectContaining({
      locale: expect.objectContaining({
        'AttributionControl.ToggleAttribution': '切换地图版权信息',
      }),
    }));

    const legendButton = screen.getByRole('button', { name: '地图情报图例' });
    fireEvent.mouseEnter(legendButton.parentElement!);
    expect(screen.getByText('港口 — 订单量与价差')).toBeTruthy();
  });
});
