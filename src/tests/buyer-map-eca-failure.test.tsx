import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const mapState = vi.hoisted(() => ({ constructors: 0, removes: 0 }));
const overlay = vi.hoisted(() => {
  let rejectModule!: (error: Error) => void;
  const modulePromise = new Promise<never>((_resolve, reject) => {
    rejectModule = reject;
  });
  return {
    loadEcaLayers: vi.fn(() => modulePromise),
    rejectModule,
  };
});

vi.mock('../map/loadEcaLayers', () => ({ loadEcaLayers: overlay.loadEcaLayers }));
vi.mock('../hooks/useNamespace', () => ({
  useNamespace: () => ({ ready: true, t: (key: string) => key }),
}));
vi.mock('../hooks/useDashboardContentReady', () => ({ useDashboardContentReady: vi.fn() }));
vi.mock('../hooks/useSSE', () => ({ useSSE: () => ({ isConnected: false }) }));
vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('../components/map/MarketWatchTicker', () => ({ MarketWatchTicker: () => null }));
vi.mock('../components/map/IntelligencePanel', () => ({ IntelligencePanel: () => null }));
vi.mock('../components/map/MapLegend', () => ({ MapLegend: () => null }));
vi.mock('../components/ui/VerdaxisSelect', () => ({ VerdaxisSelect: () => null }));
vi.mock('../services/api', () => ({
  api: {
    ports: { list: vi.fn().mockResolvedValue([]) },
    catalog: { deliveryPoints: vi.fn().mockResolvedValue([]) },
    orderbook: { compactMapSummary: vi.fn().mockResolvedValue({ markets: [], demo_groups: [], recent_asks: [] }) },
    vessels: { list: vi.fn().mockResolvedValue([]) },
  },
}));
vi.mock('mapbox-gl', () => {
  class MockMap {
    constructor() { mapState.constructors += 1; }
    addControl() {}
    addLayer() {}
    addSource() {}
    getCanvas() { return { style: {} }; }
    getLayer() { return undefined; }
    getSource() { return undefined; }
    hasImage() { return true; }
    isStyleLoaded() { return true; }
    loaded() { return true; }
    on() {}
    off() {}
    once() {}
    remove() { mapState.removes += 1; }
    resize() {}
    setLanguage() {}
    setStyle() {}
    stop() {}
  }
  return {
    default: {
      Map: MockMap,
      Popup: class {},
      NavigationControl: class {},
    },
  };
});

import { BuyerMap } from '../components/BuyerMap';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('ignores an unmounted import and reports an ECA module failure without disrupting Mapbox', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  const staleView = render(<BuyerMap active onPortSelect={vi.fn()} onNavigate={vi.fn()} />);
  await waitFor(() => expect(overlay.loadEcaLayers).toHaveBeenCalledOnce());
  staleView.unmount();
  await act(async () => {
    overlay.rejectModule(new Error('ECA chunk unavailable'));
    await Promise.resolve();
  });
  expect(mapState.removes).toBe(1);

  render(<BuyerMap active onPortSelect={vi.fn()} onNavigate={vi.fn()} />);

  expect(await screen.findByText('buyerMap.ecaOverlayError')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'buyerMap.ecaOverlayRetry' })).toBeTruthy();
  expect(mapState.constructors).toBe(2);
});
