import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../services/config';

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
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
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
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTokens = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        setToken(null);
        setUser(null);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }, []);

    const logout = useCallback(() => {
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
            const rt = localStorage.getItem('refresh_token');
            if (!rt) { logout(); return; }

            try {
                const res = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: rt }),
                });

                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('token', data.access_token);
                    if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
                    setToken(data.access_token);
                    scheduleRefresh(data.access_token);
                } else {
                    logout();
                }
            } catch {
                logout();
            }
        }, refreshIn);
    }, [logout]);

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
        localStorage.setItem('token', accessToken);
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        setToken(accessToken);
        scheduleRefresh(accessToken);
        // Fetch user profile so isAuthenticated becomes true immediately
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                setUser(await res.json());
            }
        } catch { /* checkAuth will retry on next mount */ }
    }, [scheduleRefresh]);

    // --- Check auth on mount / token change ---
    const checkAuth = useCallback(async () => {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${currentToken}` },
            });

            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                scheduleRefresh(currentToken);
            } else if (res.status === 401) {
                // Try refresh before giving up
                const rt = localStorage.getItem('refresh_token');
                if (rt) {
                    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh_token: rt }),
                    });
                    if (refreshRes.ok) {
                        const data = await refreshRes.json();
                        localStorage.setItem('token', data.access_token);
                        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
                        setToken(data.access_token);
                        // Re-fetch user with new token
                        const userRes = await fetch(`${API_URL}/auth/me`, {
                            headers: { 'Authorization': `Bearer ${data.access_token}` },
                        });
                        if (userRes.ok) {
                            setUser(await userRes.json());
                            scheduleRefresh(data.access_token);
                        } else {
                            clearTokens();
                        }
                    } else {
                        clearTokens();
                    }
                } else {
                    clearTokens();
                }
            }
        } catch (err) {
            console.error('Error fetching user profile:', err);
        } finally {
            setIsLoading(false);
        }
    }, [scheduleRefresh, clearTokens]);

    // Capture tokens from OAuth redirect URL params
    useEffect(() => {
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
