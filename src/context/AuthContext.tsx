import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../services/config';
import { clearAccessToken, getAccessToken, refreshSession, setAccessToken } from '../services/authToken';
import { BACKEND_UNAVAILABLE_EVENT, isBackendUnavailableStatus } from '../services/backendAvailability';

type UserRole = 'BUYER' | 'SUPPLIER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole | null;
  organization_id?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  email_verified?: boolean;
  kyc_status?: string;
  must_change_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken?: string) => Promise<void>;
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

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(getAccessToken());
    const [isLoading, setIsLoading] = useState(true);
    const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTokens = useCallback(() => {
        clearAccessToken();
        sessionStorage.removeItem('verdaxis_currentPage');
        sessionStorage.removeItem('verdaxis_viewMode');
        setToken(null);
        setUser(null);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }, []);

    const applyAccessToken = useCallback((nextToken: string) => {
        setAccessToken(nextToken);
        setToken(nextToken);
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
                    setIsBackendUnavailable(true);
                    return;
                }
                if (outcome.status === 'denied') {
                    logout();
                    return;
                }

                setIsBackendUnavailable(false);
                applyAccessToken(outcome.token);
                scheduleRefresh(outcome.token);
            } catch {
                setIsBackendUnavailable(true);
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
    const login = useCallback(async (accessToken: string, refreshToken?: string) => {
        void refreshToken;
        applyAccessToken(accessToken);
        scheduleRefresh(accessToken);
        // Fetch user profile so isAuthenticated becomes true immediately
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                setIsBackendUnavailable(false);
                setUser(await res.json());
            } else if (isBackendUnavailableStatus(res.status)) {
                setIsBackendUnavailable(true);
            }
        } catch {
            setIsBackendUnavailable(true);
        }
        finally {
            setIsLoading(false);
        }
    }, [applyAccessToken, scheduleRefresh]);

    // --- Check auth on mount / token change ---
    const checkAuth = useCallback(async () => {
        setIsLoading(true);
        const currentToken = getAccessToken();
        if (!currentToken) {
            try {
                const outcome = await refreshSession();
                if (outcome.status === 'unavailable') {
                    setIsBackendUnavailable(true);
                    return;
                }
                if (outcome.status === 'denied') {
                    setIsBackendUnavailable(false);
                    clearTokens();
                    return;
                }

                setIsBackendUnavailable(false);
                applyAccessToken(outcome.token);
                scheduleRefresh(outcome.token);

                const userRes = await fetch(`${API_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${outcome.token}` },
                });
                if (userRes.ok) {
                    setIsBackendUnavailable(false);
                    setUser(await userRes.json());
                } else if (isBackendUnavailableStatus(userRes.status)) {
                    setIsBackendUnavailable(true);
                } else {
                    setIsBackendUnavailable(false);
                    clearTokens();
                }
            } catch (err) {
                console.error('Error refreshing auth session:', err);
                setIsBackendUnavailable(true);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${currentToken}` },
            });

            if (res.ok) {
                setIsBackendUnavailable(false);
                const userData = await res.json();
                setUser(userData);
                scheduleRefresh(currentToken);
            } else if (isBackendUnavailableStatus(res.status)) {
                setIsBackendUnavailable(true);
            } else if (res.status === 401) {
                // Try refresh before giving up
                const outcome = await refreshSession();
                if (outcome.status === 'unavailable') {
                    setIsBackendUnavailable(true);
                } else if (outcome.status === 'success') {
                    setIsBackendUnavailable(false);
                    applyAccessToken(outcome.token);
                    const userRes = await fetch(`${API_URL}/auth/me`, {
                        headers: { 'Authorization': `Bearer ${outcome.token}` },
                    });
                    if (userRes.ok) {
                        setIsBackendUnavailable(false);
                        setUser(await userRes.json());
                        scheduleRefresh(outcome.token);
                    } else if (isBackendUnavailableStatus(userRes.status)) {
                        setIsBackendUnavailable(true);
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
            setIsBackendUnavailable(true);
        } finally {
            setIsLoading(false);
        }
    }, [applyAccessToken, scheduleRefresh, clearTokens]);

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
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        const urlRefresh = params.get('refresh');
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
