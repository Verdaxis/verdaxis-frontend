import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';

import { BuyerMap } from '../components/BuyerMap';
import { WebGLHelp } from '../components/map/WebGLHelp';
import { browserFamily, isWebGLUnavailableError } from '../map/webglSupport';
import { renderWithProviders } from './test-utils';

const construction = vi.hoisted(() => ({ attempts: 0 }));

vi.mock('../hooks/useNamespace', () => ({
  useNamespace: () => ({ ready: true, t: (key: string) => key }),
}));
vi.mock('../hooks/useDashboardContentReady', () => ({ useDashboardContentReady: () => {} }));
vi.mock('../hooks/useSSE', () => ({ useSSE: () => ({ isConnected: false }) }));
vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('../map/loadEcaLayers', () => ({ loadEcaLayers: vi.fn() }));
vi.mock('../components/map/MarketWatchTicker', () => ({ MarketWatchTicker: () => null }));
vi.mock('../components/map/IntelligencePanel', () => ({ IntelligencePanel: () => null }));
vi.mock('../components/map/MapLegend', () => ({ MapLegend: () => null }));
vi.mock('../components/ui/VerdaxisSelect', () => ({ VerdaxisSelect: () => null }));
vi.mock('../services/api', () => ({
  api: {
    ports: { list: vi.fn().mockResolvedValue([]) },
    catalog: { deliveryPoints: vi.fn().mockResolvedValue([]), products: vi.fn().mockResolvedValue([]) },
    orderbook: { compactMapSummary: vi.fn().mockResolvedValue({ markets: [], demo_groups: [], recent_asks: [] }) },
    vessels: { list: vi.fn().mockResolvedValue([]) },
  },
}));

// The browser cannot create a WebGL context: Mapbox's constructor throws.
vi.mock('mapbox-gl', () => ({
  default: {
    Map: class {
      constructor() {
        construction.attempts += 1;
        throw new Error('Failed to initialize WebGL.');
      }
    },
    Popup: class {},
    NavigationControl: class {},
  },
}));

describe('BuyerMap without WebGL', () => {
  it('shows the browser fix instead of the generic error screen', async () => {
    renderWithProviders(<BuyerMap active onPortSelect={vi.fn()} onNavigate={vi.fn()} />);
    await act(async () => { await Promise.resolve(); });

    expect(construction.attempts).toBe(1);
    const text = screen.getByRole('alert').textContent ?? '';
    for (const key of ['title', 'body', 'stepRestart']) {
      expect(text).toContain(`buyerMap.webgl.${key}`);
    }
    // jsdom names no known browser, so the general steps show.
    expect(text).toContain('buyerMap.webgl.browsers.other.acceleration');
    expect(text).toContain('buyerMap.webgl.browsers.other.check');
    expect(screen.getByRole('button', { name: 'buyerMap.webgl.retry' })).toBeTruthy();
  });

  it('treats only a WebGL failure as a browser setting', () => {
    expect(isWebGLUnavailableError(new Error('Failed to initialize WebGL.'))).toBe(true);
    expect(isWebGLUnavailableError(new Error('Failed to initialize WebGL2'))).toBe(true);
    expect(isWebGLUnavailableError(new Error('Style is not done loading'))).toBe(false);
    expect(isWebGLUnavailableError('WebGL')).toBe(false);
  });

  it('names the settings path of the browser in use', () => {
    const chrome = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
    const edge = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0';
    const opera = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 OPR/120.0.0.0';
    const firefox = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:144.0) Gecko/20100101 Firefox/144.0';
    const safari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Safari/605.1.15';
    expect(browserFamily(chrome)).toBe('chrome');
    expect(browserFamily(edge)).toBe('edge');
    expect(browserFamily(opera)).toBe('other');
    expect(browserFamily(firefox)).toBe('firefox');
    expect(browserFamily(safari)).toBe('safari');
    expect(browserFamily('')).toBe('other');

    const view = renderWithProviders(<WebGLHelp userAgent={edge} />);
    const text = view.container.textContent ?? '';
    expect(text).toContain('buyerMap.webgl.stepRestart');
    expect(text).toContain('buyerMap.webgl.browsers.edge.acceleration');
    expect(text).toContain('buyerMap.webgl.browsers.edge.check');
  });
});
