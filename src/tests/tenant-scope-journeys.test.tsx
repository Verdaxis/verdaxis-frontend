import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../services/api';
import { setAccessToken } from '../services/authToken';
import { invalidateReadCache, setReadCachePrincipal } from '../services/readCache';

const wireVessel = (id: string, name: string, imo: string) => ({
  id, name, imo_number: imo, vessel_type: 'Bulk Carrier',
  eu_ets_status: 'Compliant', fueleu_status: 'Compliant', cii_rating: 'B',
});

beforeEach(() => {
  invalidateReadCache();
  setReadCachePrincipal(null, null);
  setAccessToken('synthetic-session');
});
afterEach(() => vi.restoreAllMocks());

describe('vessel reads keep the organization boundary', () => {
  it('maps an organization-scoped list to display fields', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json([wireVessel('vessel-own', 'Own Vessel', '9919475')]));
    const vessels = await api.vessels.list();
    expect(vessels.map(v => v.name)).toEqual(['Own Vessel']);
    // The display fields the map promises: no raw wire payload leaks through.
    expect(vessels[0]).toMatchObject({
      imo: '9919475', status: 'At Sea', complianceEUETS: 'Compliant', ciiGrade: 'B',
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/vessels');
  });

  it('carries the current session on every vessel read after a principal change', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      Response.json([wireVessel('vessel-next', 'Next Principal Vessel', '9919487')]));
    await api.vessels.list();
    // The principal changes (another account or organization boundary).
    setReadCachePrincipal('user-next', 'org-next');
    const vessels = await api.vessels.list();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(vessels.map(v => v.name)).toEqual(['Next Principal Vessel']);
  });

  it('propagates the unassigned-vessel refusal for a detail read', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      detail: { code: 'VESSEL_NOT_FOUND', message: 'Vessel unavailable' },
    }, { status: 404 }));
    await expect(api.vessels.updateStatus('vessel-foreign', 'At Sea')).rejects.toMatchObject({
      status: 404, code: 'VESSEL_NOT_FOUND',
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/vessels/vessel-foreign');
  });

  it('propagates the organization-less vessel refusal without inventing a result', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      detail: { code: 'ORGANIZATION_REQUIRED', message: 'Organization required' },
    }, { status: 403 }));
    await expect(api.vessels.updateStatus('vessel-own', 'At Sea')).rejects.toMatchObject({
      status: 403, code: 'ORGANIZATION_REQUIRED',
    });
  });
});

describe('profile and subscription reads follow the principal', () => {
  it('drops the cached subscription when the principal changes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      Response.json({ id: 'sub-1', org_id: 'org-1', tier: 'free', is_active: true }));
    // Prime the cache as the first principal.
    expect(await api.subscriptions.me()).toMatchObject({ tier: 'free' });
    // A scope transition (organization join or removal) must not let the next
    // principal read the previous principal's subscription.
    setReadCachePrincipal('user-next', null);
    await api.subscriptions.me();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a scope-less subscription read as a failure, not a free tier', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      detail: { code: 'ORGANIZATION_REQUIRED', message: 'Organization required' },
    }, { status: 403 }));
    await expect(api.subscriptions.me()).rejects.toBeInstanceOf(ApiError);
  });
});
