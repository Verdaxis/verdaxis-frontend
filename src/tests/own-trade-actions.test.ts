import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OWN_TRADE_ACTION_CHANNEL,
  OWN_TRADE_ACTION_TTL_MS,
  clearOwnTradeActions,
  forgetOwnTradeAction,
  isOwnTradeAction,
  recordOwnTradeAction,
  watchPeerTradeActions,
} from '../services/ownTradeActions';
import { FakeBroadcastChannel } from './fake-broadcast-channel';

describe('own trade actions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearOwnTradeActions();
    FakeBroadcastChannel.open.clear();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('in this tab', () => {
    it('matches the recorded trade and event only', () => {
      recordOwnTradeAction('trade-1', 'trade_confirmed');

      expect(isOwnTradeAction('trade-1', 'trade_confirmed')).toBe(true);
      expect(isOwnTradeAction('trade-1', 'trade_declined')).toBe(false);
      expect(isOwnTradeAction('trade-2', 'trade_confirmed')).toBe(false);
      expect(isOwnTradeAction(null, 'trade_confirmed')).toBe(false);
    });

    it('never matches events that are not confirm or decline results', () => {
      recordOwnTradeAction('trade-1', 'trade_confirmed');

      expect(isOwnTradeAction('trade-1', 'trade_created')).toBe(false);
      expect(isOwnTradeAction('trade-1', 'trade_auto_matched')).toBe(false);
      expect(isOwnTradeAction('trade-1', 'price_alert_triggered')).toBe(false);
    });

    it('expires after the time to live', () => {
      recordOwnTradeAction('trade-1', 'trade_declined');

      vi.advanceTimersByTime(OWN_TRADE_ACTION_TTL_MS - 1);
      expect(isOwnTradeAction('trade-1', 'trade_declined')).toBe(true);

      vi.advanceTimersByTime(1);
      expect(isOwnTradeAction('trade-1', 'trade_declined')).toBe(false);
    });

    it('keeps the record when the matching event arrives, so a replay of it is also silent', () => {
      recordOwnTradeAction('trade-1', 'trade_confirmed');

      expect(isOwnTradeAction('trade-1', 'trade_confirmed')).toBe(true);
      expect(isOwnTradeAction('trade-1', 'trade_confirmed')).toBe(true);
    });

    it('restarts the time to live when the same action is recorded again', () => {
      recordOwnTradeAction('trade-1', 'trade_confirmed');
      vi.advanceTimersByTime(OWN_TRADE_ACTION_TTL_MS - 1_000);
      recordOwnTradeAction('trade-1', 'trade_confirmed');
      vi.advanceTimersByTime(OWN_TRADE_ACTION_TTL_MS - 1_000);

      expect(isOwnTradeAction('trade-1', 'trade_confirmed')).toBe(true);
    });

    it('forgets a withdrawn action', () => {
      recordOwnTradeAction('trade-1', 'trade_confirmed');
      forgetOwnTradeAction('trade-1', 'trade_confirmed');

      expect(isOwnTradeAction('trade-1', 'trade_confirmed')).toBe(false);
    });

    it('ignores an empty trade id', () => {
      recordOwnTradeAction('', 'trade_confirmed');
      expect(isOwnTradeAction('', 'trade_confirmed')).toBe(false);
    });

    it('keeps a bounded number of records and drops the oldest first', () => {
      for (let index = 0; index < 205; index += 1) recordOwnTradeAction(`trade-${index}`, 'trade_confirmed');

      expect(isOwnTradeAction('trade-0', 'trade_confirmed')).toBe(false);
      expect(isOwnTradeAction('trade-4', 'trade_confirmed')).toBe(false);
      expect(isOwnTradeAction('trade-5', 'trade_confirmed')).toBe(true);
      expect(isOwnTradeAction('trade-204', 'trade_confirmed')).toBe(true);
    });

    it('clears every record at sign-out', () => {
      recordOwnTradeAction('trade-1', 'trade_confirmed');

      window.dispatchEvent(new Event('verdaxis:auth-logout'));

      expect(isOwnTradeAction('trade-1', 'trade_confirmed')).toBe(false);
    });

    it('works without BroadcastChannel', () => {
      vi.stubGlobal('BroadcastChannel', undefined);
      const release = watchPeerTradeActions();

      expect(() => recordOwnTradeAction('trade-1', 'trade_confirmed')).not.toThrow();
      expect(isOwnTradeAction('trade-1', 'trade_confirmed')).toBe(true);
      expect(() => forgetOwnTradeAction('trade-1', 'trade_confirmed')).not.toThrow();
      expect(() => release()).not.toThrow();
    });

    it('works when the channel cannot be created', () => {
      vi.stubGlobal('BroadcastChannel', class {
        constructor() { throw new Error('blocked'); }
      });

      expect(() => recordOwnTradeAction('trade-1', 'trade_declined')).not.toThrow();
      expect(isOwnTradeAction('trade-1', 'trade_declined')).toBe(true);
    });
  });

  describe('across tabs', () => {
    const observe = () => {
      const observer = new FakeBroadcastChannel(OWN_TRADE_ACTION_CHANNEL);
      const received: unknown[] = [];
      observer.onmessage = (message) => received.push(message.data);
      return received;
    };

    it('tells the other tabs about a recorded action, with a trade id and an event name only', () => {
      const received = observe();

      recordOwnTradeAction('trade-1', 'trade_confirmed');
      forgetOwnTradeAction('trade-1', 'trade_confirmed');

      expect(received).toEqual([
        { type: 'own_trade_action', kind: 'record', tradeId: 'trade-1', event: 'trade_confirmed' },
        { type: 'own_trade_action', kind: 'forget', tradeId: 'trade-1', event: 'trade_confirmed' },
      ]);
    });

    it('does not leave a channel open after sending', () => {
      recordOwnTradeAction('trade-1', 'trade_confirmed');

      expect(FakeBroadcastChannel.open.size).toBe(0);
    });

    it('does not echo to the tab that sent it', () => {
      const release = watchPeerTradeActions();
      const received = observe();

      recordOwnTradeAction('trade-1', 'trade_declined');

      expect(received).toHaveLength(1);
      expect(FakeBroadcastChannel.open.size).toBe(2); // the watcher and the observer
      release();
    });

    it('applies a record and a withdrawal from another tab', () => {
      const release = watchPeerTradeActions();
      const peer = new FakeBroadcastChannel(OWN_TRADE_ACTION_CHANNEL);

      peer.postMessage({ type: 'own_trade_action', kind: 'record', tradeId: 'trade-9', event: 'trade_confirmed' });
      expect(isOwnTradeAction('trade-9', 'trade_confirmed')).toBe(true);

      peer.postMessage({ type: 'own_trade_action', kind: 'forget', tradeId: 'trade-9', event: 'trade_confirmed' });
      expect(isOwnTradeAction('trade-9', 'trade_confirmed')).toBe(false);
      release();
    });

    it('expires a record from another tab on the same schedule', () => {
      const release = watchPeerTradeActions();
      new FakeBroadcastChannel(OWN_TRADE_ACTION_CHANNEL)
        .postMessage({ type: 'own_trade_action', kind: 'record', tradeId: 'trade-9', event: 'trade_declined' });

      vi.advanceTimersByTime(OWN_TRADE_ACTION_TTL_MS);

      expect(isOwnTradeAction('trade-9', 'trade_declined')).toBe(false);
      release();
    });

    it('ignores malformed messages', () => {
      const release = watchPeerTradeActions();
      const peer = new FakeBroadcastChannel(OWN_TRADE_ACTION_CHANNEL);

      peer.postMessage(null);
      peer.postMessage('trade-9');
      peer.postMessage({ type: 'own_trade_action', kind: 'record', tradeId: 'trade-9', event: 'trade_created' });
      peer.postMessage({ type: 'own_trade_action', kind: 'wipe', tradeId: 'trade-9', event: 'trade_confirmed' });
      peer.postMessage({ type: 'own_trade_action', kind: 'record', tradeId: 9, event: 'trade_confirmed' });
      peer.postMessage({ type: 'own_trade_action', kind: 'record', tradeId: '', event: 'trade_confirmed' });
      peer.postMessage({ type: 'own_trade_action', kind: 'record', tradeId: 'x'.repeat(65), event: 'trade_confirmed' });
      peer.postMessage({ type: 'something_else', kind: 'record', tradeId: 'trade-9', event: 'trade_confirmed' });

      expect(isOwnTradeAction('trade-9', 'trade_confirmed')).toBe(false);
      expect(isOwnTradeAction('trade-9', 'trade_created')).toBe(false);
      release();
    });

    it('listens until the last watcher is released', () => {
      const first = watchPeerTradeActions();
      const second = watchPeerTradeActions();
      expect(FakeBroadcastChannel.open.size).toBe(1);

      first();
      first(); // releasing twice must not release the other watcher
      expect(FakeBroadcastChannel.open.size).toBe(1);
      second();
      expect(FakeBroadcastChannel.open.size).toBe(0);
    });
  });
});
