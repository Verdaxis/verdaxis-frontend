import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, isAbortError } from '../services/api';

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('product analytics API client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('builds canonical tab URLs and omits default parameters', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => okJson({ ok: true }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await api.productAnalytics.overview({
      start: '2026-06-01T00:00:00Z',
      end: '2026-07-01T00:00:00Z',
      compare: true,
      audience: 'ALL',
      activity: 'LIVE',
    });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/admin/analytics/product-analytics/overview?');
    expect(url).toContain('start=2026-06-01T00%3A00%3A00Z');
    expect(url).not.toContain('compare=');
    expect(url).not.toContain('audience=');
    expect(url).not.toContain('activity=');

    await api.productAnalytics.marketplace({
      start: '2026-06-01T00:00:00Z',
      end: '2026-07-01T00:00:00Z',
      compare: false,
      activity: 'ALL',
      availability_window: 'SPOT',
    });
    const marketplaceUrl = String(fetchMock.mock.calls[1][0]);
    expect(marketplaceUrl).toContain('/product-analytics/marketplace?');
    expect(marketplaceUrl).toContain('compare=false');
    expect(marketplaceUrl).toContain('activity=ALL');
    expect(marketplaceUrl).toContain('availability_window=SPOT');
  });

  it('rethrows a caller abort as a recognizable AbortError, not a timeout', async () => {
    global.fetch = ((input: RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      })) as unknown as typeof fetch;

    const controller = new AbortController();
    const pending = api.productAnalytics.retention(
      { start: '2026-06-01T00:00:00Z', end: '2026-07-01T00:00:00Z' },
      controller.signal,
    );
    const captured = pending.catch((error: unknown) => error);
    controller.abort();

    const error = await captured;
    expect(isAbortError(error)).toBe(true);
    expect(String((error as Error).message ?? error)).not.toContain('timed out');
  });

  it('surfaces the internal timeout as the user-facing timeout error', async () => {
    global.fetch = ((input: RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      })) as unknown as typeof fetch;

    const pending = api.productAnalytics.engagement({
      start: '2026-06-01T00:00:00Z',
      end: '2026-07-01T00:00:00Z',
    });
    const captured = pending.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(15001);

    const error = await captured;
    expect(isAbortError(error)).toBe(false);
    expect((error as Error).message).toContain('timed out');
  });

  it('a stale aborted request never resolves with data for the caller', async () => {
    let resolveFetch: ((response: Response) => void) | null = null;
    global.fetch = ((input: RequestInfo, init?: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        resolveFetch = resolve;
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      })) as unknown as typeof fetch;

    const controller = new AbortController();
    const pending = api.productAnalytics.acquisition(
      { start: '2026-06-01T00:00:00Z', end: '2026-07-01T00:00:00Z' },
      controller.signal,
    );
    const outcome = pending.then(
      () => 'resolved',
      (error: unknown) => (isAbortError(error) ? 'aborted' : 'errored'),
    );
    controller.abort();
    resolveFetch?.(okJson({ late: true }));

    expect(await outcome).toBe('aborted');
  });
});
