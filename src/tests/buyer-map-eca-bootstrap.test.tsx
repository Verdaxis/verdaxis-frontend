import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const overlay = vi.hoisted(() => ({
  addEcaLayers: vi.fn(),
  loadEcaLayers: vi.fn(),
  setEcaLayersVisible: vi.fn(),
}));

const mapState = vi.hoisted(() => ({
  events: [] as string[],
  instances: [] as Array<{
    emit: (event: string) => void;
    setStyle: ReturnType<typeof vi.fn>;
  }>,
  theme: 'light',
}));

vi.mock('../map/loadEcaLayers', () => ({ loadEcaLayers: overlay.loadEcaLayers }));
vi.mock('../hooks/useNamespace', () => ({
  useNamespace: () => ({ ready: true, t: (key: string) => key }),
}));
vi.mock('../hooks/useDashboardContentReady', () => ({ useDashboardContentReady: vi.fn() }));
vi.mock('../hooks/useSSE', () => ({ useSSE: () => ({ isConnected: false }) }));
vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ theme: mapState.theme }) }));
vi.mock('../components/map/MarketWatchTicker', () => ({ MarketWatchTicker: () => null }));
vi.mock('../components/map/IntelligencePanel', () => ({ IntelligencePanel: () => null }));
vi.mock('../components/map/MapLegend', () => ({ MapLegend: () => null }));
vi.mock('../components/ui/VerdaxisSelect', () => ({ VerdaxisSelect: () => null }));
vi.mock('../services/api', () => ({
  api: {
    ports: { list: vi.fn().mockResolvedValue([]) },
    catalog: { deliveryPoints: vi.fn().mockResolvedValue([]) },
    orderbook: { mapSummary: vi.fn().mockResolvedValue({ groups: [], recent_asks: [] }) },
    vessels: { list: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock('mapbox-gl', () => {
  class MockMap {
    private listeners = new Map<string, Set<() => void>>();
    setStyle = vi.fn();

    constructor() {
      mapState.events.push('map');
      mapState.instances.push(this);
    }

    addControl() {}
    addLayer() {}
    addSource() {}
    getCanvas() { return { style: {} }; }
    getLayer() { return undefined; }
    getSource() { return undefined; }
    hasImage() { return true; }
    isStyleLoaded() { return true; }
    loaded() { return true; }
    on(event: string, callback: () => void) {
      const listeners = this.listeners.get(event) ?? new Set<() => void>();
      listeners.add(callback);
      this.listeners.set(event, listeners);
    }
    off(event: string, callback: () => void) { this.listeners.get(event)?.delete(callback); }
    once() {}
    emit(event: string) { this.listeners.get(event)?.forEach(callback => callback()); }
    remove() {}
    resize() {}
    setLanguage() {}
    stop() {}
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
      NavigationControl: class {},
    },
  };
});

import { BuyerMap } from '../components/BuyerMap';

const props = { onPortSelect: vi.fn(), onNavigate: vi.fn() };

beforeEach(() => {
  mapState.events.length = 0;
  mapState.instances.length = 0;
  mapState.theme = 'light';
  overlay.addEcaLayers.mockReset().mockImplementation(() => mapState.events.push('eca'));
  overlay.setEcaLayersVisible.mockReset();
  overlay.loadEcaLayers.mockReset().mockResolvedValue({
    addEcaLayers: overlay.addEcaLayers,
    setEcaLayersVisible: overlay.setEcaLayersVisible,
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('starts Mapbox before ECA and reinstalls the overlay with current settings after style changes', async () => {
  const currentView = render(<BuyerMap active {...props} />);

  await waitFor(() => expect(overlay.addEcaLayers).toHaveBeenCalledOnce());
  const currentMap = mapState.instances[0];
  expect(mapState.events.slice(0, 2)).toEqual(['map', 'eca']);
  expect(overlay.addEcaLayers).toHaveBeenLastCalledWith(currentMap, {
    isDark: false,
    visible: true,
  });

  mapState.theme = 'dark';
  currentView.rerender(<BuyerMap active {...props} />);
  expect(currentMap.setStyle).toHaveBeenCalledWith('mapbox://styles/mapbox/dark-v11');

  act(() => currentMap.emit('style.load'));
  expect(overlay.addEcaLayers).toHaveBeenCalledTimes(2);
  expect(overlay.addEcaLayers).toHaveBeenLastCalledWith(currentMap, {
    isDark: true,
    visible: true,
  });

  fireEvent.click(screen.getByRole('button', { name: /buyerMap\.layers\.button/ }));
  fireEvent.click(screen.getAllByRole('switch')[2]);
  expect(overlay.setEcaLayersVisible).toHaveBeenLastCalledWith(currentMap, false);

  act(() => currentMap.emit('style.load'));
  expect(overlay.addEcaLayers).toHaveBeenCalledTimes(3);
  expect(overlay.addEcaLayers).toHaveBeenLastCalledWith(currentMap, {
    isDark: true,
    visible: false,
  });
});
