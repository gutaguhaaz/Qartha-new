import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Added state to track authentication

  const readRedirectCookie = () => {
    const match = document.cookie.match(/(?:^|; )redirect_to=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return null;
  };

  const clearRedirectCookie = () => {
    document.cookie = 'redirect_to=; Max-Age=0; path=/; SameSite=Lax';
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true); // Set isAuthenticated to true if user data is retrieved
      } else {
        setUser(null);
        setIsAuthenticated(false); // Set isAuthenticated to false if no user data
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false); // Set isAuthenticated to false on error
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const loginData = { email, password };
      console.log('Sending login data:', loginData);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(loginData),
      });

      console.log('Login response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Login successful:', result);
        setIsAuthenticated(true); // Set isAuthenticated to true on successful login
        await checkAuth(); // Refresh user data after successful login
        const cookieRedirect = readRedirectCookie();
        if (cookieRedirect) {
          clearRedirectCookie();
        }
        return true;
      } else {
        const errorText = await response.text();
        console.error('Login failed:', errorText);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error('Logout response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Always clear user state even if logout request fails
      setUser(null);
      setIsAuthenticated(false);
      clearRedirectCookie();
      
      // Clear any stored tokens in localStorage/sessionStorage
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');
      
      // Force redirect to login page
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};