import React from 'react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { MarketWatchTicker } from '../components/map/MarketWatchTicker';
import { PORTS } from '../data';
import i18n, { loadNamespace } from '../i18n';
import type { AggregatedOrderbook, Product } from '../types';
import { renderWithProviders } from './test-utils';

const priceSummariesMock = vi.fn();
const deliveryPointsMock = vi.fn();

vi.mock('../services/api', () => ({
  api: {
    catalog: {
      deliveryPoints: (...args: unknown[]) => deliveryPointsMock(...args),
    },
    prices: {
      getSummaries: (...args: unknown[]) => priceSummariesMock(...args),
    },
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

const STORAGE_KEY = 'verdaxis_market_watch_preferences_v1';
const DELIVERY_POINTS = [
  { id: 'dp-rotterdam-uuid', name: 'Rotterdam', region: 'Europe', is_active: true },
  { id: 'dp-singapore-uuid', name: 'Singapore', region: 'Asia', is_active: true },
  { id: 'dp-santos-uuid', name: 'Santos', region: 'South America', is_active: true },
  { id: 'dp-shanghai-uuid', name: 'Shanghai', region: 'Asia', is_active: true },
];

const CATALOG_PRODUCTS: Product[] = [{
  id: 'product-ucome', name: 'UCOME B100', market_product: 'UCOME_B100',
  fuel_type: 'FAME', fuel_grade: 'UCOME', unit: 'MT', min_lot_size: 1,
  is_active: true, execution_mode: 'ORDERBOOK',
  available_delivery_point_ids: ['dp-singapore-uuid'],
}];

const makeSummary = (overrides: Record<string, unknown> = {}) => ({
  market_product: 'BIO_METHANOL',
  delivery_point_id: 'dp-singapore-uuid',
  delivery_point_name: 'Singapore',
  availability_window: 'SPOT',
  fuel_type: 'Methanol',
  region: 'Singapore',
  last_price: 777,
  avg_price_24h: 770,
  high_24h: 790,
  low_24h: 760,
  volume_24h: 5000,
  trade_count_24h: 2,
  price_change_pct: 1.4,
  last_trade_at: new Date().toISOString(),
  ...overrides,
});

const DEMO_ORDERBOOK: AggregatedOrderbook[] = [
  {
    market_product: 'BIO_METHANOL', delivery_point_name: 'Rotterdam', availability_window: '2026-08',
    region: 'Europe', fuel_type: 'Methanol', side: 'BID', min_price: 900, max_price: 900,
    total_quantity: 1500, order_count: 1, source_kind: 'DEMO_SEED', demo_status: 'DEMO_ONLY',
  },
  {
    market_product: 'BIO_METHANOL', delivery_point_name: 'Rotterdam', availability_window: '2026-08',
    region: 'Europe', fuel_type: 'Methanol', side: 'ASK', min_price: 975, max_price: 975,
    total_quantity: 1500, order_count: 1, source_kind: 'DEMO_SEED', demo_status: 'DEMO_ONLY',
  },
  {
    market_product: 'BIO_METHANOL', delivery_point_name: 'Santos', availability_window: '2026-08',
    region: 'South America', fuel_type: 'Methanol', side: 'BID', min_price: 820, max_price: 820,
    total_quantity: 1500, order_count: 1, source_kind: 'DEMO_SEED', demo_status: 'DEMO_ONLY',
  },
  {
    market_product: 'BIO_METHANOL', delivery_point_name: 'Santos', availability_window: '2026-08',
    region: 'South America', fuel_type: 'Methanol', side: 'ASK', min_price: 895, max_price: 895,
    total_quantity: 1500, order_count: 1, source_kind: 'DEMO_SEED', demo_status: 'DEMO_ONLY',
  },
];

describe('MarketWatchTicker', () => {
  beforeEach(() => {
    localStorage.clear();
    deliveryPointsMock.mockReset();
    deliveryPointsMock.mockResolvedValue(DELIVERY_POINTS);
    priceSummariesMock.mockReset();
    priceSummariesMock.mockResolvedValue({ summaries: [], generated_at: new Date().toISOString() });
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  const setSingleProductPreferences = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      products: ['BIO_METHANOL'],
      portIds: ['nl-rtm', 'sg-sin', 'br-ssz'],
    }));
  };

  it('formats availability windows and market status copy in Chinese', async () => {
    await loadNamespace('dashboard');
    await i18n.changeLanguage('zh');
    setSingleProductPreferences();
    priceSummariesMock.mockResolvedValue({
      summaries: [makeSummary({
        source_kind: 'LIVE_ORDER',
        last_trade_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      })],
      generated_at: new Date().toISOString(),
    });

    renderWithProviders(
      <MarketWatchTicker catalogProducts={CATALOG_PRODUCTS}
        isPanelOpen={false}
        onOpenPanel={vi.fn()}
        ports={PORTS}
        aggregatedData={DEMO_ORDERBOOK}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('$777')).toBeTruthy();
    });
    expect(screen.getAllByText('2026年8月').length).toBeGreaterThan(0);
    expect(screen.getAllByText('数据过期').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '配置市场监控' }));
    expect(screen.getByText('选择一个或多个市场产品和交付点。行情条会按港口分组显示所选燃料。演示数据为预置的产品演示活动；参考数据为基准或模型背景，不代表可成交流动性。')).toBeTruthy();
  });

  it('renders mixed trade summaries and marketplace-derived demo rows without blanks', async () => {
    setSingleProductPreferences();
    priceSummariesMock.mockImplementation(({ market_product }) => Promise.resolve({
      summaries: market_product === 'BIO_METHANOL'
        ? [makeSummary({ source_kind: 'MIXED_SOURCE', demo_status: 'MIXED' })]
        : [],
      generated_at: new Date().toISOString(),
    }));

    renderWithProviders(
      <MarketWatchTicker catalogProducts={CATALOG_PRODUCTS}
        isPanelOpen={false}
        onOpenPanel={vi.fn()}
        ports={PORTS}
        aggregatedData={DEMO_ORDERBOOK}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('$777')).toBeTruthy();
    });

    expect(screen.getByText('$938')).toBeTruthy();
    expect(screen.getByText('$858')).toBeTruthy();
    expect(screen.getByText('Mixed')).toBeTruthy();
    expect(screen.getAllByText('Demo').length).toBeGreaterThan(0);
    expect(screen.queryByText('Reference')).toBeNull();
    expect(screen.queryByText('No data')).toBeNull();
    expect(screen.getByText(/MIXED SOURCES/)).toBeTruthy();
    expect(screen.queryByText(/RECENT FEED/)).toBeNull();
    expect(priceSummariesMock).toHaveBeenCalledWith(expect.objectContaining({
      market_product: 'BIO_METHANOL',
      availability_window: 'SPOT',
      hours: 168,
    }));
    expect(priceSummariesMock).not.toHaveBeenCalledWith(expect.objectContaining({ delivery_point_id: 'dp-singapore-uuid' }));
    expect(priceSummariesMock).not.toHaveBeenCalledWith(expect.objectContaining({ delivery_point_id: 'sg-sin' }));
    expect(priceSummariesMock).not.toHaveBeenCalledWith(expect.objectContaining({ region: 'Singapore' }));
  });

  it.each([
    {
      name: 'fresh real order summaries as recent activity',
      summary: { source_kind: 'LIVE_ORDER' },
      visible: ['Recent'],
      absent: ['Stale'],
      sourcePattern: null,
    },
    {
      name: 'old seven-day summary trades as stale, not live',
      summary: {
        source_kind: 'LIVE_ORDER',
        trade_count_24h: 3,
        last_trade_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      },
      visible: ['Stale'],
      absent: ['Recent', /REFERENCE/],
      sourcePattern: /MIXED SOURCES/,
    },
    {
      name: 'demo-seeded summaries as demo data instead of reference data',
      summary: { source_kind: 'DEMO_SEED', demo_status: 'DEMO_ONLY' },
      visible: ['Demo'],
      absent: [/REFERENCE/],
      sourcePattern: /MIXED SOURCES|DEMO DATA/,
    },
  ])('labels $name', async ({ summary, visible, absent, sourcePattern }) => {
    setSingleProductPreferences();
    priceSummariesMock.mockImplementation(({ market_product }) => Promise.resolve({
      summaries: market_product === 'BIO_METHANOL'
        ? [makeSummary(summary)]
        : [],
      generated_at: new Date().toISOString(),
    }));

    renderWithProviders(<MarketWatchTicker catalogProducts={CATALOG_PRODUCTS} isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => {
      expect(screen.getByText('$777')).toBeTruthy();
    });

    visible.forEach((label) => expect(screen.getAllByText(label).length).toBeGreaterThan(0));
    absent.forEach((label) => expect(screen.queryByText(label)).toBeNull());
    if (sourcePattern) {
      expect(screen.getByText(sourcePattern)).toBeTruthy();
    }
  });

  it('does not use generic fuel-family summaries for a different canonical product', async () => {
    setSingleProductPreferences();
    priceSummariesMock.mockImplementation(({ market_product }) => Promise.resolve({
      summaries: market_product === 'BIO_METHANOL'
        ? [makeSummary({ market_product: 'E_METHANOL', delivery_point_id: 'dp-singapore-uuid' })]
        : [],
      generated_at: new Date().toISOString(),
    }));

    renderWithProviders(
      <MarketWatchTicker catalogProducts={CATALOG_PRODUCTS}
        isPanelOpen={false}
        onOpenPanel={vi.fn()}
        ports={PORTS}
        aggregatedData={DEMO_ORDERBOOK}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Demo').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('$777')).toBeNull();
  });

  it('recovers from malformed preferences without rewriting defaults on mount', async () => {
    localStorage.setItem(STORAGE_KEY, '{bad-json');

    renderWithProviders(<MarketWatchTicker catalogProducts={CATALOG_PRODUCTS} isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => {
      expect(priceSummariesMock).toHaveBeenCalled();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe('{bad-json');
  });

  it('validates stored legacy product and renders selected approved ports', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      product: 'Methanol',
      portIds: ['sg-sin', 'nl-rtm', 'br-ssz', 'bad-port', 'us-hou'],
    }));

    renderWithProviders(<MarketWatchTicker catalogProducts={CATALOG_PRODUCTS} isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => {
      expect(priceSummariesMock).toHaveBeenCalled();
    });

    expect(screen.getByText(/5 selected fuels/)).toBeTruthy();
    expect(screen.getByText(/4 points/)).toBeTruthy();
  });

  it('requests B100 market prices and shows no data without inventing a preview price', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      products: ['UCOME_B100', 'BIO_METHANOL'],
      portIds: ['sg-sin'],
    }));

    renderWithProviders(<MarketWatchTicker catalogProducts={CATALOG_PRODUCTS} isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => expect(priceSummariesMock).toHaveBeenCalled());
    expect(priceSummariesMock.mock.calls.map(([params]) => params.market_product)).toEqual(['UCOME_B100', 'BIO_METHANOL']);
    const b100 = screen.getAllByText('UCOME B100')[0].closest('[data-market-watch-item]');
    expect(b100?.textContent).toContain('No data');
    expect(b100?.textContent).not.toContain('$');
    expect(b100?.textContent).not.toContain('DEMO');
    fireEvent.click(screen.getByRole('button', { name: 'Configure market watch' }));
    expect(screen.getByRole('button', { name: /UCOME/ })).toBeTruthy();
  });

  it('shows a B100 price only when the API returns the matching product, point and spot window', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ products: ['UCOME_B100'], portIds: ['sg-sin'] }));
    priceSummariesMock.mockResolvedValue({ summaries: [
      makeSummary({ last_price: 999 }),
      makeSummary({ market_product: 'UCOME_B100', last_price: 1110, source_kind: 'CONFIRMED_TRADE', observed_at: new Date().toISOString() }),
    ] });
    renderWithProviders(<MarketWatchTicker catalogProducts={CATALOG_PRODUCTS} isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);
    expect(await screen.findByText('$1110')).toBeTruthy();
    expect(screen.queryByText('$999')).toBeNull();
  });

  it('omits unsupported B100 ports while retaining alcohol rows at those ports', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      products: ['UCOME_B100', 'BIO_METHANOL'], portIds: ['sg-sin', 'nl-rtm'],
    }));
    priceSummariesMock.mockResolvedValue({ summaries: [makeSummary({
      market_product: 'UCOME_B100', delivery_point_id: 'dp-rotterdam-uuid', last_price: 1234,
    })] });
    renderWithProviders(<MarketWatchTicker catalogProducts={CATALOG_PRODUCTS} isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => expect(screen.getByText('No data')).toBeTruthy());
    const b100Rows = screen.getAllByText('UCOME B100');
    expect(b100Rows).toHaveLength(1);
    expect(b100Rows[0].closest('[data-market-watch-item]')?.textContent).toContain('Singapore');
    expect(screen.getByText('Rotterdam').closest('[data-market-watch-item]')?.textContent).toContain('Bio Methanol');
    expect(screen.queryByText('$1234')).toBeNull();
    expect(screen.getByText(/2 selected fuels/)).toBeTruthy();
  });

  it.each([
    { language: 'en', count: '1 selected fuel', empty: 'No supported markets for these selections. Choose another fuel or delivery point.', loading: 'CONNECTING...' },
    { language: 'zh', count: '已选 1 种燃料', empty: '所选组合暂无支持的市场。请选择其他燃料或交付点。', loading: '连接中...' },
  ])('shows a clear empty selection state in $language', async ({ language, count, empty, loading }) => {
    await loadNamespace('dashboard');
    await i18n.changeLanguage(language);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ products: ['UCOME_B100'], portIds: ['nl-rtm'] }));
    renderWithProviders(<MarketWatchTicker catalogProducts={CATALOG_PRODUCTS} isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    expect(await screen.findByText(empty)).toBeTruthy();
    expect(screen.getByText(text => text.includes(count))).toBeTruthy();
    expect(screen.queryByText(text => text.includes(loading))).toBeNull();
    expect(priceSummariesMock).not.toHaveBeenCalled();
    expect(document.querySelector('[data-market-watch-item]')).toBeNull();
  });

  it('does not infer B100 coverage when the product catalog is unavailable', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ products: ['UCOME_B100'], portIds: ['sg-sin'] }));
    renderWithProviders(<MarketWatchTicker isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);
    expect(await screen.findByText('No supported markets for these selections. Choose another fuel or delivery point.')).toBeTruthy();
    expect(priceSummariesMock).not.toHaveBeenCalled();
    expect(document.querySelector('[data-market-watch-item]')).toBeNull();
  });

  it('supports multi-fuel and more than three pinned delivery points', async () => {
    setSingleProductPreferences();
    renderWithProviders(<MarketWatchTicker catalogProducts={CATALOG_PRODUCTS} isPanelOpen={false} onOpenPanel={vi.fn()} ports={PORTS} />);

    await waitFor(() => {
      expect(priceSummariesMock).toHaveBeenCalled();
    });

    const configureButton = screen.getByRole('button', { name: 'Configure market watch' });
    fireEvent.click(configureButton);
    expect(configureButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('dialog', { name: 'Configure market watch' })).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(configureButton.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByRole('dialog', { name: 'Configure market watch' })).toBeNull();
      expect(document.activeElement).toBe(configureButton);
    });

    fireEvent.click(configureButton);
    expect(configureButton.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Close market watch configuration' }));
    await waitFor(() => {
      expect(configureButton.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByRole('dialog', { name: 'Configure market watch' })).toBeNull();
      expect(document.activeElement).toBe(configureButton);
    });

    fireEvent.click(configureButton);
    expect(configureButton.getAttribute('aria-expanded')).toBe('true');

    const shanghaiButton = screen.getByRole('button', { name: 'Shanghai' }) as HTMLButtonElement;
    expect(shanghaiButton.disabled).toBe(false);
    expect(shanghaiButton.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      fireEvent.click(shanghaiButton);
    });
    await waitFor(() => {
      expect(shanghaiButton.getAttribute('aria-pressed')).toBe('true');
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'e-Methanol' }));
      fireEvent.click(screen.getByRole('button', { name: 'Bio Ethanol' }));
    });

    await waitFor(() => {
      expect(screen.getByText(/3 selected fuels/)).toBeTruthy();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.products).toEqual(['BIO_METHANOL', 'E_METHANOL', 'BIO_ETHANOL']);
    expect(stored.portIds).toEqual(['nl-rtm', 'sg-sin', 'br-ssz', 'cn-sha']);
  });
});
