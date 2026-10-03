import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';
import { clearAccessToken, setAccessToken } from '../services/authToken';

const okJson = (body: unknown) => new Response(JSON.stringify(body), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
});

describe('activity API client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    vi.useRealTimers();
    clearAccessToken();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('builds the bounded admin activity query', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      okJson({ items: [], has_more: false, last_activity_at: null }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await api.admin.userActivity('user/id', {
      days: 90,
      kind: 'business',
      limit: 50,
      offset: 100,
    });

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/admin/users/user%2Fid/activity?days=90&kind=business&limit=50&offset=100',
    );
  });

  it('classifies a network failure as retryable without throwing', async () => {
    setAccessToken('activity-token');
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      throw new Error('collector unavailable');
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(api.activity.record({
      events: [{
        id: '548ae12e-d8dd-43c4-96cf-dbe581cd459f',
        action: 'market_view',
        page: 'marketplace',
        market_product: 'BIO_METHANOL',
        delivery_point_id: 'a9f46f75-51f7-4d31-9f36-32b525ab2f1f',
        availability_window: 'SPOT',
      }],
    })).resolves.toBe('retryable');

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, options] = fetchMock.mock.calls[0];
    expect(options).toMatchObject({ method: 'POST', keepalive: true });
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer activity-token');
    expect(JSON.parse(String(options?.body))).toEqual({
      events: [{
        id: '548ae12e-d8dd-43c4-96cf-dbe581cd459f',
        action: 'market_view',
        page: 'marketplace',
        market_product: 'BIO_METHANOL',
        delivery_point_id: 'a9f46f75-51f7-4d31-9f36-32b525ab2f1f',
        availability_window: 'SPOT',
      }],
    });
  });

  it('checks HTTP status before reporting accepted delivery', async () => {
    setAccessToken('activity-token');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 422 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const input = {
      events: [{ id: '548ae12e-d8dd-43c4-96cf-dbe581cd459f', action: 'page_view' as const, page: 'home' }],
    };

    await expect(api.activity.record(input)).resolves.toBe('retryable');
    await expect(api.activity.record(input)).resolves.toBe('rejected');
    await expect(api.activity.record(input)).resolves.toBe('accepted');
  });

  it('classifies a hung activity request as retryable after five seconds', async () => {
    vi.useFakeTimers();
    setAccessToken('activity-token');
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const delivery = api.activity.record({
      events: [{ id: '548ae12e-d8dd-43c4-96cf-dbe581cd459f', action: 'page_view', page: 'home' }],
    });
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(delivery).resolves.toBe('retryable');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true);
  });

  it('does not send account activity without an access token', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(api.activity.record({
      events: [{ id: '548ae12e-d8dd-43c4-96cf-dbe581cd459f', action: 'page_view', page: 'home' }],
    })).resolves.toBe('rejected');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
