import React from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TutorialProvider, useTutorial } from '../context/TutorialContext';
import { useServerPreference } from '../hooks/useServerPreference';

interface BooleanPreference {
  enabled: boolean;
}

const mocks = vi.hoisted(() => ({
  getAll: vi.fn<() => Promise<Record<string, unknown>>>(),
  put: vi.fn<(namespace: string, value: unknown) => Promise<void>>(),
  auth: {
    isAuthenticated: true,
    user: { id: 'user-1' },
  },
}));

vi.mock('../services/api', () => ({
  api: {
    preferences: {
      getAll: mocks.getAll,
      put: mocks.put,
    },
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

const STORAGE_KEY = 'test_server_pref';

const sanitizeBooleanPreference = (raw: unknown): BooleanPreference | null => {
  if (typeof raw !== 'object' || raw === null || !('enabled' in raw)) return null;
  const enabled = raw.enabled;
  return typeof enabled === 'boolean' ? { enabled } : null;
};

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

function TutorialProbe() {
  const { hasCompleted, isRunning } = useTutorial();
  return (
    <div>
      <div data-testid="completed">{String(hasCompleted)}</div>
      <div data-testid="running">{String(isRunning)}</div>
    </div>
  );
}

describe('useServerPreference', () => {
  let userIndex = 0;

  beforeEach(() => {
    userIndex += 1;
    vi.useRealTimers();
    localStorage.clear();
    mocks.getAll.mockReset();
    mocks.put.mockReset();
    mocks.getAll.mockResolvedValue({});
    mocks.put.mockResolvedValue();
    mocks.auth.isAuthenticated = true;
    mocks.auth.user = { id: `user-${userIndex}` };
  });

  it('lets the server value win over sanitized local cache', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: false }));
    mocks.getAll.mockResolvedValue({ feature: { enabled: true } });

    const { result } = renderHook(() => (
      useServerPreference('feature', STORAGE_KEY, sanitizeBooleanPreference, { enabled: false })
    ));

    expect(result.current[0]).toEqual({ enabled: false });

    await waitFor(() => {
      expect(result.current[0]).toEqual({ enabled: true });
    });

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')).toEqual({ enabled: true });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('migrates sanitized local cache when the server has no namespace', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: false }));
    mocks.getAll.mockResolvedValue({});

    renderHook(() => (
      useServerPreference('feature', STORAGE_KEY, sanitizeBooleanPreference, { enabled: true })
    ));

    await waitFor(() => {
      expect(mocks.put).toHaveBeenCalledWith('feature', { enabled: false });
    });
  });

  it('does not push plain defaults when there is no local cache', async () => {
    mocks.getAll.mockResolvedValue({});

    const { result } = renderHook(() => (
      useServerPreference('feature', STORAGE_KEY, sanitizeBooleanPreference, { enabled: true })
    ));

    await flushPromises();
    expect(mocks.getAll).toHaveBeenCalledTimes(1);

    expect(result.current[0]).toEqual({ enabled: true });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('collapses rapid writes into one debounced PUT', async () => {
    vi.useFakeTimers();
    mocks.getAll.mockResolvedValue({});

    const { result } = renderHook(() => (
      useServerPreference('feature', STORAGE_KEY, sanitizeBooleanPreference, { enabled: true })
    ));

    await flushPromises();
    expect(mocks.getAll).toHaveBeenCalledTimes(1);

    act(() => {
      result.current[1]({ enabled: false });
      result.current[1]({ enabled: true });
      result.current[1]({ enabled: false });
    });

    expect(result.current[0]).toEqual({ enabled: false });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')).toEqual({ enabled: false });

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(mocks.put).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put).toHaveBeenCalledWith('feature', { enabled: false });
  });

  it('makes zero API calls while unauthenticated', async () => {
    vi.useFakeTimers();
    mocks.auth.isAuthenticated = false;
    mocks.auth.user = null;

    const { result } = renderHook(() => (
      useServerPreference('feature', STORAGE_KEY, sanitizeBooleanPreference, { enabled: true })
    ));

    act(() => {
      result.current[1]({ enabled: false });
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(mocks.getAll).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(result.current[0]).toEqual({ enabled: false });
  });

  it('keeps state and local cache intact when a debounced PUT fails', async () => {
    vi.useFakeTimers();
    mocks.put.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => (
      useServerPreference('feature', STORAGE_KEY, sanitizeBooleanPreference, { enabled: true })
    ));

    await flushPromises();
    expect(mocks.getAll).toHaveBeenCalledTimes(1);

    act(() => {
      result.current[1]({ enabled: false });
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(result.current[0]).toEqual({ enabled: false });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')).toEqual({ enabled: false });
  });

  it('ignores corrupt server values and falls back to sanitized local cache', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: false }));
    mocks.getAll.mockResolvedValue({ feature: { enabled: 'yes' } });

    const { result } = renderHook(() => (
      useServerPreference('feature', STORAGE_KEY, sanitizeBooleanPreference, { enabled: true })
    ));

    expect(result.current[0]).toEqual({ enabled: false });

    await waitFor(() => {
      expect(mocks.getAll).toHaveBeenCalledTimes(1);
    });

    expect(result.current[0]).toEqual({ enabled: false });
    expect(mocks.put).not.toHaveBeenCalled();
  });
});

describe('TutorialContext server preference adoption', () => {
  let userIndex = 100;

  beforeEach(() => {
    userIndex += 1;
    localStorage.clear();
    mocks.getAll.mockReset();
    mocks.put.mockReset();
    mocks.getAll.mockResolvedValue({ tutorial: { completed: true } });
    mocks.put.mockResolvedValue();
    mocks.auth.isAuthenticated = true;
    mocks.auth.user = { id: `tutorial-user-${userIndex}` };
  });

  it('does not relaunch the tutorial on a fresh device when the server says it is completed', async () => {
    render(
      <TutorialProvider>
        <TutorialProbe />
      </TutorialProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('completed').textContent).toBe('true');
    });

    expect(screen.getByTestId('running').textContent).toBe('false');
  });
});
