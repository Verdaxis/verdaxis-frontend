import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../services/api';
import { clearMarketSupportContextId, setMarketSupportContextId } from '../services/marketSupportContextStore';
import { setAccessToken } from '../services/authToken';

describe('market support API transport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    setAccessToken('access-token');
  });

  it('adds the opaque context header to scoped customer requests', async () => {
    setMarketSupportContextId('ctx-opaque-123');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));

    await api.orderbook.myOrders();

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(options?.headers).get('X-Verdaxis-Market-Support-Context')).toBe('ctx-opaque-123');
  });

  it('does not add the context header to auth or admin context lifecycle requests', async () => {
    setMarketSupportContextId('ctx-opaque-123');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));

    await api.marketSupport.capabilities();
    await api.marketSupport.active();

    for (const [, options] of vi.mocked(fetch).mock.calls) {
      expect(new Headers(options?.headers).get('X-Verdaxis-Market-Support-Context')).toBeNull();
    }
  });

  it('keeps the context header on the request retried after access-token refresh', async () => {
    setMarketSupportContextId('ctx-opaque-123');
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'refreshed-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    await api.orderbook.myOrders();

    const retry = vi.mocked(fetch).mock.calls[2][1];
    expect(new Headers(retry?.headers).get('Authorization')).toBe('Bearer refreshed-token');
    expect(new Headers(retry?.headers).get('X-Verdaxis-Market-Support-Context')).toBe('ctx-opaque-123');
  });

  it('aborts the refresh retry when the logical request context changes', async () => {
    setMarketSupportContextId('ctx-opaque-123');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('/auth/refresh')) {
        clearMarketSupportContextId();
        return new Response(JSON.stringify({ access_token: 'refreshed-token' }), { status: 200 });
      }
      return new Response('', { status: 401 });
    });

    await expect(api.orderbook.myOrders()).rejects.toMatchObject({
      name: 'AbortError',
      code: 'MARKET_SUPPORT_CONTEXT_CHANGED',
    });
    expect(vi.mocked(fetch).mock.calls.filter(([input]) => !String(input).includes('/auth/refresh'))).toHaveLength(1);
  });

  it('fails closed before network for non-allowlisted support mutations', async () => {
    setMarketSupportContextId('ctx-opaque-123');
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(api.trades.confirm('trade-1')).rejects.toMatchObject({
      status: 403,
      code: 'MARKET_SUPPORT_MUTATION_BLOCKED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires If-Match before cancelling in a support context', async () => {
    setMarketSupportContextId('ctx-opaque-123');
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(api.orderbook.cancel('listing-1', { reason: 'No longer needed' })).rejects.toMatchObject({
      status: 428,
      code: 'MARKET_SUPPORT_ETAG_REQUIRED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves status and structured code for invalid support responses', async () => {
    setMarketSupportContextId('ctx-opaque-123');
    const invalidation = vi.fn();
    window.addEventListener('verdaxis:market-support-context-invalidated', invalidation);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      detail: { code: 'MARKET_SUPPORT_CONTEXT_EXPIRED', message: 'Context expired' },
    }), { status: 410 }));

    const error = await api.orderbook.myOrders().catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 410, code: 'MARKET_SUPPORT_CONTEXT_EXPIRED', message: 'Context expired' });
    expect(invalidation).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ contextId: 'ctx-opaque-123' }) }));
    window.removeEventListener('verdaxis:market-support-context-invalidated', invalidation);
  });

  it('handles successful 204 responses without trying to parse JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api.orderbook.cancel('order-1')).resolves.toBeUndefined();
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/orderbook/order-1/cancel');
  });

  it('uses the backend context lifecycle contract', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'ctx-1' }), { status: 201 }));

    await api.marketSupport.start({
      organizationId: 'org-1',
      supportReference: 'CASE-1',
      scope: ['ORDER_CREATE', 'ORDER_CANCEL'],
      replaceActive: true,
    });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(options?.body))).toEqual({
      organization_id: 'org-1',
      support_reference: 'CASE-1',
      confirm_replacement: true,
    });
  });
});
