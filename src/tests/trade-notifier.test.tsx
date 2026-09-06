import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TradeNotifier } from '../components/TradeNotifier';
import i18n, { loadNamespace } from '../i18n';

const useSSEMock = vi.fn();
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
});
