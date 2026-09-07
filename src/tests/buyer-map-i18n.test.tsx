import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';

import { BuyerMap } from '../components/BuyerMap';
import i18n, { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';

const themeMock = vi.hoisted(() => ({ theme: 'light' }));
const portsListMock = vi.fn();
const mapOptionsMock = vi.fn();
const fitBoundsMock = vi.fn();
const flyToMock = vi.fn();

vi.mock('../services/api', () => ({
  api: {
    ports: { list: (...args: unknown[]) => portsListMock(...args) },
    catalog: { deliveryPoints: vi.fn().mockResolvedValue([]) },
    orderbook: {
      listAsks: vi.fn().mockResolvedValue([]),
      aggregated: vi.fn().mockResolvedValue([]),
    },
    vessels: { list: () => Promise.resolve([]) },
  },
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => themeMock,
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

vi.mock('mapbox-gl', () => {
  class MockMap {
    constructor(options: unknown) { mapOptionsMock(options); }
    addControl() {}
    addLayer() {}
    addSource() {}
    getCanvas() { return { style: {} }; }
    getLayer() { return undefined; }
    getSource() { return undefined; }
    getZoom() { return 4; }
    getCenter() { return { lng: 104, lat: 1 }; }
    getBearing() { return 0; }
    getPitch() { return 0; }
    fitBounds(...args: unknown[]) { fitBoundsMock(...args); }
    flyTo(...args: unknown[]) { flyToMock(...args); }
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
      NavigationControl: class {},
    },
  };
});

describe('BuyerMap failure localization', () => {
  beforeEach(async () => {
    portsListMock.mockReset();
    mapOptionsMock.mockReset();
    fitBoundsMock.mockReset();
    flyToMock.mockReset();
    portsListMock.mockRejectedValue(new Error('ports unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await loadNamespace('dashboard');
    await i18n.changeLanguage('zh');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it.each(['light', 'dark'])('uses the %s Mapbox style and keeps localized fallback ports', async (theme) => {
    themeMock.theme = theme;
    vi.stubEnv('VITE_MAPBOX_PUBLIC_TOKEN', 'pk.test');
    renderWithProviders(<BuyerMap onPortSelect={vi.fn()} onNavigate={vi.fn()} />);

    expect(await screen.findByRole('region', { name: '交互式市场情报地图' })).toBeTruthy();
    expect(screen.getByTestId('fallback-port-count').textContent).toBe('8');
    expect(screen.getByRole('alert').textContent).toContain('无法加载情报地图');
    fireEvent.click(screen.getByRole('button', { name: /图层/ }));
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[1]);
    expect(screen.getByText('市场可售量')).toBeTruthy();
    expect(screen.getByText('暂无有效卖单。')).toBeTruthy();
    expect(screen.getByText('暂无有效挂牌指示价。')).toBeTruthy();
    await waitFor(() => {
      expect(mapOptionsMock).toHaveBeenCalledWith(expect.objectContaining({
        accessToken: 'pk.test',
        style: `mapbox://styles/mapbox/${theme}-v11`,
        language: 'zh-Hans',
        projection: 'mercator',
        locale: expect.objectContaining({
          'AttributionControl.ToggleAttribution': '切换地图版权信息',
        }),
      }));
    });

    const legendButton = screen.getByRole('button', { name: '地图情报图例' });
    fireEvent.click(legendButton);
    expect(screen.getByText('港口 — 订单量与价差')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('港口 — 订单量与价差')).toBeNull();
    expect(document.activeElement).toBe(legendButton);
  });
  it('fits all ports, focuses a chosen port and preserves the camera across language changes', async () => {
    await i18n.changeLanguage('en');
    renderWithProviders(<BuyerMap onPortSelect={vi.fn()} onNavigate={vi.fn()} />);
    await screen.findByRole('region', { name: 'Interactive market intelligence map' });
    expect(mapOptionsMock.mock.calls[0][0].bounds).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'All ports' }));
    expect(fitBoundsMock).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ retainPadding: false }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Go to port' }));
    fireEvent.click(screen.getByRole('option', { name: 'Singapore' }));
    expect(flyToMock).toHaveBeenCalledWith(expect.objectContaining({
      center: expect.any(Array), padding: expect.objectContaining({ right: 344 }), retainPadding: false,
    }));
    expect(flyToMock.mock.calls[0][0].essential).not.toBe(true);
    await act(async () => { await i18n.changeLanguage('zh'); });
    expect(mapOptionsMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      center: { lng: 104, lat: 1 }, zoom: 4,
    }));
  });

});
