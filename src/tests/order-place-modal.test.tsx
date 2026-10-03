import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './test-utils';
import { OrderPlaceModal } from '../components/OrderPlaceModal';
import i18n, { loadNamespace } from '../i18n';
import { getAvailabilityWindowOptions } from '../utils/availabilityWindow';
import type { AvailabilityWindow } from '../types';
import { clearAccessToken, setAccessToken } from '../services/authToken';
import { clearMarketSupportContextId, setMarketSupportContextId } from '../services/marketSupportContextStore';

const productsMock = vi.fn();
const deliveryPointsMock = vi.fn();
const createOrderMock = vi.fn();
const { TestApiOutcomeUnknownError } = vi.hoisted(() => ({
  TestApiOutcomeUnknownError: class extends Error {},
}));
const marketSupportControl = vi.hoisted(() => ({
  current: {
    context: null as any,
    isActive: false,
    isLoading: false,
  },
}));

function reviewAndConfirm(side: 'Bid' | 'Ask') {
  fireEvent.click(screen.getByRole('button', { name: `Review ${side}` }));
  fireEvent.click(screen.getByRole('button', { name: `Confirm and place ${side}` }));
}

vi.mock('../services/api', () => ({
  ApiOutcomeUnknownError: TestApiOutcomeUnknownError,
  api: {
    catalog: {
      products: (...args: unknown[]) => productsMock(...args),
      deliveryPoints: (...args: unknown[]) => deliveryPointsMock(...args),
    },
    orderbook: {
      create: (...args: unknown[]) => createOrderMock(...args),
    },
  },
}));

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => marketSupportControl.current,
}));

describe('OrderPlaceModal', () => {
  beforeEach(async () => {
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
    productsMock.mockReset();
    deliveryPointsMock.mockReset();
    createOrderMock.mockReset();
    clearAccessToken();
    sessionStorage.clear();

    productsMock.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Green Methanol',
        market_product: 'BIO_METHANOL',
        fuel_type: 'Methanol',
        fuel_grade: 'Green',
        unit: 'MT',
        min_lot_size: 500,
        is_active: true,
        spec_description: 'Test product',
      },
      {
        id: 'prod-b30',
        name: 'B30',
        market_product: 'B30',
        fuel_type: 'Biodiesel',
        fuel_grade: 'B30',
        unit: 'MT',
        min_lot_size: 200,
        is_active: true,
      },
      {
        id: 'prod-b100',
        name: 'B100',
        market_product: 'B100',
        fuel_type: 'Biodiesel',
        fuel_grade: 'B100',
        unit: 'MT',
        min_lot_size: 200,
        is_active: true,
      },
    ]);
    deliveryPointsMock.mockResolvedValue([
      {
        id: 'dp-1',
        name: 'Singapore',
        region: 'Asia',
        timezone: 'Asia/Singapore',
        is_active: true,
      },
    ]);
    createOrderMock.mockResolvedValue({ trades: [] });
    marketSupportControl.current = { context: null, isActive: false, isLoading: false };
  });

  it('enforces the order API caps and two-decimal precision before submission', async () => {
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());

    const quantity = screen.getByRole('spinbutton', { name: /quantity/i });
    const price = screen.getByRole('spinbutton', { name: /^price/i });
    const submit = screen.getByRole('button', { name: 'Review Bid' });
    expect(quantity.getAttribute('max')).toBe('100000');
    expect(quantity.getAttribute('step')).toBe('0.01');
    expect(price.getAttribute('max')).toBe('1000000');

    fireEvent.change(quantity, { target: { value: '1000.25' } });
    fireEvent.change(price, { target: { value: '700.25' } });
    expect(submit).toHaveProperty('disabled', false);

    fireEvent.change(quantity, { target: { value: '100000.01' } });
    expect(submit).toHaveProperty('disabled', true);
    fireEvent.change(quantity, { target: { value: '1000.001' } });
    expect(submit).toHaveProperty('disabled', true);
    fireEvent.change(quantity, { target: { value: '1000.25' } });
    fireEvent.change(price, { target: { value: '1000000.01' } });
    expect(submit).toHaveProperty('disabled', true);
    fireEvent.change(price, { target: { value: '700.001' } });
    expect(submit).toHaveProperty('disabled', true);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('enforces the catalog minimum and a future UTC expiry before review', async () => {
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());

    const quantity = screen.getByRole('spinbutton', { name: /quantity/i });
    const price = screen.getByRole('spinbutton', { name: /^price/i });
    const review = screen.getByRole('button', { name: 'Review Bid' }) as HTMLButtonElement;
    fireEvent.change(price, { target: { value: '700' } });
    fireEvent.change(quantity, { target: { value: '499.99' } });

    expect(review.disabled).toBe(true);
    expect(screen.getByText(/catalog minimum of 500 MT/i)).toBeTruthy();

    fireEvent.change(quantity, { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Good-till-Date (UTC)' }));
    expect(review.disabled).toBe(true);
    expect(screen.getByText(/select an expiry date in UTC/i)).toBeTruthy();

    fireEvent.change(document.getElementById('order-expiry-date')!, { target: { value: '2000-01-01' } });
    expect(review.disabled).toBe(true);
    expect(screen.getByText(/select a future expiry date in UTC/i)).toBeTruthy();

    fireEvent.change(document.getElementById('order-expiry-date')!, { target: { value: '2099-12-31' } });
    expect(review.disabled).toBe(false);
    fireEvent.click(review);

    expect(screen.getByRole('heading', { name: 'Review Bid' })).toBeTruthy();
    expect(screen.getByText('500 MT')).toBeTruthy();
    expect(screen.getByText('USD 700.00/MT')).toBeTruthy();
    expect(screen.getByText('USD 350,000.00')).toBeTruthy();
    expect(screen.getByText('Any certified scheme')).toBeTruthy();
    expect(screen.getByText(/Dec 31, 2099.*UTC/)).toBeTruthy();
    expect(screen.getByText(/can auto-match at once/i)).toBeTruthy();
    expect(createOrderMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm and place Bid' }));
    await waitFor(() => expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({
      quantity_mt: 500,
      price_per_mt_usd: 700,
      expires_at: '2099-12-31T23:59:59.000Z',
    })));
  });

  it('fails closed when required catalog execution metadata is invalid or missing', async () => {
    productsMock.mockResolvedValue([{
      id: 'bad-product', name: 'Bad product', market_product: 'BIO_METHANOL', fuel_type: 'Methanol',
      fuel_grade: 'Bio', unit: 'MT', min_lot_size: 0, is_active: true,
    }]);
    const firstView = renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByRole('spinbutton', { name: /^price/i }), { target: { value: '700' } });
    expect(screen.getByRole('button', { name: 'Review Bid' })).toHaveProperty('disabled', true);
    expect(screen.getAllByText(/catalog minimum unavailable/i).length).toBeGreaterThan(0);
    firstView.unmount();

    productsMock.mockResolvedValue([{
      id: 'prod-1', name: 'Green Methanol', market_product: 'BIO_METHANOL', fuel_type: 'Methanol',
      fuel_grade: 'Green', unit: 'MT', min_lot_size: 500, is_active: true,
    }]);
    deliveryPointsMock.mockResolvedValue([]);
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(deliveryPointsMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Review Bid' })).toHaveProperty('disabled', true);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('lets the user edit a review and freezes the final request against double confirmation', async () => {
    let resolveRequest!: (value: { trades: never[] }) => void;
    createOrderMock.mockReturnValue(new Promise(resolve => { resolveRequest = resolve; }));
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('spinbutton', { name: /^price/i }), { target: { value: '540.25' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /quantity/i }), { target: { value: '750.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review Bid' }));
    expect(screen.getByText('750.5 MT')).toBeTruthy();
    expect(screen.getByText('USD 540.25/MT')).toBeTruthy();
    expect(screen.getByText('Good till cancelled (up to 90 days)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Edit order' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Order product' })));
    fireEvent.change(screen.getByRole('spinbutton', { name: /^price/i }), { target: { value: '541.25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review Bid' }));
    expect(screen.getByText('USD 541.25/MT')).toBeTruthy();

    const confirm = screen.getByRole('button', { name: 'Confirm and place Bid' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));
    expect(createOrderMock.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      product_id: 'prod-1',
      delivery_point_id: 'dp-1',
      quantity_mt: 750.5,
      price_per_mt_usd: 541.25,
      idempotency_key: expect.any(String),
    }));

    resolveRequest({ trades: [] });
    await screen.findByRole('button', { name: 'Close' });
  });

  it('cancels an open review when its prefilled market input changes', async () => {
    const view = renderWithProviders(
      <OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillPrice={540} />
    );
    await waitFor(() => expect(productsMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Review Bid' }));
    expect(screen.getByRole('button', { name: 'Confirm and place Bid' })).toBeTruthy();

    view.rerender(
      <OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillPrice={650} />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Review Bid' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Confirm and place Bid' })).toBeNull();
    expect((screen.getByRole('spinbutton', { name: /^price/i }) as HTMLInputElement).value).toBe('650');
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('does not replace an unresolved explicit market prefill with another slice', async () => {
    const firstView = renderWithProviders(
      <OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillMarketProduct="SYNTHETIC_ETHANOL" prefillPrice={540} />
    );
    await waitFor(() => expect(productsMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Review Bid' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('combobox', { name: 'Order product' }).textContent).not.toContain('Bio Methanol');
    firstView.unmount();

    renderWithProviders(
      <OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillMarketProduct="BIO_METHANOL" prefillDeliveryPointId="missing-port" prefillPrice={540} />
    );
    await waitFor(() => expect(productsMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Review Bid' })).toHaveProperty('disabled', true);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('returns to the form when the signed-in principal changes during review', async () => {
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillPrice={540} />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Review Bid' }));

    setAccessToken('replacement-session');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and place Bid' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Your signed-in account changed. Review the order again.');
    expect(screen.getByRole('button', { name: 'Review Bid' })).toBeTruthy();
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('revalidates a dated expiry at final confirmation', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2099-12-30T12:00:00Z'));
    try {
      renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillPrice={540} />);
      await waitFor(() => expect(productsMock).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Good-till-Date (UTC)' }));
      fireEvent.change(document.getElementById('order-expiry-date')!, { target: { value: '2099-12-31' } });
      fireEvent.click(screen.getByRole('button', { name: 'Review Bid' }));

      now.mockReturnValue(Date.parse('2100-01-01T00:00:00Z'));
      fireEvent.click(screen.getByRole('button', { name: 'Confirm and place Bid' }));

      expect((await screen.findByRole('alert')).textContent).toBe('Select a future expiry date in UTC.');
      expect(createOrderMock).not.toHaveBeenCalled();
    } finally {
      now.mockRestore();
    }
  });

  it('does not submit an assisted draft after the stored support context changes', async () => {
    marketSupportControl.current = {
      isActive: true,
      isLoading: false,
      context: {
        id: 'ctx-1', organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
        actor: { id: 'admin-1', name: 'Ravi Admin', email: 'ravi@verdaxis.exchange' },
        supportReference: 'CASE-42', expiresAt: '2099-12-31T23:59:59Z', scope: ['ORDER_CREATE'],
      },
    };
    setMarketSupportContextId('ctx-1');
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillPrice={540} />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));

    setMarketSupportContextId('ctx-2');
    fireEvent.click(screen.getByRole('button', { name: /confirm and submit bid/i }));

    expect((await screen.findByRole('alert')).textContent).toBe('The assisted trading context changed. Review the order again.');
    expect(createOrderMock).not.toHaveBeenCalled();
  });


  it('keeps an assisted submission locked while its expired context catalog refreshes', async () => {
    let rejectRequest!: (reason: Error) => void;
    createOrderMock.mockReturnValue(new Promise((_resolve, reject) => { rejectRequest = reject; }));
    marketSupportControl.current = {
      isActive: true,
      isLoading: false,
      context: {
        id: 'ctx-1', organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
        actor: { id: 'admin-1', name: 'Ravi Admin', email: 'ravi@verdaxis.exchange' },
        supportReference: 'CASE-42', expiresAt: '2099-12-31T23:59:59Z', scope: ['ORDER_CREATE'],
      },
    };
    setMarketSupportContextId('ctx-1');
    const view = renderWithProviders(
      <OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillPrice={540} />
    );
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm and submit bid/i }));
    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('dialog')));

    productsMock.mockResolvedValue([{
      id: 'replacement-product',
      name: 'Replacement Methanol',
      market_product: 'E_METHANOL',
      fuel_type: 'Methanol',
      fuel_grade: 'Bio',
      unit: 'MT',
      min_lot_size: 500,
      is_active: true,
    }]);
    clearMarketSupportContextId();
    marketSupportControl.current = { context: null, isActive: false, isLoading: false };
    view.rerender(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillPrice={540} />);

    await waitFor(() => expect(productsMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Order product' }).textContent)
      .toContain('e-Methanol'));
    expect(screen.getByRole('button', { name: 'Close' })).toHaveProperty('disabled', true);
    expect(createOrderMock).toHaveBeenCalledTimes(1);

    rejectRequest(new TestApiOutcomeUnknownError('Request timed out. Please try again.'));
    await waitFor(() => expect(screen.getByRole('button', { name: /retry safely/i })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /retry safely/i }));

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Order product' }).textContent)
      .toContain('e-Methanol'));
    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });

  it('keeps a settled result when support context expiry races request completion', async () => {
    let resolveRequest!: (value: { trades: never[] }) => void;
    createOrderMock.mockReturnValue(new Promise(resolve => { resolveRequest = resolve; }));
    marketSupportControl.current = {
      isActive: true,
      isLoading: false,
      context: {
        id: 'ctx-1', organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
        actor: { id: 'admin-1', name: 'Ravi Admin', email: 'ravi@verdaxis.exchange' },
        supportReference: 'CASE-42', expiresAt: '2099-12-31T23:59:59Z', scope: ['ORDER_CREATE'],
      },
    };
    setMarketSupportContextId('ctx-1');
    renderWithProviders(
      <OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillPrice={540} />
    );
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm and submit bid/i }));
    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));

    clearMarketSupportContextId();
    marketSupportControl.current = { context: null, isActive: false, isLoading: false };
    await act(async () => {
      resolveRequest({ trades: [] });
    });

    expect(await screen.findByRole('button', { name: 'Close' })).toHaveProperty('disabled', false);
    expect(screen.queryByRole('button', { name: 'Review Bid' })).toBeNull();
    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });

  it('resets to the new canonical slice when reopened', async () => {
    const spotWindow: AvailabilityWindow = 'Spot';
    const prefillWindow = getAvailabilityWindowOptions({ timeZone: 'Europe/Amsterdam' })
      .find((option) => option.kind === 'quarter')?.value ?? 'SPOT';
    const prefillAvailabilityWindow = prefillWindow as AvailabilityWindow;

    productsMock.mockResolvedValue([
      {
        id: 'prod-bio',
        name: 'Bio Methanol',
        market_product: 'BIO_METHANOL',
        fuel_type: 'Methanol',
        fuel_grade: 'Bio',
        unit: 'MT',
        min_lot_size: 500,
        is_active: true,
        spec_description: 'Bio product',
      },
      {
        id: 'prod-e',
        name: 'e-Methanol',
        market_product: 'E_METHANOL',
        fuel_type: 'Methanol',
        fuel_grade: 'E',
        unit: 'MT',
        min_lot_size: 500,
        is_active: true,
        spec_description: 'E product',
      },
    ]);
    deliveryPointsMock.mockResolvedValue([
      {
        id: 'dp-singapore',
        name: 'Singapore',
        region: 'Asia',
        timezone: 'Asia/Singapore',
        is_active: true,
      },
      {
        id: 'dp-rotterdam',
        name: 'Rotterdam',
        region: 'Europe',
        timezone: 'Europe/Amsterdam',
        is_active: true,
      },
    ]);

    const { rerender } = renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="ASK"
        prefillMarketProduct="BIO_METHANOL"
        prefillDeliveryPointId="dp-singapore"
        prefillAvailabilityWindow={spotWindow}
      />
    );

    await waitFor(() => expect(productsMock).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Order product' }).textContent).toContain('Bio Methanol');
    });

    rerender(
      <OrderPlaceModal
        isOpen={false}
        onClose={() => undefined}
        side="ASK"
        prefillMarketProduct="BIO_METHANOL"
        prefillDeliveryPointId="dp-singapore"
        prefillAvailabilityWindow={spotWindow}
      />
    );

    rerender(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="ASK"
        prefillMarketProduct="E_METHANOL"
        prefillDeliveryPointId="dp-rotterdam"
        prefillAvailabilityWindow={prefillAvailabilityWindow}
      />
    );

    await waitFor(() => expect(productsMock).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Order product' }).textContent).toContain('e-Methanol');
    });

    expect(screen.getByPlaceholderText('e.g. IMPCA')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '575' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /certification declaration/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. IMPCA'), {
      target: { value: 'IMPCA' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 40'), {
      target: { value: '38.4' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Waste residue'), {
      target: { value: 'Biogenic CO2 + green hydrogen' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Singapore hub'), {
      target: { value: 'Netherlands' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /MSDS available/i }));
    reviewAndConfirm('Ask');

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: 'prod-e',
          delivery_point_id: 'dp-rotterdam',
          availability_window: prefillWindow,
        })
      );
    });
  });

  it('opens ask metadata by default for supplier orders', async () => {
    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="ASK"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    expect(screen.getByPlaceholderText('e.g. IMPCA')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. 40')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Waste residue')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Singapore hub')).toBeTruthy();
  });

  it('submits anonymous orders without exposing an anonymity toggle', async () => {
    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="BID"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    }, { timeout: 10000 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review Bid' })).toBeTruthy(), { timeout: 10000 });

    fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));

    expect(screen.queryByText('Anonymous Order')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /anonymous order/i })).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '540' },
    });

    reviewAndConfirm('Bid');

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          side: 'BID',
          product_id: 'prod-1',
          delivery_point_id: 'dp-1',
          quantity_mt: 1000,
          price_per_mt_usd: 540,
          availability_window: 'SPOT',
          is_anonymous: true,
        })
      );
    }, { timeout: 10000 });

    const payload = createOrderMock.mock.calls[0]?.[0];
    expect(payload?.certification_scheme).toBeUndefined();
  }, 15000);

  it('submits buyer certification preferences as explicit checkbox selections', async () => {
    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="BID"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'ISCC EU' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'REDcert EU' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '542' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Review Bid' }));
    expect(screen.getByText('ISCC EU, REDcert EU')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and place Bid' }));

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          side: 'BID',
          certifications: ['ISCC EU', 'REDcert EU'],
          is_anonymous: true,
        })
      );
    });

    const payload = createOrderMock.mock.calls[0]?.[0];
    expect(payload?.certification_scheme).toBeUndefined();
  });

  it('requires supplier certification declaration for ask orders', async () => {
    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="ASK"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    expect(screen.getByPlaceholderText('e.g. IMPCA')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '555' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /certification declaration/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. IMPCA'), {
      target: { value: 'IMPCA' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 40'), {
      target: { value: '42.5' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Waste residue'), {
      target: { value: 'Waste residue' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Singapore hub'), {
      target: { value: 'Singapore hub' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /MSDS available/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Review Ask' }));
    expect(screen.getByText('IMPCA')).toBeTruthy();
    expect(screen.getByText('42.5 gCO₂e/MJ')).toBeTruthy();
    expect(screen.getAllByText('Confirmed').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Waste residue')).toBeTruthy();
    expect(screen.getByText('Singapore hub')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and place Ask' }));

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          side: 'ASK',
          product_id: 'prod-1',
          delivery_point_id: 'dp-1',
          quantity_mt: 1000,
          price_per_mt_usd: 555,
          availability_window: 'SPOT',
          certification_declared: true,
          certifications: ['ISCC EU'],
          specification_standard: 'IMPCA',
          msds_available: true,
          carbon_intensity_gco2_mj: 42.5,
          feedstock: 'Waste residue',
          origin: 'Singapore hub',
          is_anonymous: true,
        })
      );
    });
  });

  it.each([
    { product: 'B30', standard: 'ISO 8217:2024 RF 380', ci: 74.2, assisted: false },
    { product: 'B100', standard: 'ISO 8217:2024 DFA', ci: 22.5, assisted: false },
    { product: 'B30', standard: 'ISO 8217:2024 RF 380', ci: 74.2, assisted: true },
  ] as const)('requires a CI basis for the fixed $product ASK (assisted: $assisted)', async ({ product, standard, ci, assisted }) => {
    if (assisted) {
      marketSupportControl.current = {
        isActive: true,
        isLoading: false,
        context: { id: 'ctx-1', organization: { name: 'Northstar Fuels' }, supportReference: 'CASE-42' },
      };
      setMarketSupportContextId('ctx-1');
    }
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="ASK" prefillMarketProduct={product} prefillQuantity={375} prefillPrice={700} />);
    const specification = await screen.findByDisplayValue(standard);
    expect((specification as HTMLInputElement).readOnly).toBe(true);
    expect(screen.getByText(i18n.t(`${product.toLowerCase()}.contract`, { ns: 'trading' }))).toBeTruthy();
    expect(screen.getByText(/Certificate of Quality.*batch Proof of Sustainability.*before delivery/)).toBeTruthy();
    expect(screen.getByText(/safety data sheet.*finished B(30|100)/)).toBeTruthy();

    expect((screen.getByLabelText(/price.*MT/i) as HTMLInputElement).value).toBe('700');
    expect((document.getElementById('order-quantity') as HTMLInputElement).value).toBe('375');
    fireEvent.click(screen.getByRole('checkbox', { name: /certification declaration/i }));
    fireEvent.change(screen.getByLabelText(/carbon intensity.*gCO2e/i), { target: { value: String(ci) } });
    fireEvent.change(screen.getByLabelText('Feedstock'), { target: { value: 'Used cooking oil' } });
    fireEvent.change(screen.getByLabelText('Origin'), { target: { value: 'Singapore' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /MSDS available/i }));
    const submit = screen.getByRole('button', { name: assisted ? 'Place Ask' : 'Review Ask' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Carbon intensity method / basis'), { target: { value: '  ' } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Carbon intensity method / basis'), { target: { value: '  RED lifecycle calculation, well-to-wake, whole blend  ' } });
    fireEvent.click(submit);
    if (assisted) {
      expect(createOrderMock).not.toHaveBeenCalled();
      expect(screen.getByText(/74.2 gCO₂e\/MJ · RED lifecycle calculation, well-to-wake, whole blend/)).toBeTruthy();
      expect(screen.getByText(/B30 · 30% FAME.*70% VLSFO/)).toBeTruthy();
      fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm and submit ask/i }));
    } else {
      expect(screen.getByText('RED lifecycle calculation, well-to-wake, whole blend')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Confirm and place Ask' }));
    }

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({
      side: 'ASK',
      product_id: `prod-${product.toLowerCase()}`,
      quantity_mt: 375,
      price_per_mt_usd: 700,
      specification_standard: standard,
      carbon_intensity_gco2_mj: ci,
      carbon_intensity_method: 'RED lifecycle calculation, well-to-wake, whole blend',
      certification_declared: true,
      certifications: ['ISCC EU'],
      msds_available: true,
      feedstock: 'Used cooking oil',
      origin: 'Singapore',
    })));
  });

  it('clears incompatible supplier metadata when changing between alcohol, B30, and B100', async () => {
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="ASK" />);
    await screen.findByRole('combobox', { name: 'Order product' });
    fireEvent.change(screen.getByLabelText('Specification Standard'), { target: { value: 'IMPCA' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 40'), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText('Feedstock'), { target: { value: 'Biogenic CO2' } });
    fireEvent.change(screen.getByLabelText('Origin'), { target: { value: 'Netherlands' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /certification declaration/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /MSDS available/i }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Order product' }));
    fireEvent.click(screen.getByRole('option', { name: /^B30/ }));

    expect((screen.getByLabelText('Specification Standard') as HTMLInputElement).value).toBe('ISO 8217:2024 RF 380');
    expect((screen.getByLabelText(/whole-blend carbon intensity/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Feedstock') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Origin') as HTMLInputElement).value).toBe('');
    expect((screen.getByRole('checkbox', { name: /certification declaration/i }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('checkbox', { name: /MSDS available/i }) as HTMLInputElement).checked).toBe(false);
    fireEvent.change(screen.getByLabelText(/whole-blend carbon intensity/i), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText('Carbon intensity method / basis'), { target: { value: 'Whole-blend method' } });
    fireEvent.click(screen.getByRole('combobox', { name: 'Order product' }));
    fireEvent.click(screen.getByRole('option', { name: /^B100/ }));
    expect((screen.getByLabelText('Specification Standard') as HTMLInputElement).value).toBe('ISO 8217:2024 DFA');
    expect((screen.getByLabelText(/fuel carbon intensity/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Carbon intensity method / basis') as HTMLInputElement).value).toBe('');
    fireEvent.change(screen.getByLabelText(/fuel carbon intensity/i), { target: { value: '22' } });
    fireEvent.change(screen.getByLabelText('Carbon intensity method / basis'), { target: { value: 'FAME lifecycle method' } });
    fireEvent.click(screen.getByRole('combobox', { name: 'Order product' }));
    fireEvent.click(screen.getByRole('option', { name: /^Bio Methanol/ }));

    const alcoholSpecification = screen.getByLabelText('Specification Standard') as HTMLInputElement;
    expect(alcoholSpecification.value).toBe('');
    expect(alcoholSpecification.readOnly).toBe(false);
    expect((screen.getByPlaceholderText('e.g. 40') as HTMLInputElement).value).toBe('');
    expect(screen.queryByLabelText('Carbon intensity method / basis')).toBeNull();
    fireEvent.click(screen.getByRole('combobox', { name: 'Order product' }));
    fireEvent.click(screen.getByRole('option', { name: /^B30/ }));
    expect((screen.getByLabelText('Carbon intensity method / basis') as HTMLInputElement).value).toBe('');
  });

  it.each([['B30', 'en'], ['B30', 'zh'], ['B100', 'en'], ['B100', 'zh']] as const)('shows the fixed %s contract on a basic %s BID without supplier fields', async (product, language) => {
    await i18n.changeLanguage(language);
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillMarketProduct={product} />);
    const contract = i18n.t(`${product.toLowerCase()}.contract`, { ns: 'trading' });
    expect(await screen.findByText(contract)).toBeTruthy();
    expect(screen.queryByLabelText('Carbon intensity method / basis')).toBeNull();
    fireEvent.change(document.getElementById('order-price')!, { target: { value: '700' } });
    fireEvent.click(screen.getByRole('button', { name: language === 'zh' ? '核对买单' : 'Review Bid' }));
    fireEvent.click(screen.getByRole('button', { name: language === 'zh' ? '确认并发布买单' : 'Confirm and place Bid' }));
    await waitFor(() => expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({ side: 'BID', product_id: `prod-${product.toLowerCase()}` })));
    const payload = createOrderMock.mock.calls[0][0];
    expect(payload.specification_standard).toBeUndefined();
    expect(payload.carbon_intensity_gco2_mj).toBeUndefined();
    expect(payload.carbon_intensity_method).toBeUndefined();
  });

  it('closes on cancel without submitting the form', async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={onClose}
        side="ASK"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('does not bind Escape before the trading namespace is ready', async () => {
    i18n.removeResourceBundle('en', 'trading');
    const onClose = vi.fn();
    renderWithProviders(<OrderPlaceModal isOpen onClose={onClose} side="BID" />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    // The focus effect also installs Escape; a rendered dialog alone is not ready.
    await waitFor(() => expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('leaves keyboard focus trapping to assisted confirmation', async () => {
    marketSupportControl.current = {
      isActive: true,
      isLoading: false,
      context: {
        id: 'ctx-1',
        organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
        actor: { id: 'admin-1', name: 'Ravi Admin', email: 'ravi@verdaxis.exchange' },
        supportReference: 'CASE-42',
        expiresAt: '2026-07-23T18:00:00.000Z',
        scope: ['ORDER_CREATE', 'ORDER_CANCEL'],
      },
    };
    setMarketSupportContextId('ctx-1');
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '525' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));

    const externalReference = await screen.findByLabelText(/external instruction reference/i);
    const backButton = screen.getByRole('button', { name: /back/i });
    backButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(document.activeElement).toBe(externalReference);
  });

  it('requires final support confirmation before submitting an assisted ASK', async () => {
    marketSupportControl.current = {
      isActive: true,
      isLoading: false,
      context: {
        id: 'ctx-1',
        organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
        actor: { id: 'admin-1', name: 'Ravi Admin', email: 'ravi@verdaxis.exchange' },
        supportReference: 'CASE-42',
        expiresAt: '2026-07-23T18:00:00.000Z',
        scope: ['ORDER_CREATE', 'ORDER_CANCEL'],
      },
    };
    setMarketSupportContextId('ctx-1');
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="ASK" />);

    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '555' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /certification declaration/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. IMPCA'), { target: { value: 'IMPCA' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 40'), { target: { value: '42.5' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Waste residue'), { target: { value: 'Waste residue' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Singapore hub'), { target: { value: 'Singapore hub' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /MSDS available/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Place Ask' }));

    expect(createOrderMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /confirm assisted order/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/external instruction reference/i), { target: { value: 'INSTR-7' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm and submit ask/i }));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({
      support_confirmation: expect.objectContaining({
        external_instruction_reference: 'INSTR-7',
        acknowledge_exact_terms: true,
        acknowledge_executable_standing_order: true,
      }),
    })));
  });

  it('retries an ambiguous assisted ASK with the identical payload and idempotency key', async () => {
    marketSupportControl.current = {
      isActive: true,
      isLoading: false,
      context: {
        id: 'ctx-1',
        organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
        actor: { id: 'admin-1', name: 'Ravi Admin', email: 'ravi@verdaxis.exchange' },
        supportReference: 'CASE-42',
        expiresAt: '2026-07-23T18:00:00.000Z',
        scope: ['ORDER_CREATE', 'ORDER_CANCEL'],
      },
    };
    setMarketSupportContextId('ctx-1');
    createOrderMock
      .mockRejectedValueOnce(new TestApiOutcomeUnknownError('The request status is unknown'))
      .mockResolvedValueOnce({ trades: [] });

    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="ASK" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '555' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /certification declaration/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. IMPCA'), { target: { value: 'IMPCA' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 40'), { target: { value: '42.5' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Waste residue'), { target: { value: 'Waste residue' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Singapore hub'), { target: { value: 'Singapore hub' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /MSDS available/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Place Ask' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm and submit ask/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /retry safely/i })).toBeTruthy());
    const firstPayload = createOrderMock.mock.calls[0]?.[0];
    expect(firstPayload?.idempotency_key).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /retry safely/i }));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(2));
    expect(createOrderMock.mock.calls[1]?.[0]).toEqual(firstPayload);
  });

  it('supports an organization-scoped GTC BID without evidence text', async () => {
    marketSupportControl.current = {
      isActive: true,
      isLoading: false,
      context: {
        id: 'ctx-1',
        organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
        actor: { id: 'admin-1', name: 'Ravi Admin', email: 'ravi@verdaxis.exchange' },
        supportReference: 'CASE-42',
        expiresAt: '2099-07-23T18:00:00.000Z',
        scope: ['ORDER_CREATE', 'ORDER_CANCEL'],
      },
    };
    setMarketSupportContextId('ctx-1');
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '525' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));
    expect(screen.queryByLabelText(/evidence excerpt/i)).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm and submit bid/i }));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({
      side: 'BID',
      support_confirmation: expect.objectContaining({
        external_instruction_reference: 'CASE-42',
      }),
    })));
    expect(createOrderMock.mock.calls[0]?.[0]?.expires_at).toBeUndefined();
  });

  it('retries an ambiguous dated order with the same payload and key after expiry', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2099-12-30T12:00:00Z'));
    try {
      createOrderMock
        .mockRejectedValueOnce(new TestApiOutcomeUnknownError('Request timed out. Please try again.'))
        .mockResolvedValueOnce({ trades: [] });
      renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
      await waitFor(() => expect(productsMock).toHaveBeenCalled());
      fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '540' } });
      fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Good-till-Date (UTC)' }));
      fireEvent.change(document.getElementById('order-expiry-date')!, { target: { value: '2099-12-31' } });
      reviewAndConfirm('Bid');

      await waitFor(() => expect(screen.getByRole('button', { name: /retry safely/i })).toBeTruthy());
      const firstPayload = createOrderMock.mock.calls[0]?.[0];
      expect(firstPayload).toEqual(expect.objectContaining({
        expires_at: '2099-12-31T23:59:59.000Z',
        idempotency_key: expect.any(String),
      }));

      now.mockReturnValue(Date.parse('2100-01-01T00:00:00Z'));
      fireEvent.click(screen.getByRole('button', { name: /retry safely/i }));

      await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(2));
      expect(createOrderMock.mock.calls[1]?.[0]).toEqual(firstPayload);
    } finally {
      now.mockRestore();
    }
  });

  it('creates a new key after the failed draft is closed and edited', async () => {
    createOrderMock
      .mockRejectedValueOnce(new TestApiOutcomeUnknownError('Request timed out. Please try again.'))
      .mockResolvedValueOnce({ trades: [] });
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '540' } });
    reviewAndConfirm('Bid');
    await waitFor(() => expect(screen.getByRole('button', { name: /retry safely/i })).toBeTruthy());
    const firstKey = createOrderMock.mock.calls[0]?.[0]?.idempotency_key;

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '541' } });
    reviewAndConfirm('Bid');

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(2));
    expect(createOrderMock.mock.calls[1]?.[0]?.price_per_mt_usd).toBe(541);
    expect(createOrderMock.mock.calls[1]?.[0]?.idempotency_key).not.toBe(firstKey);
  });

  it('guards against double submit while the request is pending', async () => {
    let resolveRequest!: (value: { trades: never[] }) => void;
    createOrderMock.mockReturnValue(new Promise(resolve => { resolveRequest = resolve; }));
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '540' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review Bid' }));
    const submit = screen.getByRole('button', { name: 'Confirm and place Bid' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));
    resolveRequest({ trades: [] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy());
  });

  it('uses natural Chinese order actions without mixing BID into prose', async () => {
    await i18n.changeLanguage('zh');
    deliveryPointsMock.mockResolvedValue([
      {
        id: 'dp-1',
        name: 'Singapore',
        region: 'Asia',
        timezone: 'Asia/Singapore',
        is_active: true,
      },
      {
        id: 'dp-unknown',
        name: 'Rotterdam',
        region: 'Unmapped Region',
        timezone: 'UTC',
        is_active: true,
      },
    ]);

    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);

    expect(await screen.findByRole('heading', { name: '发布买单' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '核对买单' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /高级选项 可成交期限：现货/ })).toBeTruthy();
    expect(screen.getByText('该产品适用平台目录中的标准规格；下单前请核对认证、质量和交付要求。')).toBeTruthy();
    expect(screen.getByText('亚洲')).toBeTruthy();

    fireEvent.click(screen.getByRole('combobox', { name: '订单交付点' }));

    expect(screen.getAllByText('亚洲').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('其他地区')).toBeTruthy();
    expect(screen.queryByText('Asia')).toBeNull();
    expect(screen.queryByText('Unmapped Region')).toBeNull();
    expect(screen.queryByText('Test product')).toBeNull();
    expect(screen.queryByText('BID')).toBeNull();
    expect(screen.getAllByText('买单').length).toBeGreaterThan(0);
    expect(screen.queryByText(/发布BID/i)).toBeNull();
  });

});
