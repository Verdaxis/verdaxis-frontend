import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { clearAccessToken, setAccessToken } from '../services/authToken';

describe('authenticated API session races', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken('old-account');
  });

  afterEach(() => {
    clearAccessToken();
  });

  it('does not refresh or retry an old POST after an account switch', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (!String(input).includes('/auth/refresh')) {
        setAccessToken('new-account');
      }
      return new Response(JSON.stringify({ detail: 'unauthorized' }), { status: 401 });
    });

    await expect(api.feedback.submit('old account request')).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('/auth/refresh');
  });

  it('does not return a response body completed after an account switch', async () => {
    let resolveBody!: (body: unknown) => void;
    const body = new Promise<unknown>((resolve) => {
      resolveBody = resolve;
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => body,
      text: async () => '',
    } as Response);

    const request = api.orderbook.myOrders();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    setAccessToken('new-account');
    resolveBody([{ id: 'old-account-data' }]);

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});
