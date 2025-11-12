import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging'

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Check if Firebase config is complete
const isFirebaseConfigValid = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  )
}

// Initialize Firebase
let app: FirebaseApp | null = null
if (isFirebaseConfigValid()) {
  if (getApps().length === 0) {
    try {
      app = initializeApp(firebaseConfig)
    } catch (error) {
      console.error('Firebase initialization error:', error)
    }
  } else {
    app = getApps()[0]
  }
} else {
  console.warn('Firebase configuration is incomplete. Some Firebase features may not work.')
}

// Get messaging instance (only on client side)
let messaging: Messaging | null = null

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && app) {
  try {
    messaging = getMessaging(app)
  } catch (error) {
    console.error('Firebase messaging initialization error:', error)
  }
}

// Request notification permission and get token
export async function requestNotificationPermission(serviceWorkerRegistration?: ServiceWorkerRegistration): Promise<string | null> {
  // Check if Firebase config is valid
  if (!isFirebaseConfigValid()) {
    throw new Error('Firebase configuration ไม่ครบถ้วน - กรุณาตรวจสอบ environment variables (NEXT_PUBLIC_FIREBASE_*)')
  }

  if (!app) {
    throw new Error('Firebase app ไม่ได้ initialize - กรุณาตรวจสอบ Firebase configuration')
  }

  // Get or create messaging instance
  let currentMessaging = messaging
  if (!currentMessaging && typeof window !== 'undefined' && 'serviceWorker' in navigator && app) {
    try {
      currentMessaging = getMessaging(app)
    } catch (error) {
      console.error('Firebase messaging initialization error:', error)
      throw new Error('ไม่สามารถสร้าง Firebase messaging instance ได้')
    }
  }

  if (!currentMessaging) {
    console.warn('Firebase messaging not available')
    throw new Error('Firebase messaging ไม่พร้อมใช้งาน - กรุณาตรวจสอบว่าเบราว์เซอร์รองรับ Service Worker และ Firebase configuration ถูกต้อง')
  }

  try {
    // Get service worker registration if not provided
    let registration = serviceWorkerRegistration
    if (!registration && 'serviceWorker' in navigator) {
      try {
        registration = await navigator.serviceWorker.ready
      } catch (swError) {
        console.error('Service Worker not ready:', swError)
        throw new Error('Service Worker ยังไม่พร้อม - กรุณารอสักครู่แล้วลองใหม่')
      }
    }

    if (!registration) {
      throw new Error('Service Worker registration ไม่พบ - กรุณาตรวจสอบว่า Service Worker ได้ลงทะเบียนแล้ว')
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied')
      throw new Error('คุณปฏิเสธการแจ้งเตือน - กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์')
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.error('VAPID key not found')
      throw new Error('VAPID key ไม่พบ - กรุณาตรวจสอบ Firebase configuration ใน environment variables')
    }

    // Get token with service worker registration
    const token = await getToken(currentMessaging, { 
      vapidKey,
      serviceWorkerRegistration: registration 
    })
    
    if (!token) {
      throw new Error('ไม่สามารถรับ FCM token ได้ - กรุณาตรวจสอบ Firebase configuration และ Service Worker')
    }
    return token
  } catch (error: any) {
    console.error('Error getting FCM token:', error)
    // Re-throw with better error message
    if (error.message) {
      throw error
    }
    throw new Error(`เกิดข้อผิดพลาดในการรับ FCM token: ${error.message || 'Unknown error'}`)
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) {
    console.warn('Firebase messaging not available')
    return () => {}
  }

  const unsubscribe = onMessage(messaging, callback)
  return unsubscribe
}

export { messaging, app }

