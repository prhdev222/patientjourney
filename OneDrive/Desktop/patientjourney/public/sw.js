// Service Worker for Patient Journey Tracker
// Basic service worker - can be extended for offline support

const CACHE_NAME = 'patient-journey-v1'
const urlsToCache = [
  '/',
  '/login',
  '/patient/dashboard',
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request)
    })
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Claim clients immediately
  return self.clients.claim()
})

// Push event - สำหรับ Web Push Notifications (ต้องมี backend ส่ง push)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'สถานะอัพเดท'
  const options = {
    body: data.body || 'มีการอัพเดทสถานะใหม่',
    icon: '/icon-192.png',
    badge: '/icon-72x72.png',
    tag: 'patient-journey',
    requireInteraction: false,
    data: data.url || '/patient/dashboard',
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's already a window open, focus it
      for (const client of clientList) {
        if (client.url === event.notification.data && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || '/patient/dashboard')
      }
    })
  )
})

