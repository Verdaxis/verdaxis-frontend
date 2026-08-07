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

vi.mock('../hooks/useSSE', () => ({
  useSSE: (...args: unknown[]) => useSSEMock(...args),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
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
    namespaceControl.t.mockImplementation((key: string, options?: Record<string, unknown>) => (
      i18n.t(key, { ns: 'trading', ...options })
    ));
  });

  it('waits for trading translations and emits Chinese trade-event copy', () => {
    const { rerender } = render(<TradeNotifier />);

    expect(useSSEMock).toHaveBeenLastCalledWith('trades', expect.any(Function), false);

    namespaceControl.ready = true;
    rerender(<TradeNotifier />);

    expect(useSSEMock).toHaveBeenLastCalledWith('trades', expect.any(Function), true);
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
});
