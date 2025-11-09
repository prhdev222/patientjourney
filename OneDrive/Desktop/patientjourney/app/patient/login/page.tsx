'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode'

export default function PatientLoginPage() {
  const router = useRouter()
  const [vn, setVn] = useState('')
  const [hn, setHn] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scanMode, setScanMode] = useState<'camera' | 'file' | null>(null)
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Trim whitespace before sending
      const trimmedVn = vn.trim()
      const trimmedHn = hn.trim()
      
      console.log('[Login Page] Sending:', { vn: trimmedVn, hnLength: trimmedHn.length })
      
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

      // Redirect to dashboard
      router.push('/patient/dashboard')
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
    } finally {
      setLoading(false)
    }
  }

  const handleQRCodeScanned = (decodedText: string) => {
    console.log('[QR Scanner] Scanned text:', decodedText)
    console.log('[QR Scanner] Text length:', decodedText.length)
    console.log('[QR Scanner] First 50 chars:', decodedText.substring(0, 50))
    
    try {
      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(decodedText)
        console.log('[QR Scanner] Parsed as JSON:', data)
      } catch (parseErr) {
        console.log('[QR Scanner] Not JSON, trying to extract VN/HN from text')
        
        // If not JSON, try to extract VN and HN from text
        // Format might be: vn:123,hn:456 or {"vn":"123","hn":"456"}
        const vnMatch = decodedText.match(/["']?vn["']?\s*[:=]\s*["']?([^"',}\s]+)/i)
        const hnMatch = decodedText.match(/["']?hn["']?\s*[:=]\s*["']?([^"',}\s]+)/i)
        
        console.log('[QR Scanner] VN match:', vnMatch)
        console.log('[QR Scanner] HN match:', hnMatch)
        
        if (vnMatch && hnMatch) {
          data = { vn: vnMatch[1], hn: hnMatch[1] }
          console.log('[QR Scanner] Extracted data:', data)
        } else {
          // Check if it's a URL or other format
          if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
            throw new Error('QR Code นี้เป็น URL ไม่ใช่ QR Code จากระบบ\n\nกรุณาใช้ QR Code ที่ได้รับจากเจ้าหน้าที่เท่านั้น')
          } else {
            throw new Error('QR Code format ไม่ถูกต้อง\n\nQR Code ต้องมีข้อมูล VN และ HN ในรูปแบบ JSON: {"vn":"...","hn":"..."}')
          }
        }
      }
      
      if (data && data.vn && data.hn) {
        const vnValue = data.vn.toString().trim()
        const hnValue = data.hn.toString().trim()
        
        console.log('[QR Scanner] Setting VN:', vnValue, 'HN:', hnValue)
        
        setVn(vnValue)
        setHn(hnValue)
        setShowQRScanner(false)
        setScanMode(null)
        stopScanning()
        alert('✅ สแกน QR Code สำเร็จ!\n\nVN: ' + vnValue + '\nHN: ' + hnValue + '\n\nกรุณากด "เข้าสู่ระบบ" เพื่อดำเนินการต่อ')
      } else {
        throw new Error('QR Code ไม่มีข้อมูล VN หรือ HN\n\nกรุณาตรวจสอบว่า QR Code มาจากระบบนี้')
      }
    } catch (err: any) {
      console.error('[QR Scanner] Failed to parse QR code:', err)
      console.error('[QR Scanner] Error details:', {
        message: err.message,
        name: err.name,
        scannedText: decodedText,
      })
      
      alert('❌ QR Code ไม่ถูกต้อง\n\n' + (err.message || 'กรุณาตรวจสอบว่า QR Code มาจากระบบนี้') + '\n\nคำแนะนำ:\n- ใช้ QR Code ที่ได้รับจากเจ้าหน้าที่เท่านั้น\n- QR Code ต้องมีข้อมูล VN และ HN\n- ลองสแกนใหม่อีกครั้งหรือติดต่อเจ้าหน้าที่')
    }
  }

  const startCameraScan = async () => {
    try {
      setScanMode('camera')
      setScanning(true)
      
      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleQRCodeScanned(decodedText)
        },
        (errorMessage) => {
          // Ignore scanning errors
        }
      )
    } catch (err: any) {
      console.error('Failed to start camera:', err)
      alert('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้อง')
      setScanning(false)
      setScanMode(null)
    }
  }

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear()
        scannerRef.current = null
        setScanning(false)
        setScanMode(null)
      }).catch((err) => {
        console.error('Failed to stop scanner:', err)
        scannerRef.current = null
        setScanning(false)
        setScanMode(null)
      })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (PNG, JPG, JPEG)')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    try {
      setScanMode('file')
      setScanning(true)

      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      // Try to scan the file with better error handling
      // Use scanFile with showScanRegion: false
      console.log('[QR Scanner] Attempting to scan file:', {
        name: file.name,
        size: file.size,
        type: file.type,
      })
      
      const result = await html5QrCode.scanFile(file, false)
      
      console.log('[QR Scanner] Scan successful, result:', result)
      
      // Clean up scanner
      scannerRef.current = null
      setScanning(false)
      setScanMode(null)
      
      // Handle the scanned result
      handleQRCodeScanned(result)
    } catch (err: any) {
      console.error('Failed to scan file:', err)
      
      // Clean up scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.clear()
        } catch (clearErr) {
          // Ignore clear errors
        }
        scannerRef.current = null
      }
      
      setScanning(false)
      setScanMode(null)
      
      // Show user-friendly error message
      let errorMessage = 'ไม่สามารถสแกน QR Code จากไฟล์ได้'
      
      if (err.message) {
        if (err.message.includes('No QR code found')) {
          errorMessage = 'ไม่พบ QR Code ในไฟล์นี้ กรุณาตรวจสอบว่าไฟล์มี QR Code ที่ชัดเจน'
        } else if (err.message.includes('file')) {
          errorMessage = 'ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าไฟล์ไม่เสียหาย'
        }
      }
      
      alert(errorMessage + '\n\nคำแนะนำ:\n- ตรวจสอบว่าไฟล์เป็นรูปภาพที่มี QR Code\n- ตรวจสอบว่า QR Code ชัดเจนและไม่เบลอ\n- ลองใช้ไฟล์อื่นหรือสแกนจากกล้องแทน')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          🏥 เข้าสู่ระบบ (ผู้ป่วย)
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="vn" className="block text-sm font-medium text-gray-700 mb-1">
              VN (หมายเลขการเข้ารับบริการ)
            </label>
            <input
              id="vn"
              type="text"
              value={vn}
              onChange={(e) => setVn(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="เช่น 67010001"
            />
          </div>

          <div>
            <label htmlFor="hn" className="block text-sm font-medium text-gray-700 mb-1">
              HN (หมายเลขประจำตัวผู้ป่วย)
            </label>
            <input
              id="hn"
              type="password"
              value={hn}
              onChange={(e) => setHn(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="เช่น 1234567"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-primary-600 hover:text-primary-700">
            ← กลับหน้าหลัก
          </Link>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowQRScanner(true)}
            className="text-sm text-primary-600 hover:text-primary-700 underline"
          >
            หรือสแกน QR Code ที่ได้รับจากเจ้าหน้าที่
          </button>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">📱 สแกน QR Code</h3>
            
            {!scanMode ? (
              <div className="space-y-4">
                <button
                  onClick={startCameraScan}
                  className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                >
                  📷 สแกนจากกล้อง
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors"
                >
                  📁 เลือกไฟล์รูปภาพ
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => {
                    setShowQRScanner(false)
                    stopScanning()
                  }}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {scanMode === 'file' && scanning && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-2">กำลังสแกน QR Code จากไฟล์...</p>
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                )}
                <div id="qr-reader" className="w-full" style={{ minHeight: scanMode === 'camera' ? '300px' : '0' }}></div>
                {scanMode === 'camera' && (
                  <p className="text-sm text-gray-600 text-center">
                    📷 นำกล้องไปชี้ที่ QR Code
                  </p>
                )}
                {scanMode === 'file' && !scanning && (
                  <p className="text-sm text-gray-600 text-center">
                    📁 กรุณาเลือกไฟล์รูปภาพที่มี QR Code
                  </p>
                )}
                <button
                  onClick={() => {
                    stopScanning()
                    setShowQRScanner(false)
                  }}
                  className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-600 transition-colors"
                >
                  {scanMode === 'camera' ? 'หยุดสแกน' : 'ปิด'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

