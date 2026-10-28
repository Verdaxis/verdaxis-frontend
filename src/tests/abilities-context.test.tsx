import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ABILITIES_FOCUS_REFRESH_INTERVAL_MS,
  AbilitiesProvider,
  abilitiesSubjectKey,
  useAbilities,
  useAbility,
} from '../context/AbilitiesContext';
import { ApiError } from '../services/api';
import { AUTH_IDENTITY_CHANGED_EVENT } from '../services/authToken';
import { abilitiesPayload } from './abilities-fixtures';

const { mineMock, authState } = vi.hoisted(() => ({
  mineMock: vi.fn(),
  authState: { user: null as Record<string, unknown> | null },
}));

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  api: { abilities: { mine: mineMock } },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}));

const buyer = {
  id: 'user-1',
  email: 'buyer@example.com',
  role: 'BUYER',
  organization_id: 'org-1',
  status: 'APPROVED',
  email_verified: true,
};

function Probe() {
  const { status } = useAbilities();
  const bid = useAbility('place_bid_order');
  const ask = useAbility('place_ask_order');
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="bid">{bid ? String(bid.allowed) : 'unknown'}</div>
      <div data-testid="ask">{ask ? `${ask.allowed}:${ask.reasonCode}` : 'unknown'}</div>
    </div>
  );
}

const renderProbe = () => render(<AbilitiesProvider><Probe /></AbilitiesProvider>);
const rerenderProbe = (view: ReturnType<typeof render>) => view.rerender(<AbilitiesProvider><Probe /></AbilitiesProvider>);
const status = () => screen.getByTestId('status').textContent;

describe('AbilitiesProvider', () => {
  beforeEach(() => {
    mineMock.mockReset();
    authState.user = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call the server while nobody is signed in', async () => {
    renderProbe();

    expect(status()).toBe('unknown');
    expect(mineMock).not.toHaveBeenCalled();
  });

  it('fetches once after authentication and exposes allowed and denied abilities', async () => {
    mineMock.mockResolvedValue(abilitiesPayload({ place_ask_order: { code: 'SUPPLIER_ROLE_REQUIRED' } }));
    authState.user = buyer;

    renderProbe();

    await waitFor(() => expect(status()).toBe('ready'));
    expect(screen.getByTestId('bid').textContent).toBe('true');
    expect(screen.getByTestId('ask').textContent).toBe('false:SUPPLIER_ROLE_REQUIRED');
    expect(mineMock).toHaveBeenCalledTimes(1);
  });

  it('answers undefined while the first request is still pending', () => {
    mineMock.mockReturnValue(new Promise(() => undefined));
    authState.user = buyer;

    renderProbe();

    expect(status()).toBe('unknown');
    expect(screen.getByTestId('bid').textContent).toBe('unknown');
  });

  it.each([
    ['403 (password change required)', new ApiError('Password change required.', 403)],
    ['a network failure', new TypeError('Failed to fetch')],
    ['a server error', new ApiError('Bad gateway', 502)],
  ])('falls back to unknown hints after %s', async (_label, failure) => {
    mineMock.mockRejectedValue(failure);
    authState.user = buyer;

    renderProbe();

    await waitFor(() => expect(status()).toBe('unavailable'));
    expect(screen.getByTestId('bid').textContent).toBe('unknown');
    expect(screen.getByTestId('ask').textContent).toBe('unknown');
  });

  it('treats a missing route (older backend) as unsupported', async () => {
    mineMock.mockRejectedValue(new ApiError('Not Found', 404));
    authState.user = buyer;

    renderProbe();

    await waitFor(() => expect(status()).toBe('unsupported'));
    expect(screen.getByTestId('bid').textContent).toBe('unknown');
  });

  it('treats an unknown schema version as unsupported and ignores its rows', async () => {
    mineMock.mockResolvedValue(abilitiesPayload({ place_bid_order: { code: 'ADMIN_CANNOT_EXECUTE' } }, { schema_version: 2 }));
    authState.user = buyer;

    renderProbe();

    await waitFor(() => expect(status()).toBe('unsupported'));
    expect(screen.getByTestId('bid').textContent).toBe('unknown');
  });

  it('refetches when the organization or standing of the same user changes', async () => {
    mineMock.mockResolvedValueOnce(abilitiesPayload({ place_bid_order: { code: 'ORGANIZATION_NOT_APPROVED' } }));
    mineMock.mockResolvedValueOnce(abilitiesPayload());
    authState.user = { ...buyer, organization_id: null };
    const view = renderProbe();
    await waitFor(() => expect(screen.getByTestId('bid').textContent).toBe('false'));

    authState.user = { ...buyer, organization_id: 'org-2' };
    rerenderProbe(view);

    // One user's hints are never shown for the changed identity while the new answer loads.
    expect(screen.getByTestId('bid').textContent).toBe('unknown');
    await waitFor(() => expect(screen.getByTestId('bid').textContent).toBe('true'));
    expect(mineMock).toHaveBeenCalledTimes(2);
  });

  it('clears abilities on logout and fetches again for the next user', async () => {
    mineMock.mockResolvedValue(abilitiesPayload());
    authState.user = buyer;
    const view = renderProbe();
    await waitFor(() => expect(status()).toBe('ready'));

    authState.user = null;
    rerenderProbe(view);
    expect(status()).toBe('unknown');
    expect(screen.getByTestId('bid').textContent).toBe('unknown');

    authState.user = { ...buyer, id: 'user-2' };
    rerenderProbe(view);
    await waitFor(() => expect(status()).toBe('ready'));
    expect(mineMock).toHaveBeenCalledTimes(2);
  });

  it('drops abilities and refetches on AUTH_IDENTITY_CHANGED_EVENT even when the profile is unchanged', async () => {
    mineMock.mockResolvedValueOnce(abilitiesPayload({ place_ask_order: { code: 'SUPPLIER_ROLE_REQUIRED' } }));
    mineMock.mockResolvedValueOnce(abilitiesPayload());
    authState.user = buyer;
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('ask').textContent).toBe('false:SUPPLIER_ROLE_REQUIRED'));

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_IDENTITY_CHANGED_EVENT));
    });

    await waitFor(() => expect(screen.getByTestId('ask').textContent).toBe('true:null'));
    expect(mineMock).toHaveBeenCalledTimes(2);
  });

  it('ignores a response that arrives after the session was cleared', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    mineMock.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }));
    authState.user = buyer;
    const view = renderProbe();

    authState.user = null;
    rerenderProbe(view);
    await act(async () => {
      resolveFirst(abilitiesPayload());
    });

    expect(status()).toBe('unknown');
    expect(screen.getByTestId('bid').textContent).toBe('unknown');
  });

  describe('refresh on focus', () => {
    const focusWindow = () => act(() => { window.dispatchEvent(new Event('focus')); });

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-28T10:00:00Z'));
    });

    it('refetches on focus only after the minimum interval has passed', async () => {
      mineMock.mockResolvedValue(abilitiesPayload());
      authState.user = buyer;
      renderProbe();
      await waitFor(() => expect(status()).toBe('ready'));
      expect(mineMock).toHaveBeenCalledTimes(1);

      vi.setSystemTime(Date.now() + ABILITIES_FOCUS_REFRESH_INTERVAL_MS - 1_000);
      focusWindow();
      expect(mineMock).toHaveBeenCalledTimes(1);

      vi.setSystemTime(Date.now() + 2_000);
      focusWindow();
      await waitFor(() => expect(mineMock).toHaveBeenCalledTimes(2));
    });

    it('retries after a failure on the next focus past the interval', async () => {
      mineMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      mineMock.mockResolvedValueOnce(abilitiesPayload());
      authState.user = buyer;
      renderProbe();
      await waitFor(() => expect(status()).toBe('unavailable'));

      vi.setSystemTime(Date.now() + ABILITIES_FOCUS_REFRESH_INTERVAL_MS + 1_000);
      focusWindow();

      await waitFor(() => expect(status()).toBe('ready'));
    });

    it('does not keep asking an older backend that has no abilities route', async () => {
      mineMock.mockRejectedValue(new ApiError('Not Found', 404));
      authState.user = buyer;
      renderProbe();
      await waitFor(() => expect(status()).toBe('unsupported'));

      vi.setSystemTime(Date.now() + ABILITIES_FOCUS_REFRESH_INTERVAL_MS * 5);
      focusWindow();

      expect(mineMock).toHaveBeenCalledTimes(1);
    });

    it('does not fetch on focus when nobody is signed in', () => {
      renderProbe();
      vi.setSystemTime(Date.now() + ABILITIES_FOCUS_REFRESH_INTERVAL_MS * 2);
      focusWindow();

      expect(mineMock).not.toHaveBeenCalled();
    });
  });
});

describe('useAbility without a provider', () => {
  it('answers undefined so every screen keeps its existing behavior', () => {
    render(<Probe />);

    expect(status()).toBe('unknown');
    expect(screen.getByTestId('bid').textContent).toBe('unknown');
  });
});

describe('abilitiesSubjectKey', () => {
  it('is null without a user and changes with every field that can change an ability', () => {
    expect(abilitiesSubjectKey(null)).toBeNull();
    const base = { ...buyer } as never;
    const key = abilitiesSubjectKey(base);
    for (const change of [
      { role: 'SUPPLIER' },
      { organization_id: 'org-9' },
      { status: 'PENDING' },
      { email_verified: false },
      { kyc_status: 'REJECTED' },
      { must_change_password: true },
    ]) {
      expect(abilitiesSubjectKey({ ...buyer, ...change } as never)).not.toBe(key);
    }
  });
});
