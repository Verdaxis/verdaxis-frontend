import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { useMarketSupport } from '../context/MarketSupportContext';
import { api } from '../services/api';
import type { ViewMode } from '../types';
import {
  DASHBOARD_PREFERENCE_NAMESPACE,
  defaultLayout,
  fitsBackendLimits,
  sanitizeLayout,
  toStoredLayout,
  type DashboardLayout,
} from '../utils/dashboardLayout';
import { loadAllPreferences, updateCachedPreference } from './useServerPreference';

/**
 * Why the layout in use is not (or may not be) the server copy:
 * - `read-failed`: the saved layout could not be read, so the default is shown;
 * - `save-failed`: the last save failed (for example a backend without the
 *   `dashboard` namespace answers 404), so edits live in memory for this visit.
 */
export type DashboardLayoutNotice = 'read-failed' | 'save-failed' | null;

export type DashboardSaveResult = 'saved' | 'memory-only';

export interface DashboardLayoutState {
  /** True until the saved layout was read (or the read failed). */
  loading: boolean;
  /** The layout to show: the saved one, an in-memory edit, or the default. */
  layout: DashboardLayout;
  /** The default for this view mode (target of "Reset to default"). */
  defaultLayout: DashboardLayout;
  notice: DashboardLayoutNotice;
  dismissNotice: () => void;
  /** Customizing is off while an administrator acts for another organization. */
  canCustomize: boolean;
  save: (layout: DashboardLayout) => Promise<DashboardSaveResult>;
}

/**
 * Loads and saves the home layout in the `dashboard` preference namespace.
 *
 * This is deliberately not `useServerPreference`: that hook keeps a
 * device-local copy and saves silently after a delay. A layout needs an explicit
 * Save whose outcome the user sees, and no local copy that could outlive the
 * server's. It does share that hook's one-per-session preference read.
 *
 * Failure never blocks the page: if the read fails, or the backend refuses the
 * namespace, the default layout is used and edits stay in memory.
 */
export const useDashboardLayout = (viewMode: ViewMode): DashboardLayoutState => {
  const { isAuthenticated, user } = useAuth();
  const { isActive: isMarketSupportActive } = useMarketSupport();
  const userId = user?.id ?? 'authenticated';
  const usesServer = isAuthenticated && !isMarketSupportActive;

  const [loading, setLoading] = useState(usesServer);
  const [stored, setStored] = useState<DashboardLayout | null>(null);
  const [notice, setNotice] = useState<DashboardLayoutNotice>(null);
  const fallback = useMemo(() => defaultLayout(viewMode), [viewMode]);

  useEffect(() => {
    let cancelled = false;
    setStored(null);
    setNotice(null);
    if (!usesServer) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    // `loadAllPreferences` can throw before it returns a promise (no API client).
    Promise.resolve()
      .then(() => loadAllPreferences(userId))
      .then((preferences) => {
        if (cancelled) return;
        setStored(sanitizeLayout(preferences[DASHBOARD_PREFERENCE_NAMESPACE]));
      })
      .catch(() => {
        if (!cancelled) setNotice('read-failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [usesServer, userId]);

  const save = useCallback(async (next: DashboardLayout): Promise<DashboardSaveResult> => {
    // The edit applies at once, whether or not the server keeps it.
    setStored(next);
    if (!usesServer || !fitsBackendLimits(next)) {
      setNotice('save-failed');
      return 'memory-only';
    }
    const body = toStoredLayout(next);
    try {
      await api.preferences.put(DASHBOARD_PREFERENCE_NAMESPACE, body);
      updateCachedPreference(userId, DASHBOARD_PREFERENCE_NAMESPACE, body);
      setNotice(null);
      return 'saved';
    } catch {
      setNotice('save-failed');
      return 'memory-only';
    }
  }, [usesServer, userId]);

  const dismissNotice = useCallback(() => setNotice(null), []);

  return {
    loading,
    layout: stored ?? fallback,
    defaultLayout: fallback,
    notice,
    dismissNotice,
    canCustomize: !isMarketSupportActive,
    save,
  };
};
