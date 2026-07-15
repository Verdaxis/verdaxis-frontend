import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../services/analytics', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/analytics')>();
  return {
    ...original,
    reliability: {
      reportFrontendError: vi.fn(),
      reportBackendUnavailable: vi.fn(),
      reportNavigationPerformance: vi.fn(),
    },
  };
});

import { reliability } from '../services/analytics';
import {
  BACKEND_UNAVAILABLE_EVENT,
  isBackendUnavailableStatus,
  notifyBackendUnavailable,
} from '../services/backendAvailability';

describe('backend availability signalling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('classifies only gateway statuses as backend-unavailable', () => {
    expect(isBackendUnavailableStatus(502)).toBe(true);
    expect(isBackendUnavailableStatus(503)).toBe(true);
    expect(isBackendUnavailableStatus(504)).toBe(true);
    expect(isBackendUnavailableStatus(500)).toBe(false);
    expect(isBackendUnavailableStatus(404)).toBe(false);
    expect(isBackendUnavailableStatus(401)).toBe(false);
  });

  it('dispatches the maintenance event and reports reliability telemetry', () => {
    const listener = vi.fn();
    window.addEventListener(BACKEND_UNAVAILABLE_EVENT, listener);
    try {
      notifyBackendUnavailable('health check failed');
    } finally {
      window.removeEventListener(BACKEND_UNAVAILABLE_EVENT, listener);
    }

    expect(listener).toHaveBeenCalledTimes(1);
    expect(reliability.reportBackendUnavailable).toHaveBeenCalledTimes(1);
  });

  it('keeps the maintenance event working even when telemetry throws', () => {
    (reliability.reportBackendUnavailable as Mock).mockImplementation(() => {
      throw new Error('collector blocked');
    });
    const listener = vi.fn();
    window.addEventListener(BACKEND_UNAVAILABLE_EVENT, listener);
    try {
      expect(() => notifyBackendUnavailable()).not.toThrow();
    } finally {
      window.removeEventListener(BACKEND_UNAVAILABLE_EVENT, listener);
    }
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
