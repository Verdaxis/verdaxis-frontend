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
  role: UserRole;
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
        if (oidc.isLoading) {
            return;
        }

        if (DEV_BYPASS) {
             const mockToken = "dev-bypass-token";
             localStorage.setItem('token', mockToken);
             setUser({
              id: 'dev-admin',
              email: 'dev@admin.com',
              first_name: 'Dev',
              last_name: 'Admin',
              role: 'SUPPLIER',
              status: 'APPROVED'
            });
            console.log("Starting in DEV_BYPASS mode as Dev Admin");
            setAppLoading(false);
            return;
        }

        if (oidc.isAuthenticated && oidc.user?.access_token) {
            const token = oidc.user.access_token;
            localStorage.setItem('token', token); // Keep for legacy calls if needed

            // Fetch full user profile from our backend
            fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Failed to fetch user profile");
            })
            .then(userData => {
                setUser(userData);
            })
            .catch(err => {
                console.error("Error fetching user profile:", err);
                // Optional: logout if profile fetch fails?
            })
            .finally(() => {
                setAppLoading(false);
            });
        } else {
            setAppLoading(false);
        }

    }, [oidc.isLoading, oidc.isAuthenticated, oidc.user?.access_token]);

    const value = {
        user,
        token: oidc.user?.access_token || (DEV_BYPASS ? "dev-bypass-token" : null),
        isLoading: oidc.isLoading || appLoading,
        login: () => {}, // No manual login with OIDC usually, handled by library
        loginWithRedirect,
        logout,
        isAuthenticated: !!user || (DEV_BYPASS)
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

  const oidcConfig = {
    authority,
    client_id: import.meta.env.VITE_AUTHENTIK_CLIENT_ID || "",
    redirect_uri: window.location.origin,
    response_type: "code",
    scope: "openid profile email",
    automaticSilentRenew: true,
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
