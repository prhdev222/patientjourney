// Firebase Service Worker for Cloud Messaging
// This file must be in the public folder

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// Fetch Firebase config from API endpoint (secure - uses environment variables)
let messaging = null

// Initialize Firebase on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    fetch('/api/firebase-config')
      .then((response) => response.json())
      .then((config) => {
        if (!firebase.apps.length) {
          firebase.initializeApp(config)
        }
        messaging = firebase.messaging()
        console.log('[firebase-messaging-sw.js] Firebase initialized')
      })
      .catch((error) => {
        console.error('[firebase-messaging-sw.js] Error loading Firebase config:', error)
      })
  )
})

// Initialize on activate if not already initialized
self.addEventListener('activate', (event) => {
  event.waitUntil(
    fetch('/api/firebase-config')
      .then((response) => response.json())
      .then((config) => {
        if (!firebase.apps.length) {
          firebase.initializeApp(config)
        }
        if (!messaging) {
          messaging = firebase.messaging()
        }
        console.log('[firebase-messaging-sw.js] Firebase activated')
      })
      .catch((error) => {
        console.error('[firebase-messaging-sw.js] Error loading Firebase config:', error)
      })
  )
  return self.clients.claim()
})

// Handle background messages
// Initialize messaging if not already done
if (!messaging) {
  fetch('/api/firebase-config')
    .then((response) => response.json())
    .then((config) => {
      if (!firebase.apps.length) {
        firebase.initializeApp(config)
      }
      messaging = firebase.messaging()
      
      // Set up message handler after initialization
      messaging.onBackgroundMessage((payload) => {
        handleBackgroundMessage(payload)
      })
    })
    .catch((error) => {
      console.error('[firebase-messaging-sw.js] Error initializing Firebase:', error)
    })
} else {
  messaging.onBackgroundMessage((payload) => {
    handleBackgroundMessage(payload)
  })
}

function handleBackgroundMessage(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload)
  
  const notificationTitle = payload.notification?.title || 'สถานะอัพเดท'
  const notificationOptions = {
    body: payload.notification?.body || 'มีการอัพเดทสถานะใหม่',
    icon: '/icon-192.png',
    badge: '/icon-72x72.png',
    tag: 'patient-journey',
    data: payload.data?.url || '/patient/dashboard',
    requireInteraction: false,
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.')

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

