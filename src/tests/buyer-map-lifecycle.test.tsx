import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';

import { BuyerMap } from '../components/BuyerMap';
import i18n from '../i18n';
import { renderWithProviders } from './test-utils';

const lifecycle = vi.hoisted(() => ({
  ready: false,
  constructors: 0,
  removes: 0,
  container: null as HTMLElement | null,
  contentReady: false,
  idleHandlers: new Set<() => void>(),
}));

vi.mock('../hooks/useNamespace', () => ({
  useNamespace: () => ({ ready: lifecycle.ready, t: (key: string) => key }),
}));

vi.mock('../hooks/useDashboardContentReady', () => ({
  useDashboardContentReady: (_page: string, ready: boolean) => {
    lifecycle.contentReady = ready;
  },
}));
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
    off(event: string, callback: () => void) {
      if (event === 'idle') lifecycle.idleHandlers.delete(callback);
    }
    on(event: string, callback: () => void) {
      if (event === 'style.load') callback();
    }
    once(event: string, callback: () => void) {
      if (event === 'idle') lifecycle.idleHandlers.add(callback);
    }
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
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    lifecycle.ready = false;
    lifecycle.constructors = 0;
    lifecycle.removes = 0;
    lifecycle.container = null;
    lifecycle.contentReady = false;
    lifecycle.idleHandlers.clear();
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

  it('finishes deferred language readiness after hide and return', async () => {
    lifecycle.ready = true;
    const props = { onPortSelect: vi.fn(), onNavigate: vi.fn() };
    const view = renderWithProviders(<BuyerMap active {...props} />);
    await act(async () => { await Promise.resolve(); });
    expect(lifecycle.contentReady).toBe(true);

    await act(async () => { await i18n.changeLanguage('zh'); });
    expect(lifecycle.contentReady).toBe(false);
    expect(lifecycle.idleHandlers.size).toBe(1);

    view.rerender(<BuyerMap active={false} {...props} />);
    view.rerender(<BuyerMap active {...props} />);
    expect(lifecycle.contentReady).toBe(false);
    expect(lifecycle.idleHandlers.size).toBe(1);

    await act(async () => {
      const handlers = [...lifecycle.idleHandlers];
      lifecycle.idleHandlers.clear();
      handlers.forEach(handler => handler());
    });
    expect(lifecycle.contentReady).toBe(true);
  });
});
