import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTradeAlerts, tradeAlertKindForEvent } from '../hooks/useTradeAlerts';
import i18n, { loadNamespace } from '../i18n';
import { CLAIM_WINDOW_MS } from '../services/tradeAlertElection';
import { writeTradeAlertPreferences } from '../services/tradeAlertPreferences';

const mocks = vi.hoisted(() => ({
  myTradesPaged: vi.fn(),
  playTone: vi.fn(() => true),
  unlockOnGesture: vi.fn(),
  permission: 'granted' as 'default' | 'granted' | 'denied' | 'unsupported',
  showNotification: vi.fn((_input: { title: string; body: string; tag: string; onClick: () => void }) => true),
}));

vi.mock('../services/api', () => ({ api: { trades: { myTradesPaged: mocks.myTradesPaged } } }));
vi.mock('../services/tradeAlertSound', () => ({
  playTradeAlertTone: mocks.playTone,
  unlockTradeAlertAudioOnFirstGesture: mocks.unlockOnGesture,
  unlockTradeAlertAudio: vi.fn(() => true),
}));
vi.mock('../services/tradeAlertNotifications', () => ({
  getTradeAlertPermission: () => mocks.permission,
  requestTradeAlertPermission: vi.fn(async () => 'granted'),
  showTradeAlertNotification: mocks.showNotification,
}));

class FakeBroadcastChannel {
  static instances = new Set<FakeBroadcastChannel>();
  onmessage: ((message: MessageEvent) => void) | null = null;
  constructor(readonly name: string) { FakeBroadcastChannel.instances.add(this); }
  postMessage(data: unknown) {
    for (const peer of FakeBroadcastChannel.instances) {
      if (peer !== this && peer.name === this.name) peer.onmessage?.({ data } as MessageEvent);
    }
  }
  close() { FakeBroadcastChannel.instances.delete(this); }
}

let visibility: DocumentVisibilityState = 'hidden';
const USER_ID = 'user-1';

const enableAlerts = (sound: boolean, notifications: boolean) => (
  writeTradeAlertPreferences(USER_ID, { sound, notifications })
);

type HookProps = { isMarketSupportActive?: boolean; onOpenMyTrades?: () => void };

const renderAlerts = (props: HookProps = {}) => renderHook(
  (current: HookProps) => useTradeAlerts({
    userId: USER_ID,
    isMarketSupportActive: current.isMarketSupportActive ?? false,
    t: i18n.getFixedT('en', 'trading'),
    onOpenMyTrades: current.onOpenMyTrades ?? vi.fn(),
  }),
  { initialProps: props },
);

/** Lets the claim, the optional lookup and the alert settle. */
const settle = async () => {
  await act(async () => { await vi.advanceTimersByTimeAsync(CLAIM_WINDOW_MS + 50); });
};

const sendTradeEvent = async (
  handler: ReturnType<typeof renderAlerts>['result']['current'],
  event: string,
  data: unknown,
  eventId?: string,
) => {
  handler(event, data, eventId);
  await settle();
};

describe('trade alerts', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.permission = 'granted';
    window.localStorage.clear();
    FakeBroadcastChannel.instances.clear();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    visibility = 'hidden';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    mocks.myTradesPaged.mockResolvedValue({ items: [{ id: 'trade-1' }] });
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('event mapping', () => {
    it.each([
      ['trade_created', 'action'],
      ['trade_confirmed', 'done'],
      ['trade_auto_matched', 'done'],
      ['trade_declined', 'declined'],
    ])('%s plays the %s tone', async (event, tone) => {
      enableAlerts(true, false);
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, event, { id: 'trade-1' }, '10');

      expect(mocks.playTone).toHaveBeenCalledTimes(1);
      expect(mocks.playTone).toHaveBeenCalledWith(tone);
    });

    it.each(['reconnect', 'reset', 'heartbeat', 'trade_delivered', 'trade_paid', 'market_invalidated', 'unknown'])(
      'ignores %s',
      async (event) => {
        enableAlerts(true, true);
        const { result } = renderAlerts();

        await sendTradeEvent(result.current, event, { id: 'trade-1', reason: 'x' }, '11');

        expect(mocks.playTone).not.toHaveBeenCalled();
        expect(mocks.showNotification).not.toHaveBeenCalled();
        expect(mocks.myTradesPaged).not.toHaveBeenCalled();
      },
    );

    it('knows the four alert events and nothing else', () => {
      expect(['trade_created', 'trade_confirmed', 'trade_declined', 'trade_auto_matched', 'reset']
        .map(tradeAlertKindForEvent)).toEqual(['created', 'confirmed', 'declined', 'autoMatched', null]);
    });
  });

  describe('trade created needs the user\'s confirmation', () => {
    it('asks the server which trades await this user and alerts when the trade is one of them', async () => {
      enableAlerts(true, false);
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, 'trade_created', { id: 'trade-1' }, '12');

      expect(mocks.myTradesPaged).toHaveBeenCalledWith({ action_required: true, limit: 20 });
      expect(mocks.playTone).toHaveBeenCalledWith('action');
    });

    it('stays quiet for the party who started the trade', async () => {
      enableAlerts(true, true);
      mocks.myTradesPaged.mockResolvedValue({ items: [{ id: 'another-trade' }] });
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, 'trade_created', { id: 'trade-1' }, '13');

      expect(mocks.playTone).not.toHaveBeenCalled();
      expect(mocks.showNotification).not.toHaveBeenCalled();
    });

    it('stays quiet when the lookup fails or the event has no trade id', async () => {
      enableAlerts(true, true);
      const { result } = renderAlerts();

      mocks.myTradesPaged.mockRejectedValueOnce(new Error('offline'));
      await sendTradeEvent(result.current, 'trade_created', { id: 'trade-1' }, '14');
      await sendTradeEvent(result.current, 'trade_created', { status: 'PENDING_CONFIRMATION' }, '15');

      expect(mocks.playTone).not.toHaveBeenCalled();
      expect(mocks.showNotification).not.toHaveBeenCalled();
    });
  });

  describe('settings', () => {
    it('makes no sound by default, but shows a notification once permission is granted', async () => {
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '20');

      expect(mocks.playTone).not.toHaveBeenCalled();
      expect(mocks.showNotification).toHaveBeenCalledTimes(1);
    });

    it.each(['default', 'denied', 'unsupported'] as const)(
      'does nothing by default while permission is %s',
      async (permission) => {
        mocks.permission = permission;
        const { result } = renderAlerts();

        await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '20');

        expect(mocks.playTone).not.toHaveBeenCalled();
        expect(mocks.showNotification).not.toHaveBeenCalled();
      },
    );

    it('respects an explicit off even though permission is granted', async () => {
      enableAlerts(false, false);
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '20');

      expect(mocks.showNotification).not.toHaveBeenCalled();
    });

    it('uses a permission granted after the hook rendered', async () => {
      mocks.permission = 'default';
      const { result } = renderAlerts();

      mocks.permission = 'granted'; // the sign-in prompt was just accepted
      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '20');

      expect(mocks.showNotification).toHaveBeenCalledTimes(1);
    });

    it('plays sound without a notification when only sound is on', async () => {
      enableAlerts(true, false);
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '21');

      expect(mocks.playTone).toHaveBeenCalledTimes(1);
      expect(mocks.showNotification).not.toHaveBeenCalled();
    });

    it('shows a notification without sound when only notifications are on', async () => {
      enableAlerts(false, true);
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '22');

      expect(mocks.playTone).not.toHaveBeenCalled();
      expect(mocks.showNotification).toHaveBeenCalledTimes(1);
    });

    it('prepares audio for the first gesture only when sound is on', () => {
      renderAlerts();
      expect(mocks.unlockOnGesture).not.toHaveBeenCalled();

      cleanup();
      enableAlerts(true, false);
      renderAlerts();
      expect(mocks.unlockOnGesture).toHaveBeenCalled();
    });
  });

  describe('visible and hidden', () => {
    it('shows a notification only while the tab is hidden', async () => {
      enableAlerts(true, true);
      const { result } = renderAlerts();

      visibility = 'visible';
      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '30');
      expect(mocks.playTone).toHaveBeenCalledTimes(1);
      expect(mocks.showNotification).not.toHaveBeenCalled();

      visibility = 'hidden';
      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-2' }, '31');
      expect(mocks.playTone).toHaveBeenCalledTimes(2);
      expect(mocks.showNotification).toHaveBeenCalledTimes(1);
    });

    it('uses plain localized copy without counterparty, price or quantity', async () => {
      enableAlerts(false, true);
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, 'trade_confirmed', {
        id: 'trade-1',
        quantity: '500',
        price: '740',
        buyer_name: 'Acme Shipping',
        seller_name: 'Globex Fuels',
      }, '32');

      const shown = mocks.showNotification.mock.calls[0][0];
      expect(shown.title).toBe('Trade confirmed');
      expect(shown.body).toBe('A trade was confirmed. Open My Trades to see the details.');
      expect(`${shown.title} ${shown.body}`).not.toMatch(/Acme|Globex|500|740|\$/);
    });

    it('uses Chinese copy in the Chinese interface', async () => {
      await i18n.changeLanguage('zh');
      enableAlerts(false, true);
      const { result } = renderHook(() => useTradeAlerts({
        userId: USER_ID,
        isMarketSupportActive: false,
        t: i18n.getFixedT('zh', 'trading'),
        onOpenMyTrades: vi.fn(),
      }));

      await sendTradeEvent(result.current, 'trade_declined', { id: 'trade-1' }, '33');

      expect(mocks.showNotification.mock.calls[0][0]).toMatchObject({ title: '交易已拒绝' });
    });

    it('focuses the tab and opens My Trades when the notification is clicked', async () => {
      enableAlerts(false, true);
      const openMyTrades = vi.fn();
      const focus = vi.spyOn(window, 'focus').mockImplementation(() => undefined);
      const { result } = renderAlerts({ onOpenMyTrades: openMyTrades });

      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '34');
      const { onClick } = mocks.showNotification.mock.calls[0][0];
      onClick();

      expect(focus).toHaveBeenCalledTimes(1);
      expect(openMyTrades).toHaveBeenCalledTimes(1);
    });

    it('still shows the notification when audio is unavailable', async () => {
      enableAlerts(true, true);
      mocks.playTone.mockReturnValue(false);
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '35');

      expect(mocks.showNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('de-duplication', () => {
    it('alerts once for a repeated event id', async () => {
      enableAlerts(true, true);
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '40');
      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '40');

      expect(mocks.playTone).toHaveBeenCalledTimes(1);
      expect(mocks.showNotification).toHaveBeenCalledTimes(1);
    });

    it('alerts again for a different event id on the same trade', async () => {
      enableAlerts(true, false);
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '41');
      await sendTradeEvent(result.current, 'trade_declined', { id: 'trade-1' }, '42');

      expect(mocks.playTone).toHaveBeenCalledTimes(2);
    });

    it('falls back to the event name and trade id when the stream sent no event id', async () => {
      enableAlerts(true, false);
      const { result } = renderAlerts();

      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' });
      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' });
      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-2' });

      expect(mocks.playTone).toHaveBeenCalledTimes(2);
    });
  });

  describe('market support', () => {
    it('makes no sound or notification while an assisted context is active', async () => {
      enableAlerts(true, true);
      const { result } = renderAlerts({ isMarketSupportActive: true });

      await sendTradeEvent(result.current, 'trade_confirmed', { id: 'trade-1' }, '50');

      expect(mocks.playTone).not.toHaveBeenCalled();
      expect(mocks.showNotification).not.toHaveBeenCalled();
    });

    it('stays quiet when the context starts while the trade lookup is running', async () => {
      enableAlerts(true, true);
      let finishLookup: (value: unknown) => void = () => undefined;
      mocks.myTradesPaged.mockReturnValue(new Promise((resolve) => { finishLookup = resolve; }));
      const { result, rerender } = renderAlerts();

      result.current('trade_created', { id: 'trade-1' }, '51');
      await settle();
      rerender({ isMarketSupportActive: true });
      await act(async () => { finishLookup({ items: [{ id: 'trade-1' }] }); });
      await settle();

      expect(mocks.playTone).not.toHaveBeenCalled();
      expect(mocks.showNotification).not.toHaveBeenCalled();
    });
  });

  describe('several tabs', () => {
    it('alerts from only one of several hidden tabs', async () => {
      enableAlerts(true, true);
      const tabs = [renderAlerts(), renderAlerts(), renderAlerts()];

      tabs.forEach(({ result }) => result.current('trade_confirmed', { id: 'trade-1' }, '60'));
      await settle();

      expect(mocks.playTone).toHaveBeenCalledTimes(1);
      expect(mocks.showNotification).toHaveBeenCalledTimes(1);
    });

    it('lets the visible tab make the sound and sends no notification while any tab is in front', async () => {
      enableAlerts(true, true);
      const hiddenTab = renderAlerts();
      const visibleTab = renderAlerts();

      visibility = 'hidden';
      hiddenTab.result.current('trade_confirmed', { id: 'trade-1' }, '61');
      visibility = 'visible';
      visibleTab.result.current('trade_confirmed', { id: 'trade-1' }, '61');
      await settle();

      expect(mocks.playTone).toHaveBeenCalledTimes(1);
      expect(mocks.showNotification).not.toHaveBeenCalled();
    });

    it('alerts once per event in one tab even when its stream replays the event later', async () => {
      enableAlerts(true, false);
      const tab = renderAlerts();
      renderAlerts();

      tab.result.current('trade_declined', { id: 'trade-1' }, '62');
      await settle();
      tab.result.current('trade_declined', { id: 'trade-1' }, '62');
      await settle();

      expect(mocks.playTone).toHaveBeenCalledTimes(1);
    });
  });
});
