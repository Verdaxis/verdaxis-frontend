import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSSE } from '../hooks/useSSE';

const authTokenMocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

vi.mock('../services/authToken', () => authTokenMocks);

type FakeEvent = {
  data?: string;
  lastEventId?: string;
};

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  readonly listeners = new Map<string, EventListener[]>();
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, event: FakeEvent = {}) {
    if (type === 'open') this.onopen?.(new Event('open'));
    if (type === 'error') this.onerror?.(new Event('error'));
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event as MessageEvent);
    }
  }
}

const Harness: React.FC<{
  channel: 'prices' | 'orderbook' | 'trades';
  enabled?: boolean;
  scopeKey?: string;
  onEvent?: (event: string, data: unknown) => void;
}> = ({ channel, enabled = true, scopeKey = '', onEvent = vi.fn() }) => {
  useSSE(channel, onEvent, enabled, scopeKey);
  return null;
};

describe('useSSE', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.stubGlobal('fetch', fetchMock);
    authTokenMocks.getAccessToken.mockReturnValue('access-token');
    authTokenMocks.refreshAccessToken.mockResolvedValue('refreshed-access-token');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ stream_token: 'stream-token' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('requests a stream token before opening private trade streams', async () => {
    render(<Harness channel="trades" />);

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/auth/stream-token',
      { headers: { Authorization: 'Bearer access-token' }, signal: expect.any(AbortSignal) },
    );
    expect(FakeEventSource.instances[0].url).toContain('stream_token=stream-token');
    expect(FakeEventSource.instances[0].url).not.toContain('access-token');
  });

  it('refreshes once after a rejected stream-token request', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ stream_token: 'refreshed-stream-token' }),
      });
    authTokenMocks.refreshAccessToken.mockResolvedValue('refreshed-access-token');

    render(<Harness channel="trades" />);

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/auth/stream-token',
      { headers: { Authorization: 'Bearer refreshed-access-token' }, signal: expect.any(AbortSignal) },
    );
  });

  it('reconnects private streams with the latest durable event cursor', async () => {
    render(<Harness channel="trades" />);
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));

    const first = FakeEventSource.instances[0];
    act(() => {
      first.emit('trade_confirmed', { data: '{"trade_id":"trade-1"}', lastEventId: '42' });
      first.emit('error');
    });

    await new Promise((resolve) => setTimeout(resolve, 1100));
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(2));

    expect(FakeEventSource.instances[1].url).toContain('last_event_id=42');
    expect(FakeEventSource.instances[1].url).toContain('stream_token=stream-token');
  });

  it('does not open a source when a pending token request finishes after disable', async () => {
    let resolveToken: (value: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => {
      resolveToken = resolve;
    }));
    const { rerender } = render(<Harness channel="trades" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    rerender(<Harness channel="trades" enabled={false} />);
    await act(async () => {
      resolveToken(new Response(JSON.stringify({ stream_token: 'late-stream-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
      await Promise.resolve();
    });

    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('resets the cursor on a server reset and renews it after token expiry', async () => {
    render(<Harness channel="trades" />);
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));

    const first = FakeEventSource.instances[0];
    act(() => {
      first.emit('trade_confirmed', { data: '{}', lastEventId: '42' });
      first.emit('reset');
    });
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(2));
    expect(FakeEventSource.instances[1].url).not.toContain('last_event_id');

    const second = FakeEventSource.instances[1];
    act(() => second.emit('auth_expired'));
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(3));
    expect(FakeEventSource.instances[2].url).toContain('stream_token=stream-token');
  });

  it('drops a pending source when the account scope changes', async () => {
    let resolveToken: (value: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => {
      resolveToken = resolve;
    }));
    const { rerender } = render(<Harness channel="trades" scopeKey="user-1:org-1" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    rerender(<Harness channel="trades" scopeKey="user-2:org-2" />);
    await act(async () => {
      resolveToken(new Response(JSON.stringify({ stream_token: 'old-stream-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
      await Promise.resolve();
    });
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    expect(FakeEventSource.instances[0].url).toContain('stream_token=stream-token');
    expect(FakeEventSource.instances[0].url).not.toContain('old-stream-token');
  });

  it('keeps public streams token-free', async () => {
    render(<Harness channel="prices" />);

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(FakeEventSource.instances[0].url).toBe('http://localhost:8000/api/stream/prices');
  });
});
