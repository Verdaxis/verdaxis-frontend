import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../services/api';
import { setAccessToken } from '../services/authToken';
import { invalidateAllReads } from '../services/readCache';

beforeEach(() => {
  invalidateAllReads();
  setAccessToken('synthetic-session');
});
afterEach(() => vi.restoreAllMocks());

describe('bounded administrative reads', () => {
  it.each(['body', 'header'])('follows the %s continuation marker for invitation organizations', async marker => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ items: [{ id: 'org-a' }], truncated: marker === 'body' }, {
        headers: { 'X-Result-Truncated': String(marker === 'header') },
      }))
      .mockResolvedValueOnce(Response.json({ items: [{ id: 'org-b' }], truncated: false }));
    const result = await api.admin.invitationOrganizations();
    expect(result.items.map(item => item.id)).toEqual(['org-a', 'org-b']);
    const urls = fetchMock.mock.calls.map(call => new URL(String(call[0]), 'https://example.test'));
    expect(urls.map(url => url.searchParams.get('limit'))).toEqual(['100', '100']);
    expect(urls.map(url => url.searchParams.get('offset'))).toEqual(['0', '1']);
  });

  it('collects attention pages without discarding the response metadata', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ items: [{ email: 'a@example.test' }], generated_at: '2026-10-22', truncated: true }))
      .mockResolvedValueOnce(Response.json({ items: [{ email: 'b@example.test' }], truncated: false }));
    const result = await api.admin.onboardingAttention();
    expect(result.items.map(item => item.email)).toEqual(['a@example.test', 'b@example.test']);
    expect(result.generated_at).toBe('2026-10-22');
  });

  it('stops when a continuation response makes no progress', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ items: [], truncated: true }));
    await expect(api.admin.invitationOrganizations()).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops at the operator offset bound', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({
      items: Array.from({ length: 100 }, (_, id) => ({ id: String(id) })), truncated: true,
    }));
    await expect(api.admin.invitationOrganizations()).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(101);
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('offset=10000');
  });
});

describe('client error contracts', () => {
  it.each([
    [{ detail: { code: 'VESSEL_NOT_FOUND', message: 'Vessel unavailable' } }, 'VESSEL_NOT_FOUND', 'Vessel unavailable'],
    [{ detail: 'Vessel unavailable' }, null, 'Vessel unavailable'],
    [{ detail: [{ msg: 'Invalid vessel identifier' }] }, null, 'Invalid vessel identifier'],
  ])('reads the supported vessel error envelope %#', async (payload, code, message) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(payload, { status: 404 }));
    await expect(api.vessels.updateStatus('missing', 'At Sea')).rejects.toMatchObject({ status: 404, code, message });
  });

  it('keeps zero in audit parameters for server validation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ detail: { code: 'INVALID_QUERY', message: 'Limit must be positive' } }, { status: 422 }));
    await expect(api.admin.auditLogs({ limit: 0 })).rejects.toMatchObject({ status: 422, code: 'INVALID_QUERY' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('limit=0');
  });

  it('preserves subscription scope failures instead of manufacturing a free tier', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ detail: { code: 'ORGANIZATION_REQUIRED', message: 'Organization required' } }, { status: 403 }));
    await expect(api.subscriptions.me()).rejects.toMatchObject({ status: 403, code: 'ORGANIZATION_REQUIRED' });
  });
});
