import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../services/config';


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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for hash (OIDC Callback)
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1)); // remove #
        const accessToken = params.get("access_token");
        if (accessToken) {
            // Set token and clear hash
            localStorage.setItem('token', accessToken);
            setToken(accessToken); // This will trigger initAuth via re-render or we call it
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Initialize auth state from local storage or validate token
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        try {
          // Fetch user details from backend using the token
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token invalid or expired
            logout();
          }
        } catch (error) {
          console.error("Auth initialization failed", error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token]); // Added token dependency to re-run if token changes (e.g. from hash)

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    // Token dependency in useEffect will handle fetching user
  };

  const loginWithRedirect = () => {
    const authUrl = import.meta.env.VITE_AUTHENTIK_URL;
    const clientId = import.meta.env.VITE_AUTHENTIK_CLIENT_ID;
    const redirectUri = window.location.origin;
    
    if (!authUrl || !clientId) {
        console.error("Authentik configuration missing");
        return;
    }

    // Implicit Flow for simplicity
    window.location.href = `${authUrl}/application/o/authorize/?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=openid profile email`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoading, 
      login, 
      loginWithRedirect,
      logout,
      isAuthenticated: !!user 
    }}>
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
