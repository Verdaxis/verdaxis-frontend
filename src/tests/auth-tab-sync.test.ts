import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_TAB_SYNC_CHANNEL, openAuthTabSync } from '../services/authTabSync';
import { FakeBroadcastChannel } from './fake-broadcast-channel';

describe('openAuthTabSync', () => {
  beforeEach(() => {
    FakeBroadcastChannel.open.clear();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
  });

  afterEach(() => {
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
});
