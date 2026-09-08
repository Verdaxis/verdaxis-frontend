import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';

import { BuyerMap } from '../components/BuyerMap';
import { renderWithProviders } from './test-utils';

const lifecycle = vi.hoisted(() => ({
  ready: false,
  constructors: 0,
  removes: 0,
  container: null as HTMLElement | null,
}));

vi.mock('../hooks/useNamespace', () => ({
  useNamespace: () => ({ ready: lifecycle.ready, t: (key: string) => key }),
}));

vi.mock('../hooks/useDashboardContentReady', () => ({ useDashboardContentReady: () => undefined }));
vi.mock('../hooks/useSSE', () => ({ useSSE: () => ({ isConnected: false }) }));
vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('../map/addEcaLayers', () => ({
  addEcaLayers: vi.fn(),
  setEcaLayersVisible: vi.fn(),
}));
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
    constructor(options: { container: HTMLElement }) {
      lifecycle.constructors += 1;
      lifecycle.container = options.container;
    }
    addControl() {}
    addLayer() {}
    addSource() {}
    getCanvas() { return { style: {} }; }
    getLayer() { return undefined; }
    getSource() { return undefined; }
    hasImage() { return true; }
    loaded() { return true; }
    off() {}
    on() {}
    once(_event: string, callback: () => void) { callback(); }
    remove() { lifecycle.removes += 1; }
    resize() {}
    setLanguage() {}
    setStyle() {}
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

describe('BuyerMap retained lifecycle', () => {
  beforeEach(() => {
    lifecycle.ready = false;
    lifecycle.constructors = 0;
    lifecycle.removes = 0;
    lifecycle.container = null;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('creates after a hide-before-ready transition and retains the canvas through later readiness changes', async () => {
    const props = { onPortSelect: vi.fn(), onNavigate: vi.fn() };
    const view = renderWithProviders(<BuyerMap active {...props} />);
    await act(async () => { await Promise.resolve(); });
    const loadingContainer = document.querySelector('.verdaxis-buyer-map');
    expect(lifecycle.constructors).toBe(0);

    view.rerender(<BuyerMap active={false} {...props} />);
    lifecycle.ready = true;
    view.rerender(<BuyerMap active={false} {...props} />);
    expect(lifecycle.constructors).toBe(0);

    view.rerender(<BuyerMap active {...props} />);
    await act(async () => { await Promise.resolve(); });
    expect(lifecycle.constructors).toBe(1);
    expect(lifecycle.container).toBe(loadingContainer);

    lifecycle.ready = false;
    view.rerender(<BuyerMap active {...props} />);
    lifecycle.ready = true;
    view.rerender(<BuyerMap active {...props} />);
    expect(lifecycle.constructors).toBe(1);
    expect(lifecycle.removes).toBe(0);
    expect(document.querySelector('.verdaxis-buyer-map')).toBe(loadingContainer);
  });
});
