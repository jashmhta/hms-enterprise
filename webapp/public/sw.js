const CACHE_NAME = 'hms-mobile-v1.0.0';
const RUNTIME_CACHE = 'hms-mobile-runtime';

const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/js/app.js',
  '/css/main.css',
  '/css/pwa.css'
];

const API_CACHE_URLS = [
  '/api/v1/user/profile',
  '/api/v1/patient/dashboard',
  '/api/v1/appointments/upcoming'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static resources
  if (STATIC_CACHE_URLS.includes(url.pathname) || 
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/js/') ||
      url.pathname.startsWith('/css/')) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests (SPA routes)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default network-first for other requests
  event.respondWith(
    fetch(request)
      .catch(() => {
        // Return offline page for navigation requests that fail
        if (request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      })
  );
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Cache GET requests to specific endpoints
  if (request.method === 'GET' && API_CACHE_URLS.some(apiUrl => url.pathname.includes(apiUrl))) {
    try {
      // Try network first
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        // Cache successful response
        const responseClone = networkResponse.clone();
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, responseClone);
      }
      
      return networkResponse;
    } catch (error) {
      // Network failed, try cache
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Return offline response for API calls
      return new Response(
        JSON.stringify({ 
          error: 'Network unavailable', 
          offline: true,
          message: 'You are currently offline. Please check your connection.' 
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }
  
  // For non-cacheable API requests, try network only
  return fetch(request);
}

// Handle static resource requests with cache-first strategy
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return a basic offline response for missing static assets
    return new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle navigation requests for SPA
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached index.html for navigation requests
    const cachedResponse = await caches.match('/index.html');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return caches.match('/offline.html');
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Get all pending actions from IndexedDB
  const pendingActions = await getPendingActions();
  
  for (const action of pendingActions) {
    try {
      // Retry the failed request
      const response = await fetch(action.url, action.options);
      
      if (response.ok) {
        // Remove successful action from pending list
        await removePendingAction(action.id);
      }
    } catch (error) {
      console.error('Background sync failed for action:', action, error);
    }
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: 'You have a new notification from HMS Enterprise',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'hms-notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.title = data.title || 'HMS Enterprise';
    options.data = data;
  }

  event.waitUntil(
    self.registration.showNotification(options.title || 'HMS Enterprise', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    // Open the app to relevant page
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// IndexedDB helper functions for offline storage
async function getPendingActions() {
  // Implementation would use IndexedDB to store failed requests
  return [];
}

async function removePendingAction(id) {
  // Implementation would remove action from IndexedDB
  return true;
}

// Periodic background sync for data updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCache());
  }
});

async function updateCache() {
  try {
    // Fetch and cache critical data
    const criticalData = [
      '/api/v1/user/profile',
      '/api/v1/appointments/upcoming',
      '/api/v1/notifications/unread'
    ];

    for (const url of criticalData) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(url, response);
        }
      } catch (error) {
        console.error('Failed to update cache for:', url, error);
      }
    }
  } catch (error) {
    console.error('Cache update failed:', error);
  }
}