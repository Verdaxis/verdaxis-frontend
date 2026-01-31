import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthProvider as OidcProvider, useAuth as useOidcAuth } from "react-oidc-context";
import { User as OidcUser } from "oidc-client-ts";
import { API_URL } from '../services/config';

const DEV_BYPASS = import.meta.env.VITE_ENABLE_AUTH_BYPASS === 'true'; // Controlled by env var

// Define types matching our backend
type UserRole = 'BUYER' | 'SUPPLIER' | 'ADMIN';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole | null;
  organization_id?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  loginWithRedirect: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Internal component to bridge OIDC context with our App's AuthContext
const AuthContextAdapter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const oidc = useOidcAuth();
    const [user, setUser] = useState<User | null>(null);
    const [appLoading, setAppLoading] = useState(true);

    const loginWithRedirect = () => {
        oidc.signinRedirect();
    };

    const logout = () => {
        setUser(null);
        oidc.removeUser();
        // Clear local storage if we were using it, though oidc-client-ts handles its own storage
        localStorage.removeItem('token');
    };

    // Effect to sync OIDC state with App state
    useEffect(() => {
        const checkAuth = async () => {
            let activeToken: string | null = null;

            if (DEV_BYPASS) {
                activeToken = "dev-bypass-token";
                // localStorage.setItem('token', activeToken); 
                // Don't necessarily need to persist if we rely on this env var
            } else if (oidc.isAuthenticated && oidc.user?.access_token) {
                activeToken = oidc.user.access_token;
            }

            if (!activeToken) {
                if (!oidc.isLoading) setAppLoading(false);
                return;
            }

            try {
                // Fetch full user profile from our backend
                const res = await fetch(`${API_URL}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${activeToken}`
                    }
                });

                if (res.ok) {
                    const userData = await res.json();
                    setUser(userData);
                } else {
                    console.error("Failed to fetch user profile", res.status);
                    // If dev bypass fails (e.g. backend down), maybe fallback?
                    // But for now, let it fail so we know backend is unreachable
                }
            } catch (err) {
                console.error("Error fetching user profile:", err);
            } finally {
                setAppLoading(false);
            }
        };

        if (oidc.isLoading) return;
        
        checkAuth();

    }, [oidc.isLoading, oidc.isAuthenticated, oidc.user?.access_token]);

    const value = {
        user,
        token: oidc.user?.access_token || (DEV_BYPASS ? "dev-bypass-token" : null),
        isLoading: oidc.isLoading || appLoading,
        login: () => {}, // No manual login with OIDC usually, handled by library
        loginWithRedirect,
        logout,
        isAuthenticated: !!user || (DEV_BYPASS && !!user) // Only authenticated if we have user data
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authentikBase = import.meta.env.VITE_AUTHENTIK_URL || "https://authentik.verdaxis.com";
  // Ensure we have the full application path
  const authority = authentikBase.includes('/application/o/') 
    ? authentikBase 
    : `${authentikBase.replace(/\/$/, '')}/application/o/verdaxis/`;

  // Check if running in a secure context (HTTPS or localhost)
  // Web Crypto API (required for PKCE) only works in secure contexts
  const isSecureContext = 
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const oidcConfig = {
    authority,
    client_id: import.meta.env.VITE_AUTHENTIK_CLIENT_ID || "",
    redirect_uri: window.location.origin,
    response_type: "code",
    scope: "openid profile email",
    automaticSilentRenew: isSecureContext, // Silent renew also requires secure context
    // Disable PKCE when not in a secure context, as Web Crypto API
    // is unavailable over plain HTTP. For production, always use HTTPS!
    disablePKCE: !isSecureContext,
  };

  if (!oidcConfig.client_id) {
      console.warn("OIDC Client ID missing in environment variables");
  }

  return (
    <OidcProvider {...oidcConfig}>
        <AuthContextAdapter>
            {children}
        </AuthContextAdapter>
    </OidcProvider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
