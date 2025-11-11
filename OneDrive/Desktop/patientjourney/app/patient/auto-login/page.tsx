'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function PatientAutoLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const autoLogin = async () => {
      try {
        const vn = searchParams.get('vn')
        const hn = searchParams.get('hn')

        if (!vn || !hn) {
          setError('ข้อมูลไม่ครบถ้วน กรุณาใช้ QR Code ที่ถูกต้อง')
          setLoading(false)
          return
        }

        // Trim whitespace
        const trimmedVn = vn.trim()
        const trimmedHn = hn.trim()

        console.log('[Auto Login] Attempting login with VN:', trimmedVn)

        // Call login API
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vn: trimmedVn, hn: trimmedHn }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Login failed')
        }

        // Store tokens
        localStorage.setItem('token', data.token)
        localStorage.setItem('refreshToken', data.refreshToken)
        localStorage.setItem('visitId', data.visitId)

        console.log('[Auto Login] Login successful, redirecting to dashboard')

        // Redirect to dashboard
        router.push('/patient/dashboard')
      } catch (err: any) {
        console.error('[Auto Login] Error:', err)
        setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
        setLoading(false)
      }
    }

    autoLogin()
  }, [router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            กำลังเข้าสู่ระบบ...
          </h2>
          <p className="text-gray-600">
            กรุณารอสักครู่
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            ไม่สามารถเข้าสู่ระบบได้
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/patient/login')}
            className="w-full bg-primary-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            ไปหน้าล็อกอิน
          </button>
        </div>
      </div>
    )
  }

  return null
}

