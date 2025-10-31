/**
 * Authentication Context
 * HMS Enterprise Frontend
 * 
 * Provides authentication state and functionality throughout the application.
 * Handles login, logout, token refresh, and user session management.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '@store/index';
import { User, LoginRequest } from '@types/index';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  refreshTokens: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    loginError,
    login,
    logout,
    refreshTokens,
    updateUser,
    clearError,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const [tokenRefreshTimer, setTokenRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      const { tokens } = useAuth.getState();
      
      if (tokens.accessToken && !user) {
        // Try to fetch user profile if we have a token but no user data
        try {
          const response = await fetch('/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              updateUser(data.data);
            }
          } else {
            // Token is invalid, clear auth state
            await logout();
          }
        } catch (error) {
          console.warn('Failed to fetch user profile:', error);
        }
      }
    };

    checkAuthStatus();
  }, [user, logout, updateUser]);

  // Set up token refresh timer
  useEffect(() => {
    const { tokens } = useAuth.getState();
    
    if (tokens.expiresIn && tokens.accessToken) {
      // Set timer to refresh token 5 minutes before expiry
      const refreshTime = Math.max(0, (tokens.expiresIn - 300) * 1000);
      
      if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
      }

      const timer = setTimeout(async () => {
        const refreshed = await refreshTokens();
        if (!refreshed) {
          toast.error('Session expired. Please login again.');
          await logout();
          navigate('/login');
        }
      }, refreshTime);

      setTokenRefreshTimer(timer);
    }

    return () => {
      if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
      }
    };
  }, [user, refreshTokens, logout, navigate]);

  // Auto-logout on tab close (for security)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const { tokens } = useAuth.getState();
      if (tokens.accessToken) {
        // Clear sensitive data from localStorage
        localStorage.removeItem('auth-storage');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Redirect based on authentication status
  useEffect(() => {
    const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path));

    if (!isAuthenticated && !isLoading && !isPublicPath) {
      // Redirect to login if accessing protected route without auth
      navigate('/login', { replace: true });
    } else if (isAuthenticated && isPublicPath) {
      // Redirect to dashboard if accessing public route while authenticated
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  // Permission and role checking functions
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.some(p => p.name === permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.roles.some(r => r.name === role);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    return user.roles.some(r => roles.includes(r.name));
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    return user.permissions.some(p => permissions.includes(p.name));
  };

  // Enhanced login with better error handling
  const handleLogin = async (credentials: LoginRequest): Promise<boolean> => {
    clearError();
    
    try {
      const success = await login(credentials);
      
      if (success) {
        toast.success('Welcome back!', {
          icon: '👋',
        });
        
        // Redirect to intended destination or dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
        
        return true;
      } else {
        const { loginError } = useAuth.getState();
        toast.error(loginError || 'Login failed. Please try again.');
        return false;
      }
    } catch (error) {
      toast.error('An unexpected error occurred during login.');
      return false;
    }
  };

  // Enhanced logout with cleanup
  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      toast.success('Logged out successfully', {
        icon: '👋',
      });
      navigate('/login', { replace: true });
    } catch (error) {
      console.warn('Logout error:', error);
      // Force logout even if API call fails
      navigate('/login', { replace: true });
    }
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    loginError,
    login: handleLogin,
    logout: handleLogout,
    updateUser,
    clearError,
    refreshTokens,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAnyPermission,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;