import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';

import { ForwardCurveWorkspace } from '../components/ForwardCurveWorkspace';
import i18n, { loadNamespace } from '../i18n';
import type { ForwardCurveMarketCell, ForwardCurveSliceResponse, ForwardCurveTableResponse, MarketProduct } from '../types';
import { renderWithProviders } from './test-utils';
import { getAvailabilityWindowOptions, formatAvailabilityWindow } from '../utils/availabilityWindow';

const tableMock = vi.fn();
const sliceMock = vi.fn();

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

const storeSelection = (cell: ForwardCurveMarketCell) => {
  localStorage.setItem('verdaxis_forward_curve_product', cell.market_product);
  localStorage.setItem('verdaxis_forward_curve_delivery_point', cell.delivery_point_id);
  localStorage.setItem('verdaxis_forward_curve_window', cell.availability_window);
};

vi.mock('../services/api', () => ({
  api: {
    curves: {
      table: (...args: unknown[]) => tableMock(...args),
      slice: (...args: unknown[]) => sliceMock(...args),
    },
  },
}));

const baseCell = (
  marketProduct: MarketProduct,
  deliveryPointId: string,
  deliveryPointName: string,
  availabilityWindow: string,
  primaryValue: number | string | null,
): ForwardCurveMarketCell => ({
  market_product: marketProduct,
  product_name: marketProduct,
  representative_product_id: `product-${marketProduct}`,
  product_count: 1,
  delivery_point_id: deliveryPointId,
  delivery_point_name: deliveryPointName,
  region: deliveryPointName === 'Rotterdam' ? 'Europe' : 'Asia',
  availability_window: availabilityWindow,
  primary_value: primaryValue == null ? null : Number(primaryValue),
  primary_signal_type: primaryValue == null ? 'NO_DATA' : 'BENCHMARK_MID',
  primary_source_kind: primaryValue == null ? 'NO_DATA' : 'DEMO_SEED',
  public_source_label: primaryValue == null ? 'No data' : 'Demo orderbook midpoint',
  label_policy: {
    public_label: primaryValue == null ? 'No data' : 'Demo orderbook midpoint',
    disclaimer: 'Demo seeded preview data.',
  },
  staleness_status: primaryValue == null ? 'NO_DATA' : 'FRESH',
  is_executable: false,
  is_reference: true,
  demo_status: primaryValue == null ? 'UNKNOWN' : 'DEMO_ONLY',
  scope: 'DELIVERY_POINT',
  observed_at: '2026-06-17T10:00:00Z',
  generated_at: '2026-06-17T10:01:00Z',
  best_bid: primaryValue == null ? null : Number(primaryValue) - 35,
  best_ask: primaryValue == null ? null : Number(primaryValue) + 35,
  spread: primaryValue == null ? null : 70,
  volume_mt: primaryValue == null ? 0 : 9500,
  order_count: primaryValue == null ? 0 : 2,
  real_order_count: 0,
  demo_order_count: primaryValue == null ? 0 : 2,
  unknown_order_count: 0,
});

const singaporeSpot = baseCell('BIO_METHANOL', 'dp-singapore', 'Singapore', 'SPOT', '1015');
const rotterdamQuarter = baseCell('E_METHANOL', 'dp-rotterdam', 'Rotterdam', '2026-Q3', '1250');
const dalianEmpty = baseCell('BIO_ETHANOL', 'dp-dalian', 'Dalian', 'SPOT', null);
const santosIndication = {
  ...baseCell('SYNTHETIC_ETHANOL', 'dp-santos', 'Santos', 'SPOT', '790'),
  primary_signal_type: 'MARKET_INDICATION',
  primary_source_kind: 'MARKET_INDICATION',
  public_source_label: 'Sanitized market indication',
  demo_status: 'REAL_ONLY',
} as ForwardCurveMarketCell;
const houstonLiveOrder = {
  ...baseCell('BIO_METHANOL', 'dp-houston', 'Houston', 'SPOT', '900'),
  primary_signal_type: 'ORDERBOOK_BID',
  primary_source_kind: 'LIVE_ORDER',
  public_source_label: 'User order midpoint',
  demo_status: 'REAL_ONLY',
  real_order_count: 2,
  demo_order_count: 0,
} as ForwardCurveMarketCell;
const rotterdamConfirmedTrade = {
  ...baseCell('E_METHANOL', 'dp-rotterdam', 'Rotterdam', 'SPOT', '1250'),
  primary_signal_type: 'CONFIRMED_TRADE',
  primary_source_kind: 'CONFIRMED_TRADE',
  public_source_label: 'Confirmed trade print',
  demo_status: 'REAL_ONLY',
} as ForwardCurveMarketCell;
const dalianReference = {
  ...baseCell('BIO_ETHANOL', 'dp-dalian', 'Dalian', 'SPOT', '650'),
  primary_signal_type: 'BENCHMARK_MID',
  primary_source_kind: 'BENCHMARK_REFERENCE',
  public_source_label: 'Benchmark reference',
  demo_status: 'NOT_APPLICABLE',
} as ForwardCurveMarketCell;

const makeTable = (): ForwardCurveTableResponse => ({
  columns: [
    { availability_window: 'SPOT', display_label: 'Spot', group: 'SPOT' },
    { availability_window: '2026-Q3', display_label: 'Q3 26', group: 'QUARTERLY' },
  ],
  rows: [
    {
      row_key: 'BIO_METHANOL:dp-singapore',
      market_product: 'BIO_METHANOL',
      product_name: 'BIO_METHANOL',
      representative_product_id: 'product-BIO_METHANOL',
      product_count: 1,
      delivery_point_id: 'dp-singapore',
      delivery_point_name: 'Singapore',
      region: 'Asia',
      cells: { SPOT: singaporeSpot },
    },
    {
      row_key: 'E_METHANOL:dp-rotterdam',
      market_product: 'E_METHANOL',
      product_name: 'E_METHANOL',
      representative_product_id: 'product-E_METHANOL',
      product_count: 1,
      delivery_point_id: 'dp-rotterdam',
      delivery_point_name: 'Rotterdam',
      region: 'Europe',
      cells: { '2026-Q3': rotterdamQuarter },
    },
    {
      row_key: 'BIO_ETHANOL:dp-dalian',
      market_product: 'BIO_ETHANOL',
      product_name: 'BIO_ETHANOL',
      representative_product_id: 'product-BIO_ETHANOL',
      product_count: 1,
      delivery_point_id: 'dp-dalian',
      delivery_point_name: 'Dalian',
      region: 'Asia',
      cells: { SPOT: dalianEmpty },
    },
  ],
  latest_signals: [
    {
      market_product: 'BIO_METHANOL',
      delivery_point_id: 'dp-singapore',
      delivery_point_name: 'Singapore',
      availability_window: 'SPOT',
      primary_value: 1015,
      primary_signal_type: 'BENCHMARK_MID',
      primary_source_kind: 'DEMO_SEED',
      public_source_label: 'Demo orderbook midpoint',
      demo_status: 'DEMO_ONLY',
      observed_at: '2026-06-17T10:00:00Z',
      staleness_status: 'FRESH',
    },
  ],
  generated_at: '2026-06-17T10:01:00Z',
  disclaimer: 'Indicative estimate only.',
});

const makeSlice = (cell: ForwardCurveMarketCell = singaporeSpot): ForwardCurveSliceResponse => ({
  cell,
  previous_window: cell.availability_window === '2026-Q3' ? 'SPOT' : null,
  next_window: cell.availability_window === 'SPOT' ? '2026-Q3' : null,
  depth_bids: [{ price_per_mt_usd: Number(cell.primary_value ?? 0) - 35, quantity_mt: 5000, order_count: 1, source_kind: 'DEMO_SEED', demo_status: 'DEMO_ONLY' }],
  depth_asks: [{ price_per_mt_usd: Number(cell.primary_value ?? 0) + 35, quantity_mt: 4500, order_count: 1, source_kind: 'DEMO_SEED', demo_status: 'DEMO_ONLY' }],
  trades: [],
  indications: [],
  fair_price_band: null,
  physical_stems: [],
  evidence_points: [
    {
      layer: 'ORDERBOOK_BID',
      price_per_mt_usd: Number(cell.primary_value ?? 0) - 35,
      quantity_mt: 5000,
      public_source_label: 'Bid depth',
      source_kind: 'DEMO_SEED',
      demo_status: 'DEMO_ONLY',
      observed_at: '2026-06-17T10:00:00Z',
    },
    {
      layer: 'ORDERBOOK_ASK',
      price_per_mt_usd: Number(cell.primary_value ?? 0) + 35,
      quantity_mt: 4500,
      public_source_label: 'Ask depth',
      source_kind: 'DEMO_SEED',
      demo_status: 'DEMO_ONLY',
      observed_at: '2026-06-17T10:00:00Z',
    },
    {
      layer: 'FAIR_PRICE_BAND',
      low_price_per_mt_usd: Number(cell.primary_value ?? 0) - 20,
      high_price_per_mt_usd: Number(cell.primary_value ?? 0) + 20,
      public_source_label: 'Fair band',
      source_kind: 'DEMO_SEED',
      demo_status: 'DEMO_ONLY',
      observed_at: '2026-06-17T10:00:00Z',
    },
  ],
  generated_at: '2026-06-17T10:01:00Z',
  disclaimer: 'Indicative estimate only.',
});

const makeLongTable = () => {
  const table = makeTable();
  const options = getAvailabilityWindowOptions();
  table.columns = options.map(option => ({
    availability_window: option.value,
    display_label: option.label,
    group: option.kind === 'quarter' ? 'QUARTERLY' : option.kind === 'month' ? 'MONTHLY' : 'SPOT',
  }));
  table.rows = [{
    ...table.rows[0],
    cells: Object.fromEntries(options.map((option, index) => [
      option.value,
      baseCell('BIO_METHANOL', 'dp-singapore', 'Singapore', option.value, 1000 + index * 5),
    ])),
  }];
  return table;
};

describe('ForwardCurveWorkspace', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
    localStorage.clear();
    tableMock.mockReset();
    sliceMock.mockReset();
    tableMock.mockResolvedValue(makeTable());
    sliceMock.mockImplementation(({ market_product, delivery_point_id, availability_window }) => {
      const cell = [singaporeSpot, rotterdamQuarter, dalianEmpty].find(item => (
        item.market_product === market_product
        && item.delivery_point_id === delivery_point_id
        && item.availability_window === availability_window
      )) ?? singaporeSpot;
      return Promise.resolve(makeSlice(cell));
    });
  });

  it('renders the forward curve above the matrix with a selected-period quote summary', async () => {
    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('Latest Monitored Signals');
    const chart = document.querySelector('[data-tour="forward-curve-chart"]');
    const matrix = document.querySelector('[data-tour="forward-market-matrix"]');
    expect(chart).toBeTruthy();
    expect(matrix).toBeTruthy();
    expect(chart!.compareDocumentPosition(matrix!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Market Matrix')).toBeTruthy();
    expect(screen.getAllByText('Selected Period').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bio Methanol · Singapore').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Demo').length).toBeGreaterThan(0);

    await screen.findByText('Spread');
    expect(screen.getByText('$70')).toBeTruthy();

    expect(screen.queryByText('Indicative Forward Curve')).toBeNull();
    expect(screen.queryByText(/Expand period/i)).toBeNull();
    expect(screen.queryByText(/TradingView/i)).toBeNull();
  });

  it('reduces dense depth to best quotes and keeps live, demo, and midpoint semantics clear', async () => {
    const liveMidpointCell = {
      ...singaporeSpot,
      primary_value: 1275,
      primary_signal_type: 'ORDERBOOK_BID',
      primary_source_kind: 'LIVE_ORDER',
      public_source_label: 'Executable orderbook midpoint',
      demo_status: 'REAL_ONLY',
      real_order_count: 10,
      demo_order_count: 10,
    } as ForwardCurveMarketCell;
    const table = makeTable();
    table.rows = [{ ...table.rows[0], cells: { SPOT: liveMidpointCell } }];
    table.columns = [table.columns[0]];
    tableMock.mockResolvedValue(table);
    sliceMock.mockResolvedValue({
      ...makeSlice(liveMidpointCell),
      depth_bids: Array.from({ length: 10 }, (_, index) => ({
        price_per_mt_usd: 1274 - index,
        quantity_mt: 3100 + index * 100,
        order_count: 1,
        source_kind: 'LIVE_ORDER' as const,
        demo_status: 'REAL_ONLY' as const,
      })),
      depth_asks: Array.from({ length: 10 }, (_, index) => ({
        price_per_mt_usd: 1276 + index,
        quantity_mt: 2800 + index * 100,
        order_count: 1,
        source_kind: 'DEMO_SEED' as const,
        demo_status: 'DEMO_ONLY' as const,
      })),
      trades: [{
        price_per_mt_usd: 1000.75,
        quantity_mt: 75,
        confirmed_at: '2026-06-17T10:00:00Z',
        source_kind: 'CONFIRMED_TRADE',
        demo_status: 'REAL_ONLY',
      }],
    });

    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('3.1k MT available');
    const summary = document.querySelector('[data-tour="forward-period-detail"]') as HTMLElement;
    const focusPanel = document.querySelector('[data-tour="forward-focus-panel"]') as HTMLElement;
    const curveMark = summary.querySelector('[data-curve-mark]') as HTMLElement;
    expect(within(summary).getByText('$1,275')).toBeTruthy();
    expect(within(summary).getByText('USD/MT')).toBeTruthy();
    expect(within(summary).getByText('Orderbook midpoint')).toBeTruthy();
    expect(within(summary).getByText('3.1k MT available')).toBeTruthy();
    expect(within(summary).getByText('2.8k MT available')).toBeTruthy();
    expect(within(summary).getAllByText('Live').length).toBeGreaterThan(0);
    expect(within(summary).getByText('Demo')).toBeTruthy();
    expect(within(curveMark).getByText('Live')).toBeTruthy();
    expect(within(focusPanel).getByText('Trade')).toBeTruthy();
    expect(within(summary).getByText('Monitoring mark only. It is not an executable offer.')).toBeTruthy();
    expect(within(summary).getByText(/different or mixed sources/)).toBeTruthy();
    expect(within(summary).queryByText('Executable orderbook midpoint')).toBeNull();
    expect(within(summary).queryByText('$1,273')).toBeNull();
    expect(within(summary).queryByText('Spread')).toBeNull();
    expect(screen.getByText('$1,000.75')).toBeTruthy();
    expect(screen.getAllByText('USD/MT').length).toBeGreaterThan(1);
  });

  it('does not promote a quote with missing provenance to live', async () => {
    sliceMock.mockResolvedValue({
      ...makeSlice(singaporeSpot),
      depth_bids: [{
        price_per_mt_usd: 990,
        quantity_mt: 1000,
        order_count: 1,
        demo_status: 'REAL_ONLY',
        real_order_count: 1,
      }],
      depth_asks: [],
    });

    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('1.0k MT available');
    const summary = document.querySelector('[data-tour="forward-period-detail"]') as HTMLElement;
    expect(within(summary).getByText('Unknown')).toBeTruthy();
    expect(within(summary).queryByText('Live')).toBeNull();
  });

  it('defaults to all periods and changes only the chart horizon, not the matrix or selected slice', async () => {
    const table = makeLongTable();
    tableMock.mockResolvedValue(table);
    sliceMock.mockImplementation(({ availability_window }) => Promise.resolve(makeSlice(table.rows[0].cells[availability_window])));
    renderWithProviders(<ForwardCurveWorkspace />);
    await screen.findByText('Market Matrix');
    const chart = document.querySelector('[data-tour="forward-curve-chart"]') as HTMLElement;
    const graph = within(chart).getByRole('group', { name: /Singapore forward curve/ });
    const pointCount = () => within(graph).getAllByRole('button').length;
    expect(within(chart).getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true');
    expect(pointCount()).toBe(table.columns.length);
    const matrix = document.querySelector('[data-tour="forward-market-matrix"]') as HTMLElement;
    const matrixCount = within(matrix).getAllByRole('button').length;
    const selected = localStorage.getItem('verdaxis_forward_curve_window');

    fireEvent.click(within(chart).getByRole('button', { name: '1Y' }));
    expect(pointCount()).toBe(getAvailabilityWindowOptions({ quarterCount: 4 }).length);
    fireEvent.click(within(chart).getByRole('button', { name: '3Y' }));
    expect(pointCount()).toBe(getAvailabilityWindowOptions({ quarterCount: 12 }).length);
    expect(within(matrix).getAllByRole('button')).toHaveLength(matrixCount);
    expect(localStorage.getItem('verdaxis_forward_curve_window')).toBe(selected);
    fireEvent.click(within(chart).getByRole('button', { name: 'All' }));
    expect(pointCount()).toBe(table.columns.length);
  });

  it('keeps an unlabelled far-period point accessible and preserves its exact Marketplace handoff', async () => {
    const table = makeLongTable();
    tableMock.mockResolvedValue(table);
    sliceMock.mockImplementation(({ availability_window }) => Promise.resolve(makeSlice(table.rows[0].cells[availability_window])));
    const onOpenSlice = vi.fn();
    renderWithProviders(<ForwardCurveWorkspace onOpenSlice={onOpenSlice} />);
    await screen.findByText('Market Matrix');
    const chart = document.querySelector('[data-tour="forward-curve-chart"]') as HTMLElement;
    const lastWindow = table.columns.at(-1)!.availability_window;
    const farPoint = within(chart).getByRole('button', { name: new RegExp(formatAvailabilityWindow(lastWindow)) });
    fireEvent.keyDown(farPoint, { key: 'Enter' });
    await waitFor(() => expect(farPoint.getAttribute('aria-pressed')).toBe('true'));
    await waitFor(() => expect(sliceMock).toHaveBeenLastCalledWith({
      market_product: 'BIO_METHANOL', delivery_point_id: 'dp-singapore', availability_window: lastWindow,
    }));
    expect(localStorage.getItem('verdaxis_forward_curve_window')).toBe(lastWindow);
    fireEvent.click(within(chart).getByRole('button', { name: '1Y' }));
    expect(within(chart).getByText(/Selected period is outside this horizon/)).toBeTruthy();
    const focusPanel = document.querySelector('[data-tour="forward-focus-panel"]') as HTMLElement;
    fireEvent.click(within(focusPanel).getByRole('button', { name: 'View order book' }));
    expect(onOpenSlice).toHaveBeenCalledWith({ product: 'BIO_METHANOL', port: 'Singapore', window: lastWindow });
  });

  it('keeps missing periods as gaps in the chart instead of connecting across them', async () => {
    const table = makeLongTable();
    const missingWindow = table.columns[2].availability_window;
    table.rows[0].cells[missingWindow] = baseCell('BIO_METHANOL', 'dp-singapore', 'Singapore', missingWindow, null);
    tableMock.mockResolvedValue(table);
    renderWithProviders(<ForwardCurveWorkspace />);
    await screen.findByText('Market Matrix');
    const chart = document.querySelector('[data-tour="forward-curve-chart"]') as HTMLElement;
    const graph = within(chart).getByRole('group', { name: /Singapore forward curve/ });
    expect(within(graph).getAllByRole('button')).toHaveLength(table.columns.length - 1);
    expect(graph.querySelectorAll('path')).toHaveLength(2);
  });

  it('shows exact quarter details on hover without selecting or fetching another slice', async () => {
    const table = makeLongTable();
    const lastWindow = table.columns.at(-1)!.availability_window;
    const sliceRequest = deferred<ForwardCurveSliceResponse>();
    Object.assign(table.rows[0].cells[lastWindow], {
      primary_value: '1246.75', best_bid: '1241.25', best_ask: '1252.25', spread: '11.00', volume_mt: '9531.5',
    });
    tableMock.mockResolvedValue(table);
    sliceMock.mockReturnValue(sliceRequest.promise);
    await act(async () => {
      renderWithProviders(<ForwardCurveWorkspace />);
    });
    expect(screen.getByText('Market Matrix')).toBeTruthy();
    const chart = document.querySelector('[data-tour="forward-curve-chart"]') as HTMLElement;
    const point = within(chart).getByRole('button', { name: new RegExp(formatAvailabilityWindow(lastWindow)) });
    const selected = localStorage.getItem('verdaxis_forward_curve_window');
    expect(sliceMock).toHaveBeenCalledTimes(1);
    fireEvent.mouseEnter(point);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.parentElement).toBe(document.body);
    expect(point.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(point.querySelector('title')).toBeNull();
    for (const text of [formatAvailabilityWindow(lastWindow), '$1,246.75', '$1,241.25', '$1,252.25', '$11.00', '9,531.5', 'Demo data', 'Demo orderbook midpoint']) {
      expect(within(tooltip).getByText(text)).toBeTruthy();
    }
    await act(async () => sliceRequest.resolve(makeSlice(singaporeSpot)));
    expect(screen.getByRole('tooltip')).toBe(tooltip);
    expect(localStorage.getItem('verdaxis_forward_curve_window')).toBe(selected);
    expect(sliceMock).toHaveBeenCalledTimes(1);
    expect(tableMock).toHaveBeenCalledTimes(1);

    fireEvent.mouseLeave(point);
    fireEvent.mouseEnter(tooltip);
    // The tooltip must remain available while the pointer is over its content.
    await new Promise(resolve => setTimeout(resolve, 180));
    expect(screen.getByRole('tooltip')).toBe(tooltip);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(point.hasAttribute('aria-describedby')).toBe(false);
    fireEvent.mouseEnter(point);
    fireEvent.mouseLeave(point);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('supports focus and clears point details when focus, viewport, or horizon changes', async () => {
    await act(async () => {
      renderWithProviders(<ForwardCurveWorkspace />);
    });
    expect(screen.getByText('5.0k MT available')).toBeTruthy();
    const chart = document.querySelector('[data-tour="forward-curve-chart"]') as HTMLElement;
    const point = within(chart).getByRole('button', { name: 'Spot $1015' });
    act(() => point.focus());
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.mouseLeave(point);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    act(() => point.blur());
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    fireEvent.mouseEnter(point);
    fireEvent.resize(window);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(point);
    fireEvent.scroll(window);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(point);
    fireEvent.click(within(chart).getByRole('button', { name: '1Y' }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('uses the plotted bid fallback and shows missing values separately from zero', async () => {
    const table = makeTable();
    table.rows[0].cells.SPOT = {
      ...table.rows[0].cells.SPOT,
      primary_value: null, best_bid: 980.25, best_ask: null, spread: null, volume_mt: 0,
    };
    tableMock.mockResolvedValue(table);
    await act(async () => {
      renderWithProviders(<ForwardCurveWorkspace />);
    });
    expect(screen.getByText('Curve mark')).toBeTruthy();
    const chart = document.querySelector('[data-tour="forward-curve-chart"]') as HTMLElement;
    fireEvent.mouseEnter(within(chart).getByRole('button', { name: 'Spot $980' }));
    const tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getAllByText('$980.25')).toHaveLength(2);
    expect(within(tooltip).getAllByText('Best bid')).toHaveLength(2);
    expect(within(tooltip).getAllByText('--')).toHaveLength(2);
    expect(within(tooltip).getByText('0')).toBeTruthy();
    expect(within(tooltip).queryByText('Demo orderbook midpoint')).toBeNull();
  });

  it('places details beside the point when a short viewport has no room above or below', async () => {
    await act(async () => {
      renderWithProviders(<ForwardCurveWorkspace />);
    });
    expect(screen.getByText('5.0k MT available')).toBeTruthy();
    const height = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true });
    const bounds = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return this.tagName.toLowerCase() === 'circle'
        ? new DOMRect(500, 240, 10, 10)
        : new DOMRect(0, 0, 288, 255);
    });
    try {
      const chart = document.querySelector('[data-tour="forward-curve-chart"]') as HTMLElement;
      fireEvent.mouseEnter(within(chart).getByRole('button', { name: 'Spot $1015' }));
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.style.left).toBe('522px');
      expect(tooltip.style.top).toBe('117.5px');
    } finally {
      bounds.mockRestore();
      Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
    }
  });

  it('keeps range controls usable when a shorter horizon has no priced points', async () => {
    const table = makeLongTable();
    const lastWindow = table.columns.at(-1)!.availability_window;
    for (const column of table.columns.slice(0, -1)) {
      table.rows[0].cells[column.availability_window] = baseCell(
        'BIO_METHANOL', 'dp-singapore', 'Singapore', column.availability_window, null,
      );
    }
    tableMock.mockResolvedValue(table);
    sliceMock.mockResolvedValue(makeSlice(table.rows[0].cells[lastWindow]));
    renderWithProviders(<ForwardCurveWorkspace />);
    await screen.findByText('Market Matrix');
    const chart = document.querySelector('[data-tour="forward-curve-chart"]') as HTMLElement;
    fireEvent.click(within(chart).getByRole('button', { name: '1Y' }));
    expect(within(chart).getByText(/No forward curve evidence/)).toBeTruthy();
    fireEvent.click(within(chart).getByRole('button', { name: 'All' }));
    expect(within(chart).getByRole('button', { name: new RegExp(formatAvailabilityWindow(lastWindow)) })).toBeTruthy();
  });

  it('refreshes the selected slice before the forced table read finishes', async () => {
    const intervalSpy = vi.spyOn(window, 'setInterval');
    renderWithProviders(<ForwardCurveWorkspace />);
    await screen.findByText('Curve mark');
    tableMock.mockClear();
    sliceMock.mockClear();
    let resolveJoinedTable!: (table: ForwardCurveTableResponse) => void;
    const joinedTable = new Promise<ForwardCurveTableResponse>((resolve) => {
      resolveJoinedTable = resolve;
    });
    tableMock.mockReturnValue(joinedTable);
    const refreshInterval = intervalSpy.mock.calls.filter(([, delay]) => delay === 30_000).at(-1)?.[0];
    expect(refreshInterval).toBeTypeOf('function');

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(sliceMock).toHaveBeenCalledWith({
      market_product: 'BIO_METHANOL',
      delivery_point_id: 'dp-singapore',
      availability_window: 'SPOT',
    }, { force: true });
    act(() => refreshInterval?.());
    await act(async () => resolveJoinedTable(makeTable()));

    expect(tableMock).toHaveBeenCalledWith(
      { windows: expect.any(Array) },
      { force: true },
    );
    expect(tableMock).toHaveBeenCalledWith({ windows: expect.any(Array) });
    await waitFor(() => expect(sliceMock).toHaveBeenCalledWith({
      market_product: 'BIO_METHANOL',
      delivery_point_id: 'dp-singapore',
      availability_window: 'SPOT',
    }, { force: true }));
    intervalSpy.mockRestore();
  });

  it('loads a canonical saved slice alongside the table without repeating it on table arrival', async () => {
    const cell = { ...singaporeSpot, delivery_point_id: '00000000-0000-0000-0000-000000000001' };
    const table = makeTable();
    table.rows[0] = { ...table.rows[0], delivery_point_id: cell.delivery_point_id, cells: { SPOT: cell } };
    storeSelection(cell);
    const pendingTable = deferred<ForwardCurveTableResponse>();
    tableMock.mockReturnValue(pendingTable.promise);
    sliceMock.mockResolvedValue(makeSlice(cell));

    renderWithProviders(<ForwardCurveWorkspace />);
    await waitFor(() => expect(sliceMock).toHaveBeenCalledTimes(1));
    expect(tableMock).toHaveBeenCalledTimes(1);
    expect(sliceMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Market Matrix')).toBeNull();
    await act(async () => pendingTable.resolve(table));
    await screen.findByText('Market Matrix');
    await screen.findByText('Curve mark');
    expect(sliceMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the polling deadline while selection changes and refreshes the current slice', async () => {
    vi.useFakeTimers();
    renderWithProviders(<ForwardCurveWorkspace />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByText('Curve mark')).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    const matrix = document.querySelector('[data-tour="forward-market-matrix"]') as HTMLElement;
    await act(async () => { fireEvent.click(within(matrix).getByText('$1250').closest('button')!); });
    tableMock.mockClear();
    sliceMock.mockClear();

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(tableMock).toHaveBeenCalledTimes(1);
    expect(sliceMock).toHaveBeenCalledExactlyOnceWith({
      market_product: 'E_METHANOL', delivery_point_id: 'dp-rotterdam', availability_window: '2026-Q3',
    });
  });

  it('recovers an absent saved market and ignores its late slice response', async () => {
    const absentCell = { ...rotterdamQuarter, delivery_point_id: '00000000-0000-0000-0000-000000000002', availability_window: 'SPOT' };
    storeSelection(absentCell);
    const staleSlice = deferred<ForwardCurveSliceResponse>();
    sliceMock.mockImplementation(({ delivery_point_id }) => delivery_point_id === absentCell.delivery_point_id
      ? staleSlice.promise : Promise.resolve(makeSlice(singaporeSpot)));

    renderWithProviders(<ForwardCurveWorkspace />);
    await screen.findByText('Curve mark');
    await waitFor(() => expect(sliceMock).toHaveBeenCalledTimes(2));
    expect(localStorage.getItem('verdaxis_forward_curve_delivery_point')).toBe('dp-singapore');
    await act(async () => staleSlice.resolve(makeSlice(absentCell)));
    expect(screen.queryByText('$1,215')).toBeNull();
    expect(screen.getAllByText('$980').length).toBeGreaterThan(0);
  });

  it('skips initial and periodic reads while hidden, resumes on visibility, and removes its listener', async () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const intervalSpy = vi.spyOn(window, 'setInterval');
    const { unmount } = renderWithProviders(<ForwardCurveWorkspace />);
    expect(tableMock).not.toHaveBeenCalled();
    expect(sliceMock).not.toHaveBeenCalled();
    act(() => intervalSpy.mock.calls.filter(([, delay]) => delay === 30_000).at(-1)?.[0]?.());
    expect(tableMock).not.toHaveBeenCalled();

    hidden.mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    await screen.findByText('Curve mark');
    tableMock.mockClear();
    sliceMock.mockClear();
    hidden.mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    act(() => intervalSpy.mock.calls.filter(([, delay]) => delay === 30_000).at(-1)?.[0]?.());
    expect(tableMock).not.toHaveBeenCalled();
    expect(sliceMock).not.toHaveBeenCalled();

    hidden.mockReturnValue(false);
    await act(async () => fireEvent(document, new Event('visibilitychange')));
    expect(tableMock).toHaveBeenCalledTimes(1);
    expect(sliceMock).toHaveBeenCalledTimes(1);
    unmount();
    fireEvent(document, new Event('visibilitychange'));
    expect(tableMock).toHaveBeenCalledTimes(1);
  });

  it('retries table and slice failures through manual refresh even while hidden', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const cell = { ...singaporeSpot, delivery_point_id: '00000000-0000-0000-0000-000000000001' };
    storeSelection(cell);
    tableMock.mockRejectedValueOnce(new Error('offline'));
    sliceMock.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<ForwardCurveWorkspace />);
    await waitFor(() => expect(console.error).toHaveBeenCalledTimes(2));
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    sliceMock.mockResolvedValue(makeSlice(cell));
    const table = makeTable();
    table.rows[0] = { ...table.rows[0], delivery_point_id: cell.delivery_point_id, cells: { SPOT: cell } };
    tableMock.mockResolvedValue(table);
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    await screen.findByText('Curve mark');
    expect(tableMock).toHaveBeenLastCalledWith({ windows: expect.any(Array) }, { force: true });
    expect(sliceMock).toHaveBeenLastCalledWith({
      market_product: cell.market_product,
      delivery_point_id: cell.delivery_point_id,
      availability_window: 'SPOT',
    }, { force: true });
    expect(sliceMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the last rapid selection when older slice responses finish later', async () => {
    renderWithProviders(<ForwardCurveWorkspace />);
    await screen.findByText('Curve mark');
    const pendingRotterdam = deferred<ForwardCurveSliceResponse>();
    const pendingSingapore = deferred<ForwardCurveSliceResponse>();
    sliceMock.mockImplementation(({ market_product }) => market_product === 'E_METHANOL'
      ? pendingRotterdam.promise : pendingSingapore.promise);
    const matrix = document.querySelector('[data-tour="forward-market-matrix"]') as HTMLElement;
    fireEvent.click(within(matrix).getByText('$1250').closest('button')!);
    fireEvent.click(within(matrix).getByText('$1015').closest('button')!);
    await act(async () => pendingSingapore.resolve(makeSlice(singaporeSpot)));
    await act(async () => pendingRotterdam.resolve(makeSlice(rotterdamQuarter)));
    expect(screen.getAllByText('$980').length).toBeGreaterThan(0);
    expect(screen.queryByText('$1,215')).toBeNull();
  });

  it('keeps slice navigation within the loaded market table', async () => {
    renderWithProviders(<ForwardCurveWorkspace />);
    await screen.findByText('5.0k MT available');
    sliceMock.mockClear();
    // This response points to a quarter missing from the selected market row.
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Next period' })); });
    expect(sliceMock).not.toHaveBeenCalled();
    expect(screen.getByText('No period selected')).toBeTruthy();
  });

  it('selects a populated product-port-period cell and opens that exact slice in Marketplace', async () => {
    const onNavigate = vi.fn();
    renderWithProviders(<ForwardCurveWorkspace onNavigate={onNavigate} />);

    await screen.findByText('Market Matrix');
    const rotterdamButton = screen.getByText('$1250').closest('button');
    expect(rotterdamButton).toBeTruthy();

    fireEvent.click(rotterdamButton as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getAllByText('e-Methanol · Rotterdam').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /open marketplace/i }));

    expect(onNavigate).toHaveBeenCalledWith('MARKETPLACE');
    expect(localStorage.getItem('verdaxis_marketplace_port')).toBe('Rotterdam');
    expect(localStorage.getItem('verdaxis_marketplace_delivery_point_id')).toBe('dp-rotterdam');
    expect(localStorage.getItem('verdaxis_marketplace_product')).toBe('E_METHANOL');
    expect(localStorage.getItem('verdaxis_marketplace_fuel')).toBeNull();
    expect(localStorage.getItem('verdaxis_marketplace_window')).toBe('2026-Q3');
  });

  it('opens the exact market slice from a matrix cell double-click', async () => {
    const onNavigate = vi.fn();
    renderWithProviders(<ForwardCurveWorkspace onNavigate={onNavigate} />);

    await screen.findByText('Market Matrix');
    const matrix = document.querySelector('[data-tour="forward-market-matrix"]') as HTMLElement;
    const rotterdamButton = within(matrix).getByText('$1250').closest('button');
    expect(rotterdamButton).toBeTruthy();

    fireEvent.doubleClick(rotterdamButton as HTMLButtonElement);

    expect(onNavigate).toHaveBeenCalledWith('MARKETPLACE');
    expect(localStorage.getItem('verdaxis_marketplace_port')).toBe('Rotterdam');
    expect(localStorage.getItem('verdaxis_marketplace_delivery_point_id')).toBe('dp-rotterdam');
    expect(localStorage.getItem('verdaxis_marketplace_product')).toBe('E_METHANOL');
    expect(localStorage.getItem('verdaxis_marketplace_fuel')).toBeNull();
    expect(localStorage.getItem('verdaxis_marketplace_window')).toBe('2026-Q3');
  });

  it('opens the exact market slice from a forward-curve period double-click', async () => {
    const onNavigate = vi.fn();
    renderWithProviders(<ForwardCurveWorkspace onNavigate={onNavigate} />);

    await screen.findByText('Latest Monitored Signals');
    const chartPoint = (await screen.findAllByRole('button', { name: /Spot \$1015/i }))[0];
    expect(chartPoint).toBeTruthy();

    fireEvent.doubleClick(chartPoint);

    expect(onNavigate).toHaveBeenCalledWith('MARKETPLACE');
    expect(localStorage.getItem('verdaxis_marketplace_port')).toBe('Singapore');
    expect(localStorage.getItem('verdaxis_marketplace_delivery_point_id')).toBe('dp-singapore');
    expect(localStorage.getItem('verdaxis_marketplace_product')).toBe('BIO_METHANOL');
    expect(localStorage.getItem('verdaxis_marketplace_fuel')).toBeNull();
    expect(localStorage.getItem('verdaxis_marketplace_window')).toBe('SPOT');
  });

  it('selects a forward-curve point from the keyboard without opening Marketplace', async () => {
    const onNavigate = vi.fn();
    renderWithProviders(<ForwardCurveWorkspace onNavigate={onNavigate} />);

    const chartPoint = (await screen.findAllByRole('button', { name: /Spot \$1015/i }))[0];

    fireEvent.keyDown(chartPoint, { key: 'Enter' });

    expect(onNavigate).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getAllByText('Bio Methanol · Singapore').length).toBeGreaterThan(0);
    });
  });

  it('labels market indications as monitored signals instead of live liquidity', async () => {
    tableMock.mockResolvedValue({
      ...makeTable(),
      rows: [
        {
          row_key: 'SYNTHETIC_ETHANOL:dp-santos',
          market_product: 'SYNTHETIC_ETHANOL',
          product_name: 'Synthetic Ethanol',
          representative_product_id: 'product-SYNTHETIC_ETHANOL',
          product_count: 1,
          delivery_point_id: 'dp-santos',
          delivery_point_name: 'Santos',
          region: 'South America',
          cells: { SPOT: santosIndication },
        },
      ],
      latest_signals: [
        {
          market_product: 'SYNTHETIC_ETHANOL',
          delivery_point_id: 'dp-santos',
          delivery_point_name: 'Santos',
          availability_window: 'SPOT',
          primary_value: '790',
          primary_signal_type: 'MARKET_INDICATION',
          primary_source_kind: 'MARKET_INDICATION',
          public_source_label: 'Sanitized market indication',
          demo_status: 'REAL_ONLY',
          observed_at: '2026-06-17T10:00:00Z',
          staleness_status: 'FRESH',
        },
      ],
    });
    sliceMock.mockResolvedValue({
      ...makeSlice(santosIndication),
      depth_bids: [],
      depth_asks: [],
      evidence_points: [
        {
          layer: 'MARKET_INDICATION',
          price_per_mt_usd: 790,
          quantity_mt: 4000,
          public_source_label: 'Sanitized market indication',
          source_kind: 'MARKET_INDICATION',
          demo_status: 'REAL_ONLY',
          observed_at: '2026-06-17T10:00:00Z',
        },
      ],
    });

    renderWithProviders(<ForwardCurveWorkspace />);

    await waitFor(() => {
      expect(screen.getAllByText('e-Ethanol · Santos').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Indication').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getAllByText('Sanitized market indication').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Live')).toBeNull();
  });

  it('distinguishes live orders, confirmed trades, and reference benchmarks in forward source badges', async () => {
    tableMock.mockResolvedValue({
      ...makeTable(),
      rows: [
        {
          row_key: 'BIO_METHANOL:dp-houston',
          market_product: 'BIO_METHANOL',
          delivery_point_id: 'dp-houston',
          delivery_point_name: 'Houston',
          region: 'North America',
          cells: { SPOT: houstonLiveOrder },
        },
        {
          row_key: 'E_METHANOL:dp-rotterdam',
          market_product: 'E_METHANOL',
          delivery_point_id: 'dp-rotterdam',
          delivery_point_name: 'Rotterdam',
          region: 'Europe',
          cells: { SPOT: rotterdamConfirmedTrade },
        },
        {
          row_key: 'BIO_ETHANOL:dp-dalian',
          market_product: 'BIO_ETHANOL',
          delivery_point_id: 'dp-dalian',
          delivery_point_name: 'Dalian',
          region: 'Asia',
          cells: { SPOT: dalianReference },
        },
      ],
      latest_signals: [
        {
          market_product: 'BIO_METHANOL',
          delivery_point_id: 'dp-houston',
          delivery_point_name: 'Houston',
          availability_window: 'SPOT',
          primary_value: '900',
          primary_signal_type: 'ORDERBOOK_BID',
          primary_source_kind: 'LIVE_ORDER',
          public_source_label: 'User order midpoint',
          demo_status: 'REAL_ONLY',
          observed_at: '2026-06-17T10:00:00Z',
          staleness_status: 'FRESH',
        },
        {
          market_product: 'E_METHANOL',
          delivery_point_id: 'dp-rotterdam',
          delivery_point_name: 'Rotterdam',
          availability_window: 'SPOT',
          primary_value: '1250',
          primary_signal_type: 'CONFIRMED_TRADE',
          primary_source_kind: 'CONFIRMED_TRADE',
          public_source_label: 'Confirmed trade print',
          demo_status: 'REAL_ONLY',
          observed_at: '2026-06-17T10:00:00Z',
          staleness_status: 'FRESH',
        },
        {
          market_product: 'BIO_ETHANOL',
          delivery_point_id: 'dp-dalian',
          delivery_point_name: 'Dalian',
          availability_window: 'SPOT',
          primary_value: '650',
          primary_signal_type: 'BENCHMARK_MID',
          primary_source_kind: 'BENCHMARK_REFERENCE',
          public_source_label: 'Benchmark reference',
          demo_status: 'NOT_APPLICABLE',
          observed_at: '2026-06-17T10:00:00Z',
          staleness_status: 'FRESH',
        },
      ],
    });

    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('Latest Monitored Signals');

    expect(screen.getAllByText('Live').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trade').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reference').length).toBeGreaterThan(0);
    expect(screen.queryByText('Unknown')).toBeNull();
    expect(screen.queryByText('Unverified signal')).toBeNull();
  });

  it.each(['CONVENTIONAL_METHANOL'])('filters %s out of forward rows and latest signals even on approved ports', async (unsupportedProduct) => {
    localStorage.setItem('verdaxis_forward_curve_product', unsupportedProduct);
    localStorage.setItem('verdaxis_forward_curve_delivery_point', 'dp-houston');
    localStorage.setItem('verdaxis_forward_curve_window', 'SPOT');
    const unsupportedCell = {
      ...baseCell('BIO_METHANOL', 'dp-houston', 'Houston', 'SPOT', '777'),
      market_product: unsupportedProduct as MarketProduct,
      product_name: unsupportedProduct,
      public_source_label: 'Unsupported product row',
    } as ForwardCurveMarketCell;

    tableMock.mockResolvedValue({
      ...makeTable(),
      rows: [
        {
          row_key: `${unsupportedProduct}:dp-houston`,
          market_product: unsupportedProduct as MarketProduct,
          delivery_point_id: 'dp-houston',
          delivery_point_name: 'Houston',
          region: 'North America',
          cells: { SPOT: unsupportedCell },
        },
        {
          row_key: 'BIO_METHANOL:dp-singapore',
          market_product: 'BIO_METHANOL',
          delivery_point_id: 'dp-singapore',
          delivery_point_name: 'Singapore',
          region: 'Asia',
          cells: { SPOT: singaporeSpot },
        },
      ],
      latest_signals: [
        {
          market_product: unsupportedProduct as MarketProduct,
          delivery_point_id: 'dp-houston',
          delivery_point_name: 'Houston',
          availability_window: 'SPOT',
          primary_value: '777',
          primary_signal_type: 'BENCHMARK_MID',
          primary_source_kind: 'BENCHMARK_REFERENCE',
          public_source_label: 'Unsupported product signal',
          demo_status: 'NOT_APPLICABLE',
          observed_at: '2026-06-17T10:00:00Z',
          staleness_status: 'FRESH',
        },
      ],
    });

    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('Market Matrix');

    expect(screen.queryByText('$777')).toBeNull();
    expect(screen.queryByText(/Unsupported product/i)).toBeNull();
    expect(screen.queryByText(unsupportedProduct)).toBeNull();
    expect(screen.queryByText('UCOME B100')).toBeNull();
    await waitFor(() => {
      expect(sliceMock).toHaveBeenCalledWith({
        market_product: 'BIO_METHANOL',
        delivery_point_id: 'dp-singapore',
        availability_window: 'SPOT',
      });
    });
    expect(sliceMock).not.toHaveBeenCalledWith(expect.objectContaining({ market_product: unsupportedProduct }));
  });

  it.each([null, 1110])('shows B100 in the shared curve with its real price or honest no-data state (%s)', async price => {
    const cell = {
      ...baseCell('UCOME_B100', 'dp-singapore', 'Singapore', 'SPOT', price),
      primary_source_kind: price == null ? 'NO_DATA' : 'LIVE_ORDER',
      primary_signal_type: price == null ? 'NO_DATA' : 'ORDERBOOK_ASK',
      demo_status: price == null ? 'UNKNOWN' : 'REAL_ONLY',
      public_source_label: price == null ? 'No data' : 'User order midpoint',
    } as ForwardCurveMarketCell;
    const table = makeTable();
    table.rows = [{ ...table.rows[0], row_key: 'UCOME_B100:dp-singapore', market_product: 'UCOME_B100', cells: { SPOT: cell } }];
    table.latest_signals = [];
    tableMock.mockResolvedValue(table);
    sliceMock.mockResolvedValue({ ...makeSlice(cell), depth_bids: [], depth_asks: [], evidence_points: [] });
    const onOpenSlice = vi.fn();
    renderWithProviders(<ForwardCurveWorkspace onOpenSlice={onOpenSlice} />);
    await waitFor(() => expect(sliceMock).toHaveBeenCalledWith({
      market_product: 'UCOME_B100', delivery_point_id: 'dp-singapore', availability_window: 'SPOT',
    }));
    expect(screen.getAllByText(/UCOME B100/).length).toBeGreaterThan(0);
    if (price == null) {
      expect(screen.getByText('No forward curve evidence is available for this product and port yet.')).toBeTruthy();
      expect(screen.queryByText('$1110')).toBeNull();
    } else {
      expect(screen.getAllByText('$1110').length).toBeGreaterThan(0);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Open Marketplace' }));
    expect(onOpenSlice).toHaveBeenCalledWith({ product: 'UCOME_B100', port: 'Singapore', window: 'SPOT' });
  });

  it('clears stale selected-period evidence while a newly selected slice is loading', async () => {
    let resolveRotterdam: ((value: ForwardCurveSliceResponse) => void) | null = null;
    sliceMock.mockImplementation(({ market_product, delivery_point_id, availability_window }) => {
      if (market_product === 'E_METHANOL') {
        return new Promise<ForwardCurveSliceResponse>((resolve) => {
          resolveRotterdam = resolve;
        });
      }
      const cell = [singaporeSpot, rotterdamQuarter, dalianEmpty].find(item => (
        item.market_product === market_product
        && item.delivery_point_id === delivery_point_id
        && item.availability_window === availability_window
      )) ?? singaporeSpot;
      return Promise.resolve(makeSlice(cell));
    });

    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('5.0k MT available', {}, { timeout: 5000 });
    expect(screen.getAllByText('$980').length).toBeGreaterThan(0);

    const matrix = document.querySelector('[data-tour="forward-market-matrix"]') as HTMLElement;
    const rotterdamButton = within(matrix).getByText('$1250').closest('button');
    expect(rotterdamButton).toBeTruthy();
    fireEvent.click(rotterdamButton as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.queryByText('$980')).toBeNull();
    });
    expect(screen.getByText('Refreshing latest print...')).toBeTruthy();
    expect(screen.queryByText('No confirmed prints in this selected period.')).toBeNull();

    await act(async () => {
      resolveRotterdam?.(makeSlice(rotterdamQuarter));
    });

    await waitFor(() => {
      expect(screen.getAllByText('$1,215').length).toBeGreaterThan(0);
    });
  });

  it('keeps a reference mark useful when the selected period has no quotes or prints', async () => {
    const table = makeTable();
    table.rows = [{
      row_key: 'BIO_ETHANOL:dp-dalian',
      market_product: 'BIO_ETHANOL',
      product_name: 'BIO_ETHANOL',
      representative_product_id: 'product-BIO_ETHANOL',
      product_count: 1,
      delivery_point_id: 'dp-dalian',
      delivery_point_name: 'Dalian',
      region: 'Asia',
      cells: { SPOT: dalianReference },
    }];
    table.columns = [table.columns[0]];
    tableMock.mockResolvedValue(table);
    sliceMock.mockResolvedValue({
      ...makeSlice(dalianReference),
      depth_bids: [],
      depth_asks: [],
      trades: [],
      evidence_points: [],
    });

    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('No bid is available for this period.');
    expect(screen.getAllByText('Benchmark reference').length).toBeGreaterThan(0);
    expect(screen.getByText('No bid is available for this period.')).toBeTruthy();
    expect(screen.getByText('No ask is available for this period.')).toBeTruthy();
    expect(screen.getByText('No confirmed prints in this selected period.')).toBeTruthy();
    expect(screen.queryByText('Spread')).toBeNull();
  });

  it('shows a specific empty state when no approved forward curve rows are available', async () => {
    tableMock.mockResolvedValue({
      ...makeTable(),
      rows: [],
      latest_signals: [],
    });

    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('No approved forward-curve markets are available yet. Check Marketplace for open spot and near-dated liquidity.');
    expect(sliceMock).not.toHaveBeenCalled();
  });

  it('hydrates compact API cells from their parent market row', async () => {
    const table = makeTable();
    const { market_product, delivery_point_id, delivery_point_name, availability_window, ...compactCell } =
      table.rows[0].cells.SPOT;
    table.rows[0].cells.SPOT = compactCell as ForwardCurveMarketCell;
    tableMock.mockResolvedValue(table);

    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('5.0k MT available');
    expect(sliceMock).toHaveBeenCalledWith({
      market_product,
      delivery_point_id,
      availability_window,
    });
    expect(screen.getAllByText(delivery_point_name).length).toBeGreaterThan(0);
  });

  it('formats selected-period quote values when backend decimals arrive as strings', async () => {
    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('5.0k MT available');

    expect(screen.getAllByText('$980').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$1,050').length).toBeGreaterThan(0);
    expect(screen.queryByText('$0')).toBeNull();
  });

  it('ignores stale stored filters and falls back to the first populated monitored cell', async () => {
    localStorage.setItem('verdaxis_forward_curve_product', 'Methanol');
    localStorage.setItem('verdaxis_forward_curve_delivery_point', 'Singapore');
    localStorage.setItem('verdaxis_forward_curve_window', 'Q1_2026');

    renderWithProviders(<ForwardCurveWorkspace />);

    await waitFor(() => {
      expect(sliceMock).toHaveBeenCalledWith({
        market_product: 'BIO_METHANOL',
        delivery_point_id: 'dp-singapore',
        availability_window: 'SPOT',
      });
    });
  });

  it('renders the monitored forward workflow in Chinese', async () => {
    await i18n.changeLanguage('zh');

    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('最新监控信号');
    expect(screen.getByText('市场矩阵')).toBeTruthy();
    expect(screen.getByRole('group', { name: '交付期限范围' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '全部' })).toBeTruthy();
    expect(await screen.findByText('可用数量 5.0k MT')).toBeTruthy();
    expect(screen.getByText('曲线标记')).toBeTruthy();
    expect(await screen.findByText('可用报价')).toBeTruthy();
    expect(screen.getAllByText('所选期限').length).toBeGreaterThan(0);
    expect(screen.getAllByText('现货').length).toBeGreaterThan(0);
    expect((await screen.findAllByText('演示订单簿中间价')).length).toBeGreaterThan(0);
    expect(screen.getByText('可用数量 5.0k MT')).toBeTruthy();
    expect(screen.getByText('可用数量 4.5k MT')).toBeTruthy();
    expect(screen.getByText('仅用于监控，不是可执行报价。')).toBeTruthy();
    expect(screen.queryByText('Latest Monitored Signals')).toBeNull();
    const chart = document.querySelector('[data-tour="forward-curve-chart"]') as HTMLElement;
    fireEvent.mouseEnter(within(chart).getByRole('button', { name: '现货 $1015' }));
    const tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('最高买价')).toBeTruthy();
    expect(within(tooltip).getByText('最低卖价')).toBeTruthy();
    expect(within(tooltip).getByText('订单总量（吨）')).toBeTruthy();
    expect(within(tooltip).getByText('演示订单簿中间价')).toBeTruthy();
  });
});
