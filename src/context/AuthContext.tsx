import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../services/config';
import {
    AUTH_IDENTITY_CHANGED_EVENT,
    clearAccessToken,
    getAccessToken,
    getAuthGeneration,
    refreshSession,
    setAccessToken,
} from '../services/authToken';
import { BACKEND_UNAVAILABLE_EVENT, isBackendUnavailableStatus } from '../services/backendAvailability';
import { analytics, reliability } from '../services/analytics';
import { setReadCachePrincipal } from '../services/readCache';

type UserRole = 'BUYER' | 'SUPPLIER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole | null;
  organization_id?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  email_verified?: boolean;
  kyc_status?: string;
  must_change_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (accessToken: string, profile?: unknown) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
  isBackendUnavailable: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Decode JWT payload without verifying (client-side only). */
function parseJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

function parseUserProfile(value: unknown): User | null {
  if (!value || typeof value !== 'object') return null;
  const profile = value as Record<string, unknown>;
  const role = profile.role;
  const status = profile.status;
  if (
    typeof profile.id !== 'string'
    || typeof profile.email !== 'string'
    || (profile.first_name !== null && typeof profile.first_name !== 'string')
    || (profile.last_name !== null && typeof profile.last_name !== 'string')
    || (role !== null && role !== 'BUYER' && role !== 'SUPPLIER' && role !== 'ADMIN')
    || (status !== 'PENDING' && status !== 'APPROVED' && status !== 'REJECTED')
    || (profile.organization_id !== null && typeof profile.organization_id !== 'string')
    || (profile.must_change_password !== undefined && typeof profile.must_change_password !== 'boolean')
  ) {
    return null;
  }
  return profile as unknown as User;
}

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 min before expiry
const AUTH_REQUEST_TIMEOUT_MS = 15000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(getAccessToken());
    const [isLoading, setIsLoading] = useState(true);
    const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);
    const [initialUrlAuth] = useState(() => {
        if (typeof window === 'undefined') return { token: null, refresh: null };
        const params = new URLSearchParams(window.location.search);
        return {
            token: params.get('token'),
            refresh: params.get('refresh'),
        };
    });
    // Auth checks flip maintenance state through this helper so every
    // backend-unavailable observation also emits the deduplicated
    // reliability event (Product Analytics plan §2.5).
    const markBackendUnavailable = useCallback(() => {
        reliability.reportBackendUnavailable();
        setIsBackendUnavailable(true);
    }, []);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTokens = useCallback(() => {
        clearAccessToken();
        setReadCachePrincipal(null, null);
        sessionStorage.removeItem('verdaxis_currentPage');
        sessionStorage.removeItem('verdaxis_viewMode');
        window.dispatchEvent(new CustomEvent('verdaxis:auth-logout'));
        setToken(null);
        setUser(null);
        setIsLoading(false);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }, []);

    const applyAccessToken = useCallback((nextToken: string) => {
        setAccessToken(nextToken);
        setToken(nextToken);
    }, []);

    const applyUserProfile = useCallback((nextUser: User) => {
        setReadCachePrincipal(nextUser.id, nextUser.organization_id ?? null);
        setUser(nextUser);
    }, []);

    const logout = useCallback(() => {
        void fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        }).catch(() => undefined);
        clearTokens();
    }, [clearTokens]);

    // --- Token refresh ---
    const scheduleRefresh = useCallback((accessToken: string) => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

        const exp = parseJwtExp(accessToken);
        if (!exp) return;

        const msUntilExpiry = exp * 1000 - Date.now();
        const refreshIn = Math.max(msUntilExpiry - REFRESH_BUFFER_MS, 1000);

        refreshTimerRef.current = setTimeout(async () => {
            try {
                const outcome = await refreshSession();
                if (outcome.status === 'unavailable') {
                    markBackendUnavailable();
                    return;
                }
                if (outcome.status === 'superseded') return;
                if (outcome.status === 'identity_changed') return;
                if (outcome.status === 'denied') {
                    logout();
                    return;
                }

                setIsBackendUnavailable(false);
                applyAccessToken(outcome.token);
                scheduleRefresh(outcome.token);
            } catch {
                markBackendUnavailable();
            }
        }, refreshIn);
    }, [applyAccessToken, logout]);

    // --- Idle timeout ---
    const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (!token) return;

        idleTimerRef.current = setTimeout(() => {
            logout();
        }, IDLE_TIMEOUT_MS);
    }, [token, logout]);

    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
        resetIdleTimer();
        return () => {
            events.forEach(e => window.removeEventListener(e, resetIdleTimer));
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [resetIdleTimer]);

    // --- Login ---
    const login = useCallback(async (accessToken: string, initialProfile?: unknown) => {
        applyAccessToken(accessToken);
        setReadCachePrincipal(null, null);
        setUser(null);
        const requestGeneration = getAuthGeneration();
        scheduleRefresh(accessToken);
        const profile = parseUserProfile(initialProfile);
        if (profile) {
            if (requestGeneration !== getAuthGeneration()) return;
            setIsBackendUnavailable(false);
            applyUserProfile(profile);
            if (profile.role) analytics.track('login_succeeded', { role: profile.role });
            setIsLoading(false);
            return;
        }
        // Fetch user profile so isAuthenticated becomes true immediately
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
                signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
            });
            if (requestGeneration !== getAuthGeneration()) return;
            if (res.ok) {
                setIsBackendUnavailable(false);
                const userData: User = await res.json();
                if (requestGeneration !== getAuthGeneration()) return;
                applyUserProfile(userData);
                if (userData.role) analytics.track('login_succeeded', { role: userData.role });
            } else if (isBackendUnavailableStatus(res.status)) {
                markBackendUnavailable();
            }
        } catch {
            if (requestGeneration === getAuthGeneration()) markBackendUnavailable();
        }
        finally {
            if (requestGeneration === getAuthGeneration()) setIsLoading(false);
        }
    }, [applyAccessToken, applyUserProfile, scheduleRefresh]);

    // --- Check auth on mount / token change ---
    const checkAuth = useCallback(async () => {
        setIsLoading(true);
        let requestGeneration = getAuthGeneration();
        const currentToken = getAccessToken();
        if (!currentToken) {
            try {
                const outcome = await refreshSession({ allowIdentityRestore: true });
                if (outcome.status === 'unavailable') {
                    markBackendUnavailable();
                    return;
                }
                if (outcome.status === 'superseded') return;
                if (outcome.status === 'identity_changed') return;
                if (outcome.status === 'denied') {
                    setIsBackendUnavailable(false);
                    clearTokens();
                    return;
                }

                setIsBackendUnavailable(false);
                applyAccessToken(outcome.token);
                requestGeneration = getAuthGeneration();
                scheduleRefresh(outcome.token);

                const userRes = await fetch(`${API_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${outcome.token}` },
                    signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
                });
                if (requestGeneration !== getAuthGeneration()) return;
                if (userRes.ok) {
                    setIsBackendUnavailable(false);
                    const userData = await userRes.json();
                    if (requestGeneration !== getAuthGeneration()) return;
                    applyUserProfile(userData);
                } else if (isBackendUnavailableStatus(userRes.status)) {
                    markBackendUnavailable();
                } else {
                    setIsBackendUnavailable(false);
                    clearTokens();
                }
            } catch (err) {
                console.error('Error refreshing auth session:', err);
                if (requestGeneration === getAuthGeneration()) markBackendUnavailable();
            } finally {
                if (requestGeneration === getAuthGeneration()) setIsLoading(false);
            }
            return;
        }

        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${currentToken}` },
                signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
            });
            if (requestGeneration !== getAuthGeneration()) return;

            if (res.ok) {
                setIsBackendUnavailable(false);
                const userData = await res.json();
                if (requestGeneration !== getAuthGeneration()) return;
                applyUserProfile(userData);
                scheduleRefresh(currentToken);
            } else if (isBackendUnavailableStatus(res.status)) {
                markBackendUnavailable();
            } else if (res.status === 401) {
                // Try refresh before giving up
                const outcome = await refreshSession();
                if (outcome.status === 'unavailable') {
                    markBackendUnavailable();
                } else if (outcome.status === 'superseded') {
                    return;
                } else if (outcome.status === 'identity_changed') {
                    return;
                } else if (outcome.status === 'success') {
                    setIsBackendUnavailable(false);
                    applyAccessToken(outcome.token);
                    requestGeneration = getAuthGeneration();
                    const userRes = await fetch(`${API_URL}/auth/me`, {
                        headers: { 'Authorization': `Bearer ${outcome.token}` },
                        signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
                    });
                    if (requestGeneration !== getAuthGeneration()) return;
                    if (userRes.ok) {
                        setIsBackendUnavailable(false);
                        const userData = await userRes.json();
                        if (requestGeneration !== getAuthGeneration()) return;
                        applyUserProfile(userData);
                        scheduleRefresh(outcome.token);
                    } else if (isBackendUnavailableStatus(userRes.status)) {
                        markBackendUnavailable();
                    } else {
                        setIsBackendUnavailable(false);
                        clearTokens();
                    }
                } else {
                    setIsBackendUnavailable(false);
                    clearTokens();
                }
            } else {
                setIsBackendUnavailable(false);
            }
        } catch (err) {
            console.error('Error fetching user profile:', err);
            if (requestGeneration === getAuthGeneration()) markBackendUnavailable();
        } finally {
            if (requestGeneration === getAuthGeneration()) setIsLoading(false);
        }
    }, [applyAccessToken, applyUserProfile, scheduleRefresh, clearTokens]);

    useEffect(() => {
        const handleIdentityChanged = () => clearTokens();
        window.addEventListener(AUTH_IDENTITY_CHANGED_EVENT, handleIdentityChanged);
        return () => window.removeEventListener(AUTH_IDENTITY_CHANGED_EVENT, handleIdentityChanged);
    }, [clearTokens]);

    useEffect(() => {
        const handleBackendUnavailable = () => setIsBackendUnavailable(true);
        window.addEventListener(BACKEND_UNAVAILABLE_EVENT, handleBackendUnavailable);
        return () => window.removeEventListener(BACKEND_UNAVAILABLE_EVENT, handleBackendUnavailable);
    }, []);

    // Capture tokens from OAuth redirect URL params
    useEffect(() => {
        if (typeof window === 'undefined') {
            setIsLoading(false);
            return;
        }
        const urlToken = initialUrlAuth.token;
        const urlRefresh = initialUrlAuth.refresh;
        if (urlToken) {
            // Clean URL params
            window.history.replaceState({}, '', window.location.pathname);
            login(urlToken, urlRefresh || undefined);
        } else {
            checkAuth();
        }
    }, []);

    const value = {
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        checkAuth,
        isBackendUnavailable,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
