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

  it('records authenticated events without exposing failures to the caller', async () => {
    setAccessToken('activity-token');
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      throw new Error('collector unavailable');
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(() => api.activity.record({
      events: [{
        id: '548ae12e-d8dd-43c4-96cf-dbe581cd459f',
        action: 'market_view',
        page: 'marketplace',
        market_product: 'BIO_METHANOL',
        delivery_point_id: 'a9f46f75-51f7-4d31-9f36-32b525ab2f1f',
        availability_window: 'SPOT',
      }],
    })).not.toThrow();

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

  it('does not send account activity without an access token', () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    api.activity.record({
      events: [{ id: '548ae12e-d8dd-43c4-96cf-dbe581cd459f', action: 'page_view', page: 'home' }],
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
