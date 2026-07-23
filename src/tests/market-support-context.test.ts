import { beforeEach, describe, expect, it } from 'vitest';
import {
  MARKET_SUPPORT_CONTEXT_STORAGE_KEY,
  clearMarketSupportContextId,
  getMarketSupportContextId,
  setMarketSupportContextId,
} from '../services/marketSupportContextStore';
import { normalizeMarketSupportSession, isAttachableMarketSupportSession } from '../context/MarketSupportContext';
import { defaultMarketSupportView } from '../types/marketSupport';

describe('market support context storage', () => {
  beforeEach(() => sessionStorage.clear());

  it('stores only the opaque context id in sessionStorage', () => {
    setMarketSupportContextId('ctx-opaque-123');

    expect(sessionStorage.getItem(MARKET_SUPPORT_CONTEXT_STORAGE_KEY)).toBe('ctx-opaque-123');
    expect(getMarketSupportContextId()).toBe('ctx-opaque-123');
  });

  it('clears the context id without leaving organization or identity data behind', () => {
    setMarketSupportContextId('ctx-opaque-123');
    clearMarketSupportContextId();

    expect(getMarketSupportContextId()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('normalizes the backend rich context response and keeps lifecycle metadata', () => {
    const session = normalizeMarketSupportSession({
      context_id: 'ctx-1',
      status: 'ACTIVE',
      version: 4,
      started_at: '2026-07-23T08:00:00.000Z',
      expires_at: '2099-07-23T09:00:00.000Z',
      support_reference: 'CASE-42',
      effective_organization: { organization_id: 'org-1', organization_name: 'Northstar Fuels', type: 'REAL' },
      admin: { user_id: 'admin-1', email: 'admin@example.com', name: 'Ravi Admin' },
      allowed_actions: ['ORDER_CREATE', 'ORDER_CANCEL'],
    });

    expect(session).toMatchObject({
      id: 'ctx-1', status: 'ACTIVE', version: 4, startedAt: '2026-07-23T08:00:00.000Z',
      organization: { id: 'org-1', name: 'Northstar Fuels' },
      actor: { id: 'admin-1' },
      scope: ['ORDER_CREATE', 'ORDER_CANCEL'],
    });
    expect(isAttachableMarketSupportSession(session, new Date('2026-07-23T08:30:00.000Z'))).toBe(true);
    expect(isAttachableMarketSupportSession({ ...session, status: 'EXPIRED' }, new Date('2026-07-23T08:30:00.000Z'))).toBe(false);
  });

  it('defaults a clear organization type to its matching assisted platform view', () => {
    expect(defaultMarketSupportView('FUEL_SUPPLIER')).toBe('SUPPLIER');
    expect(defaultMarketSupportView('fuel_buyer')).toBe('BUYER');
    expect(defaultMarketSupportView('FUEL_TRADER')).toBeNull();
  });
});
