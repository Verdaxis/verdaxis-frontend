import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIVITY_BROADCAST_INTERVAL_MS, AUTH_TAB_SYNC_CHANNEL, openAuthTabSync } from '../services/authTabSync';
import { FakeBroadcastChannel } from './fake-broadcast-channel';

describe('openAuthTabSync', () => {
  beforeEach(() => {
    FakeBroadcastChannel.open.clear();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('delivers a broadcast event to other tabs but not back to the sender', () => {
    const senderHandler = vi.fn();
    const peerHandler = vi.fn();
    const sender = openAuthTabSync(senderHandler);
    openAuthTabSync(peerHandler);

    sender.broadcast('logout');

    expect(peerHandler).toHaveBeenCalledExactlyOnceWith('logout');
    expect(senderHandler).not.toHaveBeenCalled();
  });

  it('carries only the event type', () => {
    const observer = new FakeBroadcastChannel(AUTH_TAB_SYNC_CHANNEL);
    const received: unknown[] = [];
    observer.onmessage = (message) => received.push(message.data);

    openAuthTabSync(() => undefined).broadcast('identity_changed');

    expect(received).toEqual([{ type: 'identity_changed' }]);
  });

  it('ignores unknown or malformed messages', () => {
    const handler = vi.fn();
    openAuthTabSync(handler);
    const other = new FakeBroadcastChannel(AUTH_TAB_SYNC_CHANNEL);

    other.postMessage({ type: 'login-as-admin' });
    other.postMessage('logout');
    other.postMessage(null);

    expect(handler).not.toHaveBeenCalled();
  });

  it('stops delivering after close', () => {
    const handler = vi.fn();
    const sync = openAuthTabSync(handler);
    sync.close();

    new FakeBroadcastChannel(AUTH_TAB_SYNC_CHANNEL).postMessage({ type: 'logout' });

    expect(handler).not.toHaveBeenCalled();
    expect(FakeBroadcastChannel.open.size).toBe(1);
  });

  it('does nothing and does not throw when BroadcastChannel is missing', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const sync = openAuthTabSync(vi.fn());

    expect(() => sync.broadcast('logout')).not.toThrow();
    expect(() => sync.close()).not.toThrow();
  });

  it('does nothing when the channel cannot be created', () => {
    vi.stubGlobal('BroadcastChannel', class {
      constructor() {
        throw new DOMException('blocked', 'SecurityError');
      }
    });

    const sync = openAuthTabSync(vi.fn());

    expect(() => sync.broadcast('logout')).not.toThrow();
  });

  it('swallows a failed postMessage so a local logout is never broken', () => {
    const sync = openAuthTabSync(vi.fn());
    vi.spyOn(FakeBroadcastChannel.prototype, 'postMessage').mockImplementation(() => {
      throw new DOMException('closed', 'InvalidStateError');
    });

    expect(() => sync.broadcast('logout')).not.toThrow();
  });

  describe('activity', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('sends only the event type and a timestamp', () => {
      const observer = new FakeBroadcastChannel(AUTH_TAB_SYNC_CHANNEL);
      const received: unknown[] = [];
      observer.onmessage = (message) => received.push(message.data);

      openAuthTabSync(() => undefined).reportActivity();

      expect(received).toEqual([{ type: 'activity', at: Date.now() }]);
    });

    it('delivers the timestamp to other tabs as peer activity, not as a peer event', () => {
      const peerEvents = vi.fn();
      const peerActivity = vi.fn();
      openAuthTabSync(peerEvents, peerActivity);
      const sender = openAuthTabSync(vi.fn());

      sender.reportActivity();

      expect(peerActivity).toHaveBeenCalledExactlyOnceWith(Date.now());
      expect(peerEvents).not.toHaveBeenCalled();
    });

    it('does not report activity back to the sender', () => {
      const senderActivity = vi.fn();
      const sender = openAuthTabSync(vi.fn(), senderActivity);
      openAuthTabSync(vi.fn(), vi.fn());

      sender.reportActivity();

      expect(senderActivity).not.toHaveBeenCalled();
    });

    it('sends at most one message per throttle interval', () => {
      const peerActivity = vi.fn();
      openAuthTabSync(vi.fn(), peerActivity);
      const sender = openAuthTabSync(vi.fn());

      for (let i = 0; i < 100; i += 1) {
        sender.reportActivity();
        vi.advanceTimersByTime(ACTIVITY_BROADCAST_INTERVAL_MS / 100 - 1);
      }
      expect(peerActivity).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(ACTIVITY_BROADCAST_INTERVAL_MS);
      sender.reportActivity();
      expect(peerActivity).toHaveBeenCalledTimes(2);
    });

    it('does not stall when the system clock moves backwards', () => {
      const peerActivity = vi.fn();
      openAuthTabSync(vi.fn(), peerActivity);
      const sender = openAuthTabSync(vi.fn());

      sender.reportActivity();
      vi.setSystemTime(Date.now() - 60 * 60 * 1000);
      sender.reportActivity();

      expect(peerActivity).toHaveBeenCalledTimes(2);
    });

    it('ignores activity messages without a numeric timestamp', () => {
      const peerActivity = vi.fn();
      openAuthTabSync(vi.fn(), peerActivity);
      const other = new FakeBroadcastChannel(AUTH_TAB_SYNC_CHANNEL);

      other.postMessage({ type: 'activity' });
      other.postMessage({ type: 'activity', at: 'yesterday' });
      other.postMessage({ type: 'activity', at: Number.NaN });

      expect(peerActivity).not.toHaveBeenCalled();
    });

    it('does nothing when BroadcastChannel is missing', () => {
      vi.stubGlobal('BroadcastChannel', undefined);
      const sync = openAuthTabSync(vi.fn(), vi.fn());

      expect(() => sync.reportActivity()).not.toThrow();
    });

    it('swallows a failed postMessage', () => {
      const sync = openAuthTabSync(vi.fn());
      vi.spyOn(FakeBroadcastChannel.prototype, 'postMessage').mockImplementation(() => {
        throw new DOMException('closed', 'InvalidStateError');
      });

      expect(() => sync.reportActivity()).not.toThrow();
    });
  });
});
