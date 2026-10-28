import React from 'react';
import { act, render as renderBare } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TradeNotifier } from '../components/TradeNotifier';
import { OWN_ORDERS_REFRESH_DEBOUNCE_MS, PRIVATE_ORDER_EVENTS, subscribeToOwnOrderChanges } from '../services/orderStreamEvents';
import { recordOwnTradeAction } from '../services/ownTradeActions';
import { subscribeToPriceAlertTriggers } from '../services/priceAlertEvents';
import i18n, { loadNamespace } from '../i18n';

const useSSEMock = vi.fn();
const alertForTradeEventMock = vi.fn();
const tradeAlertOptions = vi.hoisted(() => ({ last: null as null | { userId: string; isMarketSupportActive: boolean } }));
const addToastMock = vi.fn();
const addNotificationMock = vi.fn();
const namespaceControl = vi.hoisted(() => ({
  ready: false,
  t: vi.fn(),
}));
const authControl = vi.hoisted(() => ({
  user: { id: 'user-1', organization_id: 'org-1' },
  isAuthenticated: true,
}));
const supportControl = vi.hoisted(() => ({
  isActive: false,
  context: null as { id: string } | null,
}));

vi.mock('../hooks/useTradeAlerts', () => ({
  useTradeAlerts: (options: { userId: string; isMarketSupportActive: boolean }) => {
    tradeAlertOptions.last = options;
    return alertForTradeEventMock;
  },
}));

vi.mock('../hooks/useSSE', () => ({
  useSSE: (...args: unknown[]) => useSSEMock(...args),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authControl,
}));

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => supportControl,
}));

vi.mock('../context/NotificationContext', () => ({
  useNotifications: () => ({ addNotification: addNotificationMock }),
}));

vi.mock('../hooks/useNamespace', () => ({
  useNamespace: () => namespaceControl,
}));

// The notifier lives inside the router so a notification click can open My Trades.
const render = (ui: React.ReactElement) => {
  const wrap = (node: React.ReactElement) => <MemoryRouter>{node}</MemoryRouter>;
  const result = renderBare(wrap(ui));
  return { ...result, rerender: (next: React.ReactElement) => result.rerender(wrap(next)) };
};

describe('TradeNotifier', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await loadNamespace('trading');
    await i18n.changeLanguage('zh');
    namespaceControl.ready = false;
    authControl.user = { id: 'user-1', organization_id: 'org-1' };
    authControl.isAuthenticated = true;
    supportControl.isActive = false;
    supportControl.context = null;
    namespaceControl.t.mockImplementation((key: string, options?: Record<string, unknown>) => (
      i18n.t(key, { ns: 'trading', ...options })
    ));
  });

  it('waits for trading translations and emits Chinese trade-event copy', () => {
    const { rerender } = render(<TradeNotifier />);

    expect(useSSEMock).toHaveBeenLastCalledWith(
      'trades',
      expect.any(Function),
      false,
      'user-1:org-1:',
    );

    namespaceControl.ready = true;
    rerender(<TradeNotifier />);

    expect(useSSEMock).toHaveBeenLastCalledWith(
      'trades',
      expect.any(Function),
      true,
      'user-1:org-1:',
    );
    const handler = useSSEMock.mock.calls.at(-1)?.[1] as (event: string, data: Record<string, unknown>) => void;

    act(() => {
      handler('trade_confirmed', { quantity: 500, price: 740 });
    });

    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: '交易已确认',
      message: '500 MT 已按 $740/MT 确认',
    }));
    expect(addNotificationMock).toHaveBeenCalledWith(expect.objectContaining({
      title: '交易已确认',
      message: '500 MT 已按 $740/MT 确认',
    }));
  });

  it('stops the customer stream in support mode and changes scope on account switch', () => {
    namespaceControl.ready = true;
    const { rerender } = render(<TradeNotifier />);

    supportControl.isActive = true;
    supportControl.context = { id: 'support-1' };
    rerender(<TradeNotifier />);
    expect(useSSEMock).toHaveBeenLastCalledWith(
      'trades',
      expect.any(Function),
      false,
      'user-1:org-1:support-1',
    );

    supportControl.isActive = false;
    supportControl.context = null;
    authControl.user = { id: 'user-2', organization_id: 'org-2' };
    rerender(<TradeNotifier />);
    expect(useSSEMock).toHaveBeenLastCalledWith(
      'trades',
      expect.any(Function),
      true,
      'user-2:org-2:',
    );
  });

  it('passes every trade stream event, with its stream id, to the optional alerts', () => {
    namespaceControl.ready = true;
    render(<TradeNotifier />);
    const handler = useSSEMock.mock.calls.at(-1)?.[1] as (event: string, data: unknown, eventId?: string) => void;

    act(() => {
      handler('trade_created', { id: 'trade-1' }, '41');
      handler('trade_declined', { id: 'trade-1' }, '42');
    });

    expect(alertForTradeEventMock).toHaveBeenNthCalledWith(1, 'trade_created', { id: 'trade-1' }, '41');
    expect(alertForTradeEventMock).toHaveBeenNthCalledWith(2, 'trade_declined', { id: 'trade-1' }, '42');
    // Created and declined trades keep their previous behaviour: no toast.
    expect(addToastMock).not.toHaveBeenCalled();
    expect(addNotificationMock).not.toHaveBeenCalled();
  });

  it('shows a toast and a panel entry for a triggered price alert, in both languages', () => {
    namespaceControl.ready = true;
    render(<TradeNotifier />);
    const handler = useSSEMock.mock.calls.at(-1)?.[1] as (event: string, data: unknown, eventId?: string) => void;
    const data = {
      alert_id: 'alert-1', direction: 'above', product_name: 'Bio-Methanol',
      price: '725.5', threshold_usd: '700.00',
    };

    act(() => handler('price_alert_triggered', data, '51'));

    expect(alertForTradeEventMock).toHaveBeenCalledWith('price_alert_triggered', data, '51');
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: '价格提醒已触发',
      message: 'Bio-Methanol 以 $725.50/MT 成交，高于您设置的 $700.00 提醒价',
    }));
    expect(addNotificationMock).toHaveBeenCalledWith(expect.objectContaining({
      title: '价格提醒已触发',
      data,
      is_read: false,
    }));

    return i18n.changeLanguage('en').then(() => {
      addToastMock.mockClear();
      act(() => handler('price_alert_triggered', { ...data, direction: 'below' }, '52'));
      expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Price Alert Triggered',
        message: 'Bio-Methanol traded at $725.50/MT, below your $700.00 alert',
      }));
    });
  });

  it('announces a triggered price alert to open views', () => {
    namespaceControl.ready = true;
    render(<TradeNotifier />);
    const handler = useSSEMock.mock.calls.at(-1)?.[1] as (event: string, data: unknown, eventId?: string) => void;
    const listener = vi.fn();
    const unsubscribe = subscribeToPriceAlertTriggers(listener);

    act(() => handler('price_alert_triggered', { alert_id: 'alert-1', direction: 'above' }, '51'));
    unsubscribe();
    act(() => handler('price_alert_triggered', { alert_id: 'alert-2', direction: 'above' }, '52'));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('still shows the toast and panel entry for an event the user caused, because only sound and browser notification are silenced', () => {
    namespaceControl.ready = true;
    render(<TradeNotifier />);
    const handler = useSSEMock.mock.calls.at(-1)?.[1] as (event: string, data: unknown, eventId?: string) => void;
    recordOwnTradeAction('trade-1', 'trade_confirmed');

    act(() => handler('trade_confirmed', { id: 'trade-1', quantity: 500, price: 740 }, '60'));

    // The alert hook (mocked here) is where the own-action check lives.
    expect(alertForTradeEventMock).toHaveBeenCalledWith('trade_confirmed', expect.objectContaining({ id: 'trade-1' }), '60');
    expect(addToastMock).toHaveBeenCalledTimes(1);
    expect(addNotificationMock).toHaveBeenCalledTimes(1);
  });

  describe('private order events', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it.each(PRIVATE_ORDER_EVENTS)('%s refreshes order views without a toast, panel entry or alert', (event) => {
      vi.useFakeTimers();
      namespaceControl.ready = true;
      render(<TradeNotifier />);
      const handler = useSSEMock.mock.calls.at(-1)?.[1] as (event: string, data: unknown, eventId?: string) => void;
      const listener = vi.fn();
      const unsubscribe = subscribeToOwnOrderChanges(listener);

      act(() => handler(event, { id: 'order-1', order_id: 'order-1' }, '70'));
      act(() => { vi.advanceTimersByTime(OWN_ORDERS_REFRESH_DEBOUNCE_MS); });
      unsubscribe();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(alertForTradeEventMock).not.toHaveBeenCalled();
      expect(addToastMock).not.toHaveBeenCalled();
      expect(addNotificationMock).not.toHaveBeenCalled();
    });

    it('batches a burst of order events into one refresh', () => {
      vi.useFakeTimers();
      namespaceControl.ready = true;
      render(<TradeNotifier />);
      const handler = useSSEMock.mock.calls.at(-1)?.[1] as (event: string, data: unknown, eventId?: string) => void;
      const listener = vi.fn();
      const unsubscribe = subscribeToOwnOrderChanges(listener);

      act(() => {
        handler('order_created', { id: 'order-1' }, '71');
        handler('orders_matched', { order_id: 'order-1', matches: 1 }, '72');
        handler('order_updated', { id: 'order-1' }, '73');
      });
      act(() => { vi.advanceTimersByTime(OWN_ORDERS_REFRESH_DEBOUNCE_MS); });
      unsubscribe();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('reloads order views after a stream gap, still without a toast', () => {
      vi.useFakeTimers();
      namespaceControl.ready = true;
      render(<TradeNotifier />);
      const handler = useSSEMock.mock.calls.at(-1)?.[1] as (event: string, data: unknown, eventId?: string) => void;
      const listener = vi.fn();
      const unsubscribe = subscribeToOwnOrderChanges(listener);

      act(() => handler('reconnect', { reason: 'transport_reconnected' }));
      act(() => { vi.advanceTimersByTime(OWN_ORDERS_REFRESH_DEBOUNCE_MS); });
      unsubscribe();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(addToastMock).not.toHaveBeenCalled();
    });

    it('does not refresh order views for a trade event', () => {
      vi.useFakeTimers();
      namespaceControl.ready = true;
      render(<TradeNotifier />);
      const handler = useSSEMock.mock.calls.at(-1)?.[1] as (event: string, data: unknown, eventId?: string) => void;
      const listener = vi.fn();
      const unsubscribe = subscribeToOwnOrderChanges(listener);

      act(() => handler('trade_confirmed', { id: 'trade-1', quantity: 500, price: 740 }, '74'));
      act(() => { vi.advanceTimersByTime(OWN_ORDERS_REFRESH_DEBOUNCE_MS); });
      unsubscribe();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  it('tells the alerts about the user and the assisted context', () => {
    namespaceControl.ready = true;
    supportControl.isActive = true;
    render(<TradeNotifier />);

    expect(tradeAlertOptions.last).toMatchObject({ userId: 'user-1', isMarketSupportActive: true });
  });
});
