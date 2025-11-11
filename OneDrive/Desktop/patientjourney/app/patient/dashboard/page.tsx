'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase'

interface PatientStatus {
  visit: {
    vn: string
    startTime: string
  }
  currentStep: {
    name: string
    status: string
    startTime: string
    queueNumber?: number
    estimatedWaitTime: number
  } | null
  timeline: Array<{
    stepName: string
    status: string
    startTime: string
    endTime?: string
    notes?: string | null
  }>
  nextStep: {
    name: string
    location?: string
    floor?: number
    preparationText?: string
    estimatedMinutes: number
  } | null
}

export default function PatientDashboardPage() {
  const router = useRouter()
  const [status, setStatus] = useState<PatientStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [fcmEnabled, setFcmEnabled] = useState(false)
  const [previousStatus, setPreviousStatus] = useState<PatientStatus | null>(null)

  useEffect(() => {
    // Check if user is logged in as patient
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/patient/login')
      return
    }

    // Try to decode token to check role (basic check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role !== 'patient') {
        console.warn('[Patient Dashboard] User is not a patient, redirecting to login')
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        router.push('/patient/login')
        return
      }
    } catch (err) {
      console.error('[Patient Dashboard] Failed to decode token:', err)
      // Continue anyway, let API handle authentication
    }

    // Load notification preference from localStorage
    const saved = localStorage.getItem('notificationsEnabled')
    if (saved === 'true') {
      setNotificationsEnabled(true)
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }

    // Check FCM status
    const fcmSaved = localStorage.getItem('fcmEnabled')
    if (fcmSaved === 'true') {
      setFcmEnabled(true)
      subscribeToFCM()
    }

    // Listen for foreground messages
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Foreground message received:', payload)
      if (payload.notification) {
        showNotification(
          payload.notification.title || 'สถานะอัพเดท',
          payload.notification.body || 'มีการอัพเดทสถานะใหม่'
        )
      }
    })

    fetchStatus()
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show browser notification
  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-72x72.png',
        tag: 'patient-journey',
      })
    }
  }

  // Check for status changes and notify
  useEffect(() => {
    if (!status || !previousStatus) {
      setPreviousStatus(status)
      return
    }

    if (notificationsEnabled) {
      // Check if current step changed
      const currentStepChanged =
        status.currentStep?.name !== previousStatus.currentStep?.name ||
        status.currentStep?.status !== previousStatus.currentStep?.status

      if (currentStepChanged && status.currentStep) {
        const stepName = status.currentStep.name
        const stepStatus = status.currentStep.status

        let message = ''
        if (stepStatus === 'completed') {
          message = `✅ ${stepName} เสร็จสิ้นแล้ว`
        } else if (stepStatus === 'in_progress') {
          message = `🔄 กำลังดำเนินการ: ${stepName}`
        } else if (stepStatus === 'waiting') {
          message = `⏳ รอคิว: ${stepName}`
        }

        if (message) {
          showNotification('สถานะอัพเดท', message)
        }
      }

      // Check if next step changed
      const nextStepChanged =
        status.nextStep?.name !== previousStatus.nextStep?.name

      if (nextStepChanged && status.nextStep) {
        showNotification(
          'ขั้นตอนถัดไป',
          `👉 ${status.nextStep.name} - ${status.nextStep.location || ''}`
        )
      }
    }

    setPreviousStatus(status)
  }, [status, previousStatus, notificationsEnabled])

  // Subscribe to FCM
  const subscribeToFCM = async () => {
    try {
      console.log('[FCM] Starting subscription process...')

      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        alert('เบราว์เซอร์ของคุณไม่รองรับ Service Worker')
        return false
      }

      // Check if Firebase messaging is available
      if (typeof window === 'undefined') {
        alert('ไม่สามารถใช้งานได้ใน server-side')
        return false
      }

      // Register service worker for FCM
      console.log('[FCM] Registering service worker...')
      let registration
      try {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        })
        console.log('[FCM] Service Worker registered:', registration)
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready
        console.log('[FCM] Service Worker ready')
      } catch (swError: any) {
        console.error('[FCM] Service Worker registration error:', swError)
        alert(`ไม่สามารถลงทะเบียน Service Worker: ${swError.message}`)
        return false
      }

      // Request notification permission
      console.log('[FCM] Requesting notification permission...')
      if ('Notification' in window) {
        if (Notification.permission === 'denied') {
          alert('การแจ้งเตือนถูกปิดในเบราว์เซอร์ กรุณาเปิดใน Settings')
          return false
        }

        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission()
          if (permission !== 'granted') {
            alert('กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์')
            return false
          }
        }
        console.log('[FCM] Notification permission:', Notification.permission)
      } else {
        alert('เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือน')
        return false
      }

      // Request FCM token
      console.log('[FCM] Requesting FCM token...')
      const token = await requestNotificationPermission()
      if (!token) {
        console.error('[FCM] Failed to get FCM token')
        alert('ไม่สามารถรับ FCM token ได้ กรุณาตรวจสอบ Firebase configuration')
        return false
      }
      console.log('[FCM] FCM token received:', token.substring(0, 20) + '...')

      // Send token to backend
      const authToken = localStorage.getItem('token')
      if (!authToken) {
        alert('กรุณาเข้าสู่ระบบใหม่')
        return false
      }

      console.log('[FCM] Sending token to backend...')
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ fcmToken: token }),
      })

      if (response.ok) {
        const data = await response.json()
        setFcmEnabled(true)
        localStorage.setItem('fcmEnabled', 'true')
        console.log('[FCM] Subscription successful:', data)
        alert('✅ เปิดการแจ้งเตือน Web Push สำเร็จ!')
        return true
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[FCM] Failed to subscribe:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        alert(`ไม่สามารถเปิดการแจ้งเตือนได้ (${response.status}): ${errorData.error || 'Unknown error'}`)
        return false
      }
    } catch (error: any) {
      console.error('[FCM] Error subscribing to FCM:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message || 'Unknown error'}`)
      return false
    }
  }

  // Handle notification toggle
  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      // Request permission
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            setNotificationsEnabled(true)
            localStorage.setItem('notificationsEnabled', 'true')
            showNotification('การแจ้งเตือน', 'เปิดการแจ้งเตือนแล้ว')
          } else {
            alert('กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์')
          }
        } else if (Notification.permission === 'granted') {
          setNotificationsEnabled(true)
          localStorage.setItem('notificationsEnabled', 'true')
        } else {
          alert('กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์')
        }
      } else {
        alert('เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือน')
      }
    } else {
      setNotificationsEnabled(false)
      localStorage.setItem('notificationsEnabled', 'false')
    }
  }

  // Handle FCM toggle
  const handleFCMToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribeToFCM()
      if (!success) {
        // If subscription failed, keep toggle off
        setFcmEnabled(false)
      }
    } else {
      setFcmEnabled(false)
      localStorage.setItem('fcmEnabled', 'false')
      // Optionally remove token from backend
      try {
        const authToken = localStorage.getItem('token')
        if (authToken) {
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ fcmToken: null }),
          })
        }
      } catch (error) {
        console.error('Error unsubscribing:', error)
      }
    }
  }

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/patient/login')
        return
      }

      const response = await fetch('/api/patient/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({ error: 'Unauthorized' }))
        console.error('[Patient Dashboard] Authentication failed:', errorData)
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        setError('กรุณาเข้าสู่ระบบใหม่')
        setStatus(null)
        router.push('/patient/login')
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[Patient Dashboard] Failed to fetch status:', errorData)
        setError(errorData.error || 'เกิดข้อผิดพลาด')
        setStatus(null)
        return
      }

      const data = await response.json()
      console.log('[Patient Dashboard] Status fetched:', data)
      
      // Validate response structure
      if (!data.visit) {
        console.error('[Patient Dashboard] Invalid response structure:', data)
        setError('ข้อมูลไม่ถูกต้อง')
        setStatus(null)
        return
      }
      
      setStatus(data)
      setError('')
    } catch (err: any) {
      console.error('[Patient Dashboard] Error fetching status:', err)
      setError(err.message || 'เกิดข้อผิดพลาด')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('visitId')
    router.push('/')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'in_progress':
        return '🔄'
      case 'waiting':
        return '⏳'
      default:
        return '⏳'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'in_progress':
        return 'text-blue-600 animate-pulse-slow'
      case 'waiting':
        return 'text-gray-600'
      default:
        return 'text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  if (error || !status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'ไม่พบข้อมูล'}</p>
          <button
            onClick={fetchStatus}
            className="bg-primary-500 text-white px-6 py-2 rounded-lg"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">🏥 โรงพยาบาล</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Visit Info */}
        {status?.visit && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800 text-base">VN: {status.visit.vn}</p>
              <p>
                เวลาเข้า:{' '}
                {format(new Date(status.visit.startTime), 'HH:mm น.', { locale: th })}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                📅 {format(new Date(status.visit.startTime), 'dd MMMM yyyy', { locale: th })}
              </p>
            </div>
          </div>
        )}

        {/* Current Status Card */}
        {status.currentStep && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              สถานะปัจจุบัน 📍
            </h2>
            <div className="bg-primary-50 rounded-lg p-4">
              <p className="text-xl font-bold text-gray-800 mb-2">
                {status.currentStep.name}
              </p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>⏱️ {status.currentStep.estimatedWaitTime} นาที</p>
                {status.currentStep.queueNumber && (
                  <p>คิวที่: {status.currentStep.queueNumber}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">📋 Timeline</h2>
          <div className="relative pl-2">
            {/* Vertical Line Background */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="space-y-6">
              {status.timeline.map((step, index) => {
                const isCompleted = step.status === 'completed'
                const isInProgress = step.status === 'in_progress'
                const isWaiting = step.status === 'waiting'
                
                // Find the first in-progress or waiting step to determine current position
                const currentIndex = status.timeline.findIndex(s => s.status === 'in_progress' || (s.status === 'waiting' && status.timeline.indexOf(s) === status.timeline.findIndex(st => st.status !== 'completed')))
                const isCurrent = index === currentIndex && (isInProgress || isWaiting)
                
                // Determine line color based on previous step status
                const prevStep = index > 0 ? status.timeline[index - 1] : null
                const lineColor = prevStep?.status === 'completed' ? 'bg-green-500' : 
                                 prevStep?.status === 'in_progress' ? 'bg-blue-500' : 
                                 'bg-gray-200'
                
                return (
                  <div key={index} className="relative flex items-start gap-4">
                    {/* Circle Indicator */}
                    <div className="relative z-10 flex-shrink-0">
                      {isCompleted ? (
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg ring-4 ring-green-100">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : isInProgress ? (
                        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg ring-4 ring-blue-100 animate-pulse">
                          <div className="w-6 h-6 rounded-full bg-white animate-ping"></div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center shadow-md ring-4 ring-gray-50">
                          <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Content Card */}
                    <div className={`flex-1 pt-1 transition-all duration-300 ${isCurrent ? 'transform scale-[1.02]' : ''}`}>
                      <div className={`rounded-lg p-4 transition-all duration-300 ${
                        isCurrent 
                          ? 'bg-blue-50 border-2 border-blue-300 shadow-md' 
                          : isCompleted 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`font-bold text-lg mb-2 ${
                              isCompleted ? 'text-green-700' : 
                              isInProgress ? 'text-blue-700' : 
                              'text-gray-500'
                            }`}>
                              {step.stepName}
                            </h3>
                            {step.notes && (
                              <div className="mt-2 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                  <span className="font-semibold">📝 หมายเหตุ:</span> {step.notes}
                                </p>
                              </div>
                            )}
                            <div className="space-y-1">
                              {isInProgress && (
                                <p className="text-sm text-blue-600 font-medium flex items-center gap-2">
                                  <span className="animate-pulse">🔄</span>
                                  กำลังดำเนินการ...
                                </p>
                              )}
                              {isWaiting && !isInProgress && (
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                  <span>⏳</span>
                                  รอดำเนินการ
                                </p>
                              )}
                              {isCompleted && (
                                <p className="text-sm text-green-600 font-medium flex items-center gap-2">
                                  <span>✅</span>
                                  เสร็จสิ้นแล้ว
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className={`text-sm font-semibold ${
                              isCompleted ? 'text-green-600' : 
                              isInProgress ? 'text-blue-600' : 
                              'text-gray-400'
                            }`}>
                              {format(new Date(step.startTime), 'HH:mm', { locale: th })}
                            </p>
                            {step.endTime && isCompleted && (
                              <p className="text-xs text-gray-500 mt-1">
                                เสร็จ: {format(new Date(step.endTime), 'HH:mm', { locale: th })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Connecting Line */}
                    {index < status.timeline.length - 1 && (
                      <div 
                        className={`absolute left-6 top-12 w-0.5 ${lineColor} transition-colors duration-300`}
                        style={{ height: '24px' }}
                      ></div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Current Position Indicator */}
          {status.currentStep && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-sm font-medium text-blue-800 mb-1">
                  📍 ตำแหน่งปัจจุบัน
                </p>
                <p className="text-lg font-bold text-blue-900">
                  {status.currentStep.name}
                </p>
                {status.currentStep.queueNumber && (
                  <p className="text-sm text-blue-700 mt-1">
                    คิวที่: {status.currentStep.queueNumber}
                  </p>
                )}
                <p className="text-sm text-blue-600 mt-1">
                  ⏱️ ประมาณ {status.currentStep.estimatedWaitTime} นาที
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Next Step */}
        {status.nextStep && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              ขั้นตอนถัดไป 👉
            </h2>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="font-semibold text-gray-800 mb-2">
                {status.nextStep.name}
              </p>
              {status.nextStep.location && (
                <p className="text-sm text-gray-600 mb-1">
                  📍 {status.nextStep.location}
                  {status.nextStep.floor && ` ชั้น ${status.nextStep.floor}`}
                </p>
              )}
              {status.nextStep.preparationText && (
                <p className="text-sm text-gray-600 mb-1">
                  💡 {status.nextStep.preparationText}
                </p>
              )}
              <p className="text-sm text-gray-600">
                ⏰ รอประมาณ {status.nextStep.estimatedMinutes} นาที
              </p>
            </div>
          </div>
        )}

        {/* Notification Toggle */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={notificationsEnabled}
                onChange={(e) => handleNotificationToggle(e.target.checked)}
              />
              <span className="text-gray-700">🔔 เปิดการแจ้งเตือน (Browser)</span>
            </label>
            {notificationsEnabled && (
              <p className="text-sm text-gray-500 mt-2 ml-8">
                คุณจะได้รับการแจ้งเตือนเมื่อสถานะเปลี่ยน (ต้องเปิด browser ไว้)
              </p>
            )}
            {!notificationsEnabled && 'Notification' in window && Notification.permission === 'denied' && (
              <p className="text-sm text-red-500 mt-2 ml-8">
                ⚠️ การแจ้งเตือนถูกปิดในเบราว์เซอร์ กรุณาเปิดใน Settings
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={fcmEnabled}
                onChange={(e) => handleFCMToggle(e.target.checked)}
              />
              <span className="text-gray-700">🚀 เปิดการแจ้งเตือน (Web Push)</span>
            </label>
            {fcmEnabled && (
              <p className="text-sm text-gray-500 mt-2 ml-8">
                ✅ คุณจะได้รับการแจ้งเตือนแม้ปิด browser (Web Push Notifications)
              </p>
            )}
            {!fcmEnabled && (
              <p className="text-sm text-gray-500 mt-2 ml-8">
                💡 เปิดเพื่อรับการแจ้งเตือนแม้ปิด browser
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

