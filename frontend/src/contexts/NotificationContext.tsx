/**
 * Notification Context
 * HMS Enterprise Frontend
 * 
 * Provides notification management functionality throughout the application.
 * Handles real-time notifications via WebSocket and manages local notifications.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';

import { useNotifications, useSettings } from '@store/index';
import { Notification, NotificationType } from '@types/index';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  showSystemNotification: (notification: Notification) => void;
  playNotificationSound: (type: Notification['priority']) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

// Audio context for notification sounds
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

const playNotificationSound = async (type: Notification['priority'] = 'NORMAL'): Promise<void> => {
  const { userPreferences } = useSettings.getState();
  
  // Check if user has enabled notifications
  if (!userPreferences?.notifications.push) return;

  try {
    const context = getAudioContext();
    
    // Create oscillator for simple beep sound
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Set frequency based on priority
    switch (type) {
      case 'LOW':
        oscillator.frequency.value = 600;
        break;
      case 'NORMAL':
        oscillator.frequency.value = 800;
        break;
      case 'HIGH':
        oscillator.frequency.value = 1000;
        break;
      case 'URGENT':
        oscillator.frequency.value = 1200;
        break;
    }
    
    // Set volume based on priority
    const volume = type === 'URGENT' ? 0.5 : 0.3;
    gainNode.gain.value = volume;
    
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const {
    notifications,
    unreadCount,
    addNotification: addNotificationToStore,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
    fetchNotifications,
  } = useNotifications();

  const [ws, setWs] = useState<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const initWebSocket = () => {
      const { isAuthenticated, tokens } = useAuth.getState();
      
      if (!isAuthenticated || !tokens.accessToken) {
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;
      
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('Notification WebSocket connected');
        // Send authentication token
        websocket.send(JSON.stringify({
          type: 'auth',
          token: tokens.accessToken,
        }));
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'notification') {
            handleIncomingNotification(data.notification);
          }
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        console.log('Notification WebSocket disconnected');
        // Attempt to reconnect after delay
        setTimeout(initWebSocket, 5000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setWs(websocket);

      return () => {
        websocket.close();
        setWs(null);
      };
    };

    const cleanup = initWebSocket();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    const { isAuthenticated } = useAuth.getState();
    
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }
  }, []);

  const handleIncomingNotification = (notification: Notification) => {
    addNotificationToStore(notification);
    
    // Show system notification if permission is granted
    if (notification.channels.includes('IN_APP')) {
      showSystemNotification(notification);
    }

    // Show toast notification based on priority
    showToastNotification(notification);

    // Play sound for urgent notifications
    if (notification.priority === 'URGENT' || notification.priority === 'HIGH') {
      playNotificationSound(notification.priority);
    }
  };

  const showSystemNotification = (notification: Notification): void => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const systemNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'URGENT',
        silent: notification.priority === 'LOW',
      });

      systemNotification.onclick = () => {
        window.focus();
        systemNotification.close();
        
        // Handle notification click (navigate to relevant page)
        handleNotificationClick(notification);
      };

      // Auto-close after timeout for non-urgent notifications
      if (notification.priority !== 'URGENT') {
        setTimeout(() => {
          systemNotification.close();
        }, 5000);
      }
    }
  };

  const showToastNotification = (notification: Notification): void => {
    const toastOptions = {
      duration: notification.priority === 'URGENT' ? 10000 : 4000,
      icon: getNotificationIcon(notification.type),
    };

    switch (notification.priority) {
      case 'URGENT':
        toast.error(notification.message, toastOptions);
        break;
      case 'HIGH':
        toast(notification.message, { ...toastOptions, icon: '⚠️' });
        break;
      case 'LOW':
        toast(notification.message, { ...toastOptions, icon: 'ℹ️' });
        break;
      default:
        toast.success(notification.message, toastOptions);
    }
  };

  const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
      case NotificationType.APPOINTMENT_REMINDER:
        return '📅';
      case NotificationType.APPOINTMENT_CANCELLED:
        return '❌';
      case NotificationType.APPOINTMENT_RESCHEDULED:
        return '🔄';
      case NotificationType.LAB_RESULT_READY:
        return '🧪';
      case NotificationType.PRESCRIPTION_READY:
        return '💊';
      case NotificationType.CRITICAL_LAB_RESULT:
        return '🚨';
      case NotificationType.BILLING_PAYMENT_DUE:
        return '💰';
      case NotificationType.SYSTEM_MAINTENANCE:
        return '🔧';
      case NotificationType.SECURITY_ALERT:
        return '🔒';
      case NotificationType.WELCOME:
        return '👋';
      default:
        return '📢';
    }
  };

  const handleNotificationClick = (notification: Notification): void => {
    // Navigate to relevant page based on notification type
    let navigateTo = '/dashboard';
    
    switch (notification.type) {
      case NotificationType.APPOINTMENT_REMINDER:
      case NotificationType.APPOINTMENT_CANCELLED:
      case NotificationType.APPOINTMENT_RESCHEDULED:
        navigateTo = '/appointments';
        break;
      case NotificationType.LAB_RESULT_READY:
      case NotificationType.CRITICAL_LAB_RESULT:
        navigateTo = '/lab-results';
        break;
      case NotificationType.PRESCRIPTION_READY:
        navigateTo = '/prescriptions';
        break;
      case NotificationType.BILLING_PAYMENT_DUE:
        navigateTo = '/billing';
        break;
      case NotificationType.SECURITY_ALERT:
        navigateTo = '/security';
        break;
    }

    // Use React Router navigation (would need to be passed or imported)
    window.location.href = navigateTo;
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>): void => {
    addNotificationToStore(notification);
    
    // Show immediate feedback for in-app notifications
    if (notification.channels.includes('IN_APP')) {
      showToastNotification(notification);
      
      // Play sound for high priority notifications
      if (notification.priority === 'HIGH' || notification.priority === 'URGENT') {
        playNotificationSound(notification.priority);
      }
    }
  };

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
    showSystemNotification: handleIncomingNotification,
    playNotificationSound,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;