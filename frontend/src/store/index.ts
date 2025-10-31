/**
 * Global State Management with Zustand
 * HMS Enterprise Frontend
 * 
 * Centralized state management for authentication, user data,
 * application settings, and global UI state.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  User, 
  LoginRequest, 
  LoginResponse,
  ApiResponse,
  Notification,
  SystemHealth 
} from '@types/index';

// Authentication Store
interface AuthState {
  // State
  user: User | null;
  tokens: {
    accessToken: string | null;
    refreshToken: string | null;
    expiresIn: number | null;
  };
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  setTokens: (tokens: LoginResponse['tokens']) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        user: null,
        tokens: {
          accessToken: null,
          refreshToken: null,
          expiresIn: null,
        },
        isAuthenticated: false,
        isLoading: false,
        loginError: null,

        // Actions
        login: async (credentials) => {
          set((state) => {
            state.isLoading = true;
            state.loginError = null;
          });

          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(credentials),
            });

            const data: ApiResponse<LoginResponse> = await response.json();

            if (data.success && data.data) {
              set((state) => {
                state.user = data.data!.user;
                state.tokens = data.data!.tokens;
                state.isAuthenticated = true;
                state.loginError = null;
              });
              return true;
            } else {
              set((state) => {
                state.loginError = data.message || 'Login failed';
                state.isAuthenticated = false;
              });
              return false;
            }
          } catch (error) {
            set((state) => {
              state.loginError = 'Network error. Please try again.';
              state.isAuthenticated = false;
            });
            return false;
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        logout: async () => {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${get().tokens.accessToken}`,
              },
            });
          } catch (error) {
            console.warn('Logout request failed:', error);
          } finally {
            set((state) => {
              state.user = null;
              state.tokens = { accessToken: null, refreshToken: null, expiresIn: null };
              state.isAuthenticated = false;
              state.loginError = null;
            });
          }
        },

        refreshTokens: async () => {
          const { refreshToken } = get().tokens;
          
          if (!refreshToken) {
            return false;
          }

          try {
            const response = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            });

            const data: ApiResponse<LoginResponse['tokens']> = await response.json();

            if (data.success && data.data) {
              set((state) => {
                state.tokens = data.data!;
              });
              return true;
            } else {
              // Refresh failed, log out
              get().logout();
              return false;
            }
          } catch (error) {
            console.warn('Token refresh failed:', error);
            get().logout();
            return false;
          }
        },

        updateUser: (userData) => {
          set((state) => {
            if (state.user) {
              Object.assign(state.user, userData);
            }
          });
        },

        clearError: () => {
          set((state) => {
            state.loginError = null;
          });
        },

        setTokens: (tokens) => {
          set((state) => {
            state.tokens = tokens;
            state.isAuthenticated = !!tokens.accessToken;
          });
        },

        setLoading: (loading) => {
          set((state) => {
            state.isLoading = loading;
          });
        },
      })),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          tokens: state.tokens,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Notification Store
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  fetchNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    immer((set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        set((state) => {
          const newNotification: Notification = {
            ...notification,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
          };
          state.notifications.unshift(newNotification);
          if (!notification.read) {
            state.unreadCount++;
          }
        });
      },

      markAsRead: (notificationId) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === notificationId);
          if (notification && !notification.read) {
            notification.read = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        });
      },

      markAllAsRead: () => {
        set((state) => {
          state.notifications.forEach(notification => {
            notification.read = true;
          });
          state.unreadCount = 0;
        });
      },

      removeNotification: (notificationId) => {
        set((state) => {
          const index = state.notifications.findIndex(n => n.id === notificationId);
          if (index !== -1) {
            const notification = state.notifications[index];
            if (!notification.read) {
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
            state.notifications.splice(index, 1);
          }
        });
      },

      clearNotifications: () => {
        set((state) => {
          state.notifications = [];
          state.unreadCount = 0;
        });
      },

      fetchNotifications: async () => {
        try {
          const response = await fetch('/api/notifications', {
            headers: {
              'Authorization': `Bearer ${useAuthStore.getState().tokens.accessToken}`,
            },
          });

          const data: ApiResponse<Notification[]> = await response.json();

          if (data.success && data.data) {
            set((state) => {
              state.notifications = data.data!;
              state.unreadCount = data.data!.filter(n => !n.read).length;
            });
          }
        } catch (error) {
          console.warn('Failed to fetch notifications:', error);
        }
      },
    })),
    {
      name: 'notification-store',
    }
  )
);

// Application Settings Store
interface SettingsState {
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  language: string;
  timezone: string;
  sidebarCollapsed: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  
  // Actions
  setTheme: (theme: 'LIGHT' | 'DARK' | 'SYSTEM') => void;
  setLanguage: (language: string) => void;
  setTimezone: (timezone: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  resetSettings: () => void;
}

const defaultSettings: Omit<SettingsState, 'setTheme' | 'setLanguage' | 'setTimezone' | 'toggleSidebar' | 'setSidebarCollapsed' | 'setAutoRefresh' | 'setRefreshInterval' | 'resetSettings'> = {
  theme: 'SYSTEM',
  language: 'en-US',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  sidebarCollapsed: false,
  autoRefresh: true,
  refreshInterval: 60,
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      immer((set) => ({
        ...defaultSettings,

        setTheme: (theme) => {
          set((state) => {
            state.theme = theme;
          });
        },

        setLanguage: (language) => {
          set((state) => {
            state.language = language;
          });
        },

        setTimezone: (timezone) => {
          set((state) => {
            state.timezone = timezone;
          });
        },

        toggleSidebar: () => {
          set((state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          });
        },

        setSidebarCollapsed: (collapsed) => {
          set((state) => {
            state.sidebarCollapsed = collapsed;
          });
        },

        setAutoRefresh: (enabled) => {
          set((state) => {
            state.autoRefresh = enabled;
          });
        },

        setRefreshInterval: (interval) => {
          set((state) => {
            state.refreshInterval = interval;
          });
        },

        resetSettings: () => {
          set((state) => {
            Object.assign(state, defaultSettings);
          });
        },
      })),
      {
        name: 'settings-storage',
      }
    ),
    {
      name: 'settings-store',
    }
  )
);

// System Health Store
interface SystemHealthState {
  health: SystemHealth | null;
  lastChecked: string | null;
  isChecking: boolean;
  
  // Actions
  checkHealth: () => Promise<void>;
  setHealth: (health: SystemHealth) => void;
}

export const useSystemHealthStore = create<SystemHealthState>()(
  devtools(
    immer((set) => ({
      health: null,
      lastChecked: null,
      isChecking: false,

      checkHealth: async () => {
        set((state) => {
          state.isChecking = true;
        });

        try {
          const response = await fetch('/api/health');
          const health: SystemHealth = await response.json();

          set((state) => {
            state.health = health;
            state.lastChecked = new Date().toISOString();
          });
        } catch (error) {
          set((state) => {
            state.health = {
              status: 'UNHEALTHY',
              services: {
                user: { status: 'DOWN', lastCheck: new Date().toISOString() },
                patient: { status: 'DOWN', lastCheck: new Date().toISOString() },
                appointment: { status: 'DOWN', lastCheck: new Date().toISOString() },
                clinical: { status: 'DOWN', lastCheck: new Date().toISOString() },
                billing: { status: 'DOWN', lastCheck: new Date().toISOString() },
                notification: { status: 'DOWN', lastCheck: new Date().toISOString() },
              },
              lastChecked: new Date().toISOString(),
            };
            state.lastChecked = new Date().toISOString();
          });
        } finally {
          set((state) => {
            state.isChecking = false;
          });
        }
      },

      setHealth: (health) => {
        set((state) => {
          state.health = health;
          state.lastChecked = new Date().toISOString();
        });
      },
    })),
    {
      name: 'system-health-store',
    }
  )
);

// Global Loading Store
interface LoadingState {
  loading: Record<string, boolean>;
  
  // Actions
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  getLoadingState: () => Record<string, boolean>;
}

export const useLoadingStore = create<LoadingState>()(
  devtools(
    immer((set, get) => ({
      loading: {},

      setLoading: (key, loading) => {
        set((state) => {
          state.loading[key] = loading;
        });
      },

      isLoading: (key) => {
        return get().loading[key] || false;
      },

      getLoadingState: () => {
        return get().loading;
      },
    })),
    {
      name: 'loading-store',
    }
  )
);

// Error Store for centralized error handling
interface ErrorState {
  errors: Array<{
    id: string;
    message: string;
    code?: string;
    timestamp: string;
    context?: any;
    dismissed: boolean;
  }>;
  
  // Actions
  addError: (error: { message: string; code?: string; context?: any }) => void;
  dismissError: (errorId: string) => void;
  clearErrors: () => void;
  getRecentErrors: (count?: number) => Array<{
    id: string;
    message: string;
    code?: string;
    timestamp: string;
    context?: any;
    dismissed: boolean;
  }>;
}

export const useErrorStore = create<ErrorState>()(
  devtools(
    immer((set, get) => ({
      errors: [],

      addError: (error) => {
        set((state) => {
          const newError = {
            id: Date.now().toString(),
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
            context: error.context,
            dismissed: false,
          };
          state.errors.unshift(newError);
          
          // Keep only last 50 errors
          if (state.errors.length > 50) {
            state.errors = state.errors.slice(0, 50);
          }
        });
      },

      dismissError: (errorId) => {
        set((state) => {
          const error = state.errors.find(e => e.id === errorId);
          if (error) {
            error.dismissed = true;
          }
        });
      },

      clearErrors: () => {
        set((state) => {
          state.errors = [];
        });
      },

      getRecentErrors: (count = 10) => {
        return get().errors
          .filter(error => !error.dismissed)
          .slice(0, count);
      },
    })),
    {
      name: 'error-store',
    }
  )
);

// Export all stores
export {
  useAuthStore as useAuth,
  useNotificationStore as useNotifications,
  useSettingsStore as useSettings,
  useSystemHealthStore as useSystemHealth,
  useLoadingStore as useLoading,
  useErrorStore as useErrors,
};

// Export types for external use
export type {
  AuthState,
  NotificationState,
  SettingsState,
  SystemHealthState,
  LoadingState,
  ErrorState,
};