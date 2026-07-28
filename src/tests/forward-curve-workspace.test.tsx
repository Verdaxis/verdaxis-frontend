import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';

import { ForwardCurveWorkspace } from '../components/ForwardCurveWorkspace';
import type { ForwardCurveMarketCell, ForwardCurveSliceResponse, ForwardCurveTableResponse, MarketProduct } from '../types';
import { renderWithProviders } from './test-utils';

const tableMock = vi.fn();
const sliceMock = vi.fn();

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

describe('ForwardCurveWorkspace', () => {
  beforeEach(() => {
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

  it('renders the forward curve above the matrix with selected-period range evidence', async () => {
    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('Latest Monitored Signals');
    const chart = document.querySelector('[data-tour="forward-curve-chart"]');
    const matrix = document.querySelector('[data-tour="forward-market-matrix"]');
    expect(chart).toBeTruthy();
    expect(matrix).toBeTruthy();
    expect(chart!.compareDocumentPosition(matrix!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Market Matrix')).toBeTruthy();
    expect(screen.getByText('Selected Period')).toBeTruthy();
    expect(screen.getAllByText('Bio Methanol · Singapore').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Demo').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('Indicative Period Range')).toBeTruthy();
    });

    expect(screen.queryByText('Indicative Forward Curve')).toBeNull();
    expect(screen.queryByText(/Expand period/i)).toBeNull();
    expect(screen.queryByText(/TradingView/i)).toBeNull();
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
      expect(screen.getAllByText('Synthetic Ethanol · Santos').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Indication').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getAllByText('Market indication').length).toBeGreaterThan(0);
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

  it('filters unsupported products out of forward rows and latest signals even on approved ports', async () => {
    const unsupportedCell = {
      ...baseCell('BIO_METHANOL', 'dp-houston', 'Houston', 'SPOT', '777'),
      market_product: 'CONVENTIONAL_METHANOL' as MarketProduct,
      product_name: 'Legacy conventional methanol',
      public_source_label: 'Unsupported product row',
    } as ForwardCurveMarketCell;

    tableMock.mockResolvedValue({
      ...makeTable(),
      rows: [
        {
          row_key: 'CONVENTIONAL_METHANOL:dp-houston',
          market_product: 'CONVENTIONAL_METHANOL' as MarketProduct,
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
          market_product: 'CONVENTIONAL_METHANOL' as MarketProduct,
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
    expect(screen.queryByText(/CONVENTIONAL_METHANOL/i)).toBeNull();
    await waitFor(() => {
      expect(sliceMock).toHaveBeenCalledWith({
        market_product: 'BIO_METHANOL',
        delivery_point_id: 'dp-singapore',
        availability_window: 'SPOT',
      });
    });
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

    await screen.findByText('Indicative Period Range');
    expect(screen.getAllByText('$980').length).toBeGreaterThan(0);

    const matrix = document.querySelector('[data-tour="forward-market-matrix"]') as HTMLElement;
    const rotterdamButton = within(matrix).getByText('$1250').closest('button');
    expect(rotterdamButton).toBeTruthy();
    fireEvent.click(rotterdamButton as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.queryByText('$980')).toBeNull();
    });

    await act(async () => {
      resolveRotterdam?.(makeSlice(rotterdamQuarter));
    });

    await waitFor(() => {
      expect(screen.getAllByText('$1215').length).toBeGreaterThan(0);
    });
  });

  it('shows distinct empty states when a selected period has no evidence, depth, or prints', async () => {
    sliceMock.mockResolvedValue({
      ...makeSlice(singaporeSpot),
      depth_bids: [],
      depth_asks: [],
      trades: [],
      evidence_points: [],
    });

    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('No price evidence for this exact period yet.');
    expect(screen.getByText('No visible bid levels in this selected period.')).toBeTruthy();
    expect(screen.getByText('No visible ask levels in this selected period.')).toBeTruthy();
    expect(screen.getByText('No confirmed prints in this selected period.')).toBeTruthy();
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

    await screen.findByText('Indicative Period Range');
    expect(sliceMock).toHaveBeenCalledWith({
      market_product,
      delivery_point_id,
      availability_window,
    });
    expect(screen.getAllByText(delivery_point_name).length).toBeGreaterThan(0);
  });

  it('scales selected-period evidence when backend decimals arrive as strings', async () => {
    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('Indicative Period Range');

    expect(screen.getAllByText('$980').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$1050').length).toBeGreaterThan(0);
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
});
