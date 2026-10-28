import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, type User } from './AuthContext';
import { api, isAbortError } from '../services/api';
import { AUTH_IDENTITY_CHANGED_EVENT } from '../services/authToken';
import { isAbilitiesRouteMissing, parseAbilitiesResponse } from '../services/abilities';
import type { Ability, AbilityId, AbilityMap } from '../types/abilities';

/**
 * Server-driven abilities for the signed-in user (`GET /auth/me/abilities`).
 *
 * - `unknown`      nobody is signed in, or the first answer has not arrived.
 * - `ready`        the server answered and `abilities` is usable.
 * - `unavailable`  the request failed (403, network, 5xx). Retried on focus.
 * - `unsupported`  the backend has no such route, or answered a schema version
 *                  this client does not understand. Not retried until the
 *                  identity changes, because asking again cannot help.
 *
 * Only `ready` carries abilities. Every other status leaves the map empty, so
 * `useAbility` answers `undefined` and each screen keeps its existing behavior.
 */
export type AbilitiesStatus = 'unknown' | 'ready' | 'unavailable' | 'unsupported';

interface AbilitiesContextValue {
  status: AbilitiesStatus;
  abilities: AbilityMap;
  /** Fetch again now, ignoring the focus throttle. Use after a known account change. */
  refresh: () => Promise<void>;
}

const NO_ABILITIES: AbilityMap = new Map();

// Rendering without a provider (isolated component tests, public pages) behaves
// exactly like "abilities not loaded": every hint is unknown.
const AbilitiesContext = createContext<AbilitiesContextValue>({
  status: 'unknown',
  abilities: NO_ABILITIES,
  refresh: async () => undefined,
});

/**
 * Window focus or tab visibility triggers a refetch at most this often. The
 * organization, KYC and approval state change on the server (an administrator
 * approves the organization) with no push to the browser, so coming back to the
 * tab is the moment a stale hint is most likely to matter. One minute keeps the
 * extra load negligible while a returning user sees a corrected hint quickly.
 */
export const ABILITIES_FOCUS_REFRESH_INTERVAL_MS = 60_000;

interface AbilitiesState {
  /** The identity the abilities were fetched for. Prevents one user's hints showing for another. */
  subjectKey: string | null;
  status: AbilitiesStatus;
  abilities: AbilityMap;
}

const EMPTY_STATE: AbilitiesState = { subjectKey: null, status: 'unknown', abilities: NO_ABILITIES };

/**
 * Identifies "the same account in the same standing". Any profile field that
 * can change an ability is part of it, so a new organization, role, approval,
 * email verification, KYC or password-change flag refetches without a manual call.
 */
export function abilitiesSubjectKey(user: User | null): string | null {
  if (!user) return null;
  return [
    user.id,
    user.role ?? '',
    user.organization_id ?? '',
    user.status,
    user.email_verified ?? '',
    user.kyc_status ?? '',
    user.must_change_password ?? '',
  ].join('|');
}

export const AbilitiesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const subjectKey = abilitiesSubjectKey(user);
  const [state, setState] = useState<AbilitiesState>(EMPTY_STATE);
  // Bumped when the session ends or changes, so a fetch is forced even if the
  // next sign-in produces the same subject key as the one that was cleared.
  const [sessionEpoch, setSessionEpoch] = useState(0);

  // Only the newest request may write state; older answers are dropped.
  const latestRequest = useRef(0);
  const lastAttemptAt = useRef(0);
  const statusRef = useRef<AbilitiesStatus>('unknown');
  statusRef.current = state.subjectKey === subjectKey ? state.status : 'unknown';

  const load = useCallback(async (forSubject: string) => {
    const requestId = ++latestRequest.current;
    lastAttemptAt.current = Date.now();
    try {
      const abilities = parseAbilitiesResponse(await api.abilities.mine());
      if (requestId !== latestRequest.current) return;
      setState(abilities
        ? { subjectKey: forSubject, status: 'ready', abilities }
        : { subjectKey: forSubject, status: 'unsupported', abilities: NO_ABILITIES });
    } catch (error) {
      if (requestId !== latestRequest.current) return;
      // The auth session changed while the request was in flight. The session
      // events below reset the state and the subject effect fetches again.
      if (isAbortError(error)) return;
      setState({
        subjectKey: forSubject,
        status: isAbilitiesRouteMissing(error) ? 'unsupported' : 'unavailable',
        abilities: NO_ABILITIES,
      });
    }
  }, []);

  // Fetch after login and whenever the identity or its standing changes; clear on logout.
  useEffect(() => {
    latestRequest.current += 1;
    if (!subjectKey) {
      setState(EMPTY_STATE);
      return;
    }
    void load(subjectKey);
  }, [subjectKey, sessionEpoch, load]);

  // A logout, idle timeout, or identity change in this or another tab drops the
  // abilities at once and forces a fresh fetch for whoever signs in next.
  useEffect(() => {
    const resetForSessionChange = () => {
      latestRequest.current += 1;
      setState(EMPTY_STATE);
      setSessionEpoch((epoch) => epoch + 1);
    };
    window.addEventListener(AUTH_IDENTITY_CHANGED_EVENT, resetForSessionChange);
    window.addEventListener('verdaxis:auth-logout', resetForSessionChange);
    return () => {
      window.removeEventListener(AUTH_IDENTITY_CHANGED_EVENT, resetForSessionChange);
      window.removeEventListener('verdaxis:auth-logout', resetForSessionChange);
    };
  }, []);

  // Refresh when the user comes back to the tab, at most once per interval.
  useEffect(() => {
    if (!subjectKey) return undefined;
    const refreshIfStale = () => {
      if (document.visibilityState === 'hidden') return;
      if (statusRef.current === 'unsupported') return;
      if (Date.now() - lastAttemptAt.current < ABILITIES_FOCUS_REFRESH_INTERVAL_MS) return;
      void load(subjectKey);
    };
    window.addEventListener('focus', refreshIfStale);
    document.addEventListener('visibilitychange', refreshIfStale);
    return () => {
      window.removeEventListener('focus', refreshIfStale);
      document.removeEventListener('visibilitychange', refreshIfStale);
    };
  }, [subjectKey, load]);

  const refresh = useCallback(async () => {
    if (subjectKey) await load(subjectKey);
  }, [subjectKey, load]);

  const isCurrent = state.subjectKey === subjectKey;
  const value = useMemo<AbilitiesContextValue>(() => ({
    status: isCurrent ? state.status : 'unknown',
    abilities: isCurrent ? state.abilities : NO_ABILITIES,
    refresh,
  }), [isCurrent, state.status, state.abilities, refresh]);

  return <AbilitiesContext.Provider value={value}>{children}</AbilitiesContext.Provider>;
};

/** Raw access for code that needs the status or a manual refresh. Safe without a provider. */
export const useAbilities = (): AbilitiesContextValue => useContext(AbilitiesContext);

/**
 * What the server says about one action, or `undefined` while that is unknown
 * (not loaded, load failed, or the id is absent). `undefined` means "do not
 * decide from abilities": the caller keeps its existing behavior.
 */
export const useAbility = (action: AbilityId): Ability | undefined =>
  useContext(AbilitiesContext).abilities.get(action);
