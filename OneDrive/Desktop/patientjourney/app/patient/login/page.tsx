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
      // Check if it's a URL (new format)
      if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
        // Extract VN and HN from URL query parameters
        try {
          const url = new URL(decodedText)
          const vnParam = url.searchParams.get('vn')
          const hnParam = url.searchParams.get('hn')
          
          if (vnParam && hnParam && url.pathname.includes('/patient/auto-login')) {
            // It's a valid auto-login URL, redirect directly
            console.log('[QR Scanner] Valid auto-login URL, redirecting...')
            setShowQRScanner(false)
            setScanMode(null)
            stopScanning()
            window.location.href = decodedText
            return
          } else {
            throw new Error('URL ไม่ถูกต้อง กรุณาใช้ QR Code ที่ได้รับจากเจ้าหน้าที่')
          }
        } catch (urlErr: any) {
          throw new Error('QR Code URL ไม่ถูกต้อง\n\nกรุณาใช้ QR Code ที่ได้รับจากเจ้าหน้าที่เท่านั้น')
        }
      }
      
      // Try to parse as JSON (old format for backward compatibility)
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
          throw new Error('QR Code format ไม่ถูกต้อง\n\nQR Code ต้องเป็น URL หรือมีข้อมูล VN และ HN ในรูปแบบ JSON')
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
      
      alert('❌ QR Code ไม่ถูกต้อง\n\n' + (err.message || 'กรุณาตรวจสอบว่า QR Code มาจากระบบนี้') + '\n\nคำแนะนำ:\n- ใช้ QR Code ที่ได้รับจากเจ้าหน้าที่เท่านั้น\n- QR Code ต้องเป็น URL หรือมีข้อมูล VN และ HN\n- ลองสแกนใหม่อีกครั้งหรือติดต่อเจ้าหน้าที่')
    }
  }

  const startCameraScan = async () => {
    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('เบราว์เซอร์ของคุณไม่รองรับการเข้าถึงกล้อง\n\nกรุณาใช้เบราว์เซอร์ที่ทันสมัย เช่น Chrome, Firefox, Safari หรือ Edge')
      }

      // Check if HTTPS or localhost (required for camera access)
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.endsWith('.vercel.app')
      
      if (!isSecure) {
        throw new Error('การเข้าถึงกล้องต้องใช้ HTTPS หรือ localhost\n\nกรุณาใช้ URL ที่ปลอดภัย (https://) หรือ localhost')
      }

      setScanMode('camera')
      setScanning(true)
      
      // Clear any existing scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop().catch(() => {})
          scannerRef.current.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
        scannerRef.current = null
      }

      // Request camera permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        })
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop())
      } catch (permErr: any) {
        if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
          throw new Error('คุณปฏิเสธการเข้าถึงกล้อง\n\nกรุณาอนุญาตการเข้าถึงกล้องใน Settings ของเบราว์เซอร์')
        } else if (permErr.name === 'NotFoundError' || permErr.name === 'DevicesNotFoundError') {
          throw new Error('ไม่พบกล้องในอุปกรณ์ของคุณ\n\nกรุณาตรวจสอบว่ามีกล้องเชื่อมต่ออยู่')
        }
        throw permErr
      }

      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      if (videoDevices.length === 0) {
        throw new Error('ไม่พบกล้องในอุปกรณ์ของคุณ')
      }

      // Try to find back camera first, otherwise use first available
      let cameraId: string | { facingMode: 'environment' } = { facingMode: 'environment' }
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      )
      
      if (backCamera) {
        cameraId = backCamera.deviceId
      } else if (videoDevices.length > 0) {
        // Use first camera if no back camera found
        cameraId = videoDevices[0].deviceId
      }

      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      // Try to start camera
      try {
        await html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            console.log('[QR Scanner] QR Code detected:', decodedText)
            handleQRCodeScanned(decodedText)
          },
          (errorMessage) => {
            // Ignore scanning errors (these are normal during scanning)
            // Only log if it's not a common scanning message
            if (!errorMessage.includes('No QR code found') && 
                !errorMessage.includes('NotFoundException') &&
                !errorMessage.includes('QR code parse error')) {
              console.log('[QR Scanner] Scanning...', errorMessage)
            }
          }
        )
      } catch (startErr: any) {
        // Handle specific camera errors
        if (startErr.name === 'NotAllowedError' || startErr.name === 'PermissionDeniedError') {
          throw new Error('คุณปฏิเสธการเข้าถึงกล้อง\n\nกรุณาอนุญาตการเข้าถึงกล้องใน Settings ของเบราว์เซอร์')
        } else if (startErr.name === 'NotFoundError' || startErr.name === 'DevicesNotFoundError') {
          throw new Error('ไม่พบกล้องในอุปกรณ์ของคุณ\n\nกรุณาตรวจสอบว่ามีกล้องเชื่อมต่ออยู่')
        } else if (startErr.message && startErr.message.includes('Permission')) {
          throw new Error('คุณปฏิเสธการเข้าถึงกล้อง\n\nกรุณาอนุญาตการเข้าถึงกล้องใน Settings ของเบราว์เซอร์')
        } else {
          throw startErr
        }
      }
    } catch (err: any) {
      console.error('Failed to start camera:', err)
      setScanning(false)
      setScanMode(null)
      
      let errorMessage = 'ไม่สามารถเปิดกล้องได้'
      if (err.message) {
        errorMessage = err.message
      } else if (err.name === 'NotAllowedError') {
        errorMessage = 'คุณปฏิเสธการเข้าถึงกล้อง\n\nกรุณาอนุญาตการเข้าถึงกล้องใน Settings ของเบราว์เซอร์'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'ไม่พบกล้องในอุปกรณ์ของคุณ\n\nกรุณาตรวจสอบว่ามีกล้องเชื่อมต่ออยู่'
      }
      
      alert(errorMessage + '\n\nคำแนะนำ:\n- ตรวจสอบว่าเบราว์เซอร์อนุญาตการเข้าถึงกล้อง\n- ใช้ HTTPS หรือ localhost\n- ลองใช้วิธีสแกนจากไฟล์แทน')
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

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ที่เล็กกว่า 10MB')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    try {
      setScanMode('file')
      setScanning(true)

      console.log('[QR Scanner] Attempting to scan file:', {
        name: file.name,
        size: file.size,
        type: file.type,
      })

      // Stop any existing camera scanner first
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop().catch(() => {})
        } catch (e) {
          // Ignore cleanup errors
        }
        try {
          scannerRef.current.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
        scannerRef.current = null
      }

      // Create a new instance for file scanning
      // Use a different element ID for file scanning to avoid conflicts
      const fileReaderId = 'qr-file-reader'
      
      // Create a temporary div for file scanning if it doesn't exist
      let fileReaderElement = document.getElementById(fileReaderId)
      if (!fileReaderElement) {
        fileReaderElement = document.createElement('div')
        fileReaderElement.id = fileReaderId
        fileReaderElement.style.display = 'none'
        document.body.appendChild(fileReaderElement)
      }

      const html5QrCode = new Html5Qrcode(fileReaderId)
      
      // Try to scan the file
      let result: string
      try {
        // Try scanFile first (most compatible)
        result = await html5QrCode.scanFile(file, false)
        console.log('[QR Scanner] Scan successful, result:', result)
      } catch (scanErr: any) {
        console.log('[QR Scanner] First scan attempt failed, trying alternative method')
        
        // If first attempt fails, try with showScanRegion: true
        try {
          result = await html5QrCode.scanFile(file, true)
          console.log('[QR Scanner] Scan successful on second attempt, result:', result)
        } catch (secondErr: any) {
          // Clean up before throwing
          try {
            await html5QrCode.clear()
          } catch (clearErr) {
            // Ignore clear errors
          }
          throw secondErr
        }
      }
      
      // Clean up scanner
      try {
        await html5QrCode.clear()
      } catch (clearErr) {
        // Ignore clear errors
      }
      
      // Remove temporary element
      if (fileReaderElement && fileReaderElement.parentNode) {
        fileReaderElement.parentNode.removeChild(fileReaderElement)
      }
      
      scannerRef.current = null
      setScanning(false)
      setScanMode(null)
      
      // Handle the scanned result
      handleQRCodeScanned(result)
    } catch (err: any) {
      console.error('Failed to scan file:', err)
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
      })
      
      // Clean up scanner
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch (clearErr) {
          // Ignore clear errors
        }
        scannerRef.current = null
      }
      
      // Remove temporary element
      const fileReaderElement = document.getElementById('qr-file-reader')
      if (fileReaderElement && fileReaderElement.parentNode) {
        fileReaderElement.parentNode.removeChild(fileReaderElement)
      }
      
      setScanning(false)
      setScanMode(null)
      
      // Show user-friendly error message
      let errorMessage = 'ไม่สามารถสแกน QR Code จากไฟล์ได้'
      
      if (err.message) {
        if (err.message.includes('No QR code found') || 
            err.message.includes('QR code parse error') ||
            err.message.includes('NotFoundException')) {
          errorMessage = 'ไม่พบ QR Code ในไฟล์นี้\n\nกรุณาตรวจสอบว่า:\n- ไฟล์มี QR Code ที่ชัดเจน\n- QR Code ไม่เบลอหรือเสียหาย\n- ไฟล์เป็นรูปภาพ PNG, JPG หรือ JPEG'
        } else if (err.message.includes('file') || err.message.includes('read')) {
          errorMessage = 'ไม่สามารถอ่านไฟล์ได้\n\nกรุณาตรวจสอบว่าไฟล์ไม่เสียหาย'
        } else {
          errorMessage = `เกิดข้อผิดพลาด: ${err.message}`
        }
      } else if (err.name) {
        errorMessage = `เกิดข้อผิดพลาด: ${err.name}`
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
              type="text"
              inputMode="numeric"
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
                <div 
                  id="qr-reader" 
                  className="w-full" 
                  style={{ 
                    minHeight: scanMode === 'camera' ? '300px' : '0',
                    display: scanMode === 'file' ? 'none' : 'block'
                  }}
                ></div>
                {scanMode === 'file' && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-2">กำลังสแกน QR Code จากไฟล์...</p>
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                )}
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

