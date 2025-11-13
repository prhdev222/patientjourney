'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'

interface Patient {
  vn: string
  visitId: string
  currentStep: {
    id: string
    name: string
    status: string
    department: string
    queueNumber?: number
    startTime: string
    endTime?: string
    notes?: string
  } | null
  allSteps?: Array<{
    id: string
    name: string
    status: string
    department: string
    queueNumber?: number
    startTime: string
    endTime?: string
    notes?: string
  }>
  startTime: string
}

interface ServiceStep {
  id: string
  name: string
  department: string
  location?: string
  floor?: number
  estimatedMinutes: number
}

export default function StaffDashboardPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [recentPatients, setRecentPatients] = useState<Patient[]>([])
  const [showRecentPatients, setShowRecentPatients] = useState(false)
  const [steps, setSteps] = useState<ServiceStep[]>([])
  const [loading, setLoading] = useState(true)
  const [searchVn, setSearchVn] = useState('')
  const [searchType, setSearchType] = useState<'VN' | 'HN'>('VN')
  const [user, setUser] = useState<any>(null)
  
  // Patient add modal states
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<string>('')
  const [newPatientVn, setNewPatientVn] = useState('')
  const [newPatientHn, setNewPatientHn] = useState('')
  const [todayStats, setTodayStats] = useState({
    total: 0,
    waiting: 0,
    inProgress: 0,
  })
  
  // Modal states
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showRevertModal, setShowRevertModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string>('')
  const [transferStepId, setTransferStepId] = useState('')
  const [noteText, setNoteText] = useState('')
  
  // QR Scanner states
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scanMode, setScanMode] = useState<'camera' | 'file' | null>(null)
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
    fetchData()
    // Poll every 30 seconds (reduced frequency to reduce server load)
    // Only fetch active patients, not completed
    const interval = setInterval(() => {
      fetchPatients(false)
      fetchTodayStats() // Also refresh statistics
    }, 30000) // Changed from 10s to 30s
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    await Promise.all([fetchPatients(false), fetchSteps(), fetchTodayStats()])
    setLoading(false)
  }

  const fetchTodayStats = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        return
      }

      // Get today's date range
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Build query parameters - use stats endpoint if available, otherwise use patients endpoint
      const params = new URLSearchParams()
      params.append('includeCompleted', 'true')
      params.append('dateFrom', today.toISOString())
      params.append('dateTo', tomorrow.toISOString())
      params.append('statsOnly', 'true') // Request only statistics, not full patient data

      const response = await fetch(`/api/staff/patients?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        return
      }

      const data = await response.json()
      
      // If API returns stats directly, use it
      if (data.stats) {
        setTodayStats(data.stats)
        return
      }

      // Otherwise, calculate from patients array (fallback)
      const allPatientsToday = data.patients || []

      // Calculate statistics
      const total = allPatientsToday.length
      const waiting = allPatientsToday.filter((p: Patient) => 
        p.currentStep?.status === 'waiting'
      ).length
      const inProgress = allPatientsToday.filter((p: Patient) => 
        p.currentStep?.status === 'in_progress'
      ).length

      setTodayStats({
        total,
        waiting,
        inProgress,
      })
    } catch (err: any) {
      console.error('Failed to fetch today stats:', err)
    }
  }

  const fetchPatients = async (includeCompleted: boolean = false) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/staff/login')
        return
      }

      // Build query parameters
      const params = new URLSearchParams()
      if (searchVn.trim()) {
        params.append('search', searchVn.trim())
        params.append('searchType', searchType) // Add search type (VN or HN)
        params.append('includeCompleted', 'true') // Include completed when searching
      } else if (includeCompleted) {
        params.append('includeCompleted', 'true')
      }

      const response = await fetch(`/api/staff/patients?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/staff/login')
        return
      }

      const data = await response.json()
      setPatients(data.patients || [])
    } catch (err: any) {
      console.error('Failed to fetch patients:', err)
    }
  }

  const handleSearch = () => {
    if (!searchVn.trim()) {
      alert('กรุณากรอก VN หรือ HN ที่ต้องการค้นหา')
      return
    }
    fetchPatients(true) // Include completed when searching
  }

  const handleClearSearch = () => {
    setSearchVn('')
    setSearchType('VN')
    setShowRecentPatients(false)
    fetchPatients(false) // Don't include completed when clearing search
  }

  const fetchRecentPatients = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/staff/login')
        return
      }

      // Get date range for last 8 hours
      const now = new Date()
      const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000) // 8 hours ago

      // Build query parameters
      const params = new URLSearchParams()
      params.append('includeCompleted', 'true')
      params.append('dateFrom', eightHoursAgo.toISOString())
      params.append('dateTo', now.toISOString())

      const response = await fetch(`/api/staff/patients?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/staff/login')
        return
      }

      const data = await response.json()
      setRecentPatients(data.patients || [])
    } catch (err: any) {
      console.error('Failed to fetch recent patients:', err)
    }
  }

  const handleShowRecentPatients = () => {
    setShowRecentPatients(true)
    setSearchVn('') // Clear search when showing recent patients
    fetchRecentPatients()
  }

  const handleHideRecentPatients = () => {
    setShowRecentPatients(false)
    fetchPatients(false) // Show only active patients
  }

  const handleAddPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!newPatientVn.trim() || !newPatientHn.trim()) {
      alert('กรุณากรอก VN และ HN')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/patients', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vn: newPatientVn.trim(),
          hn: newPatientHn.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setShowAddPatientModal(false)
        setNewPatientVn('')
        setNewPatientHn('')
        setQrCodeData(data.visit.qrCode)
        setShowQRModal(true)
        fetchPatients(false) // Refresh patient list
        fetchTodayStats() // Refresh statistics
        alert('เพิ่มผู้ป่วยสำเร็จ')
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err: any) {
      console.error('Failed to add patient:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  // Check if user has permission to add patients
  const [canAddPatients, setCanAddPatients] = useState(false)
  
  useEffect(() => {
    const fetchUserPermission = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token || !user?.id) return
        
        const response = await fetch(`/api/admin/staff/${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setCanAddPatients(data.staff?.canAddPatients || false)
        }
      } catch (err) {
        console.error('Failed to fetch user permission:', err)
      }
    }
    
    if (user?.id) {
      fetchUserPermission()
    }
  }, [user])

  const fetchSteps = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/staff/steps', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSteps(data.steps || [])
      }
    } catch (err: any) {
      console.error('Failed to fetch steps:', err)
    }
  }

  const handleUpdateStatus = async (vn: string, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/staff/update-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vn, status, notes }),
      })

      if (response.ok) {
        if (showRecentPatients) {
          fetchRecentPatients()
        } else {
          fetchPatients(false)
        }
        fetchTodayStats() // Refresh statistics
        if (notes) {
          setShowNoteModal(false)
          setNoteText('')
        }
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      console.error('Failed to update status:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleTransfer = async () => {
    if (!selectedPatient || !transferStepId) {
      alert('กรุณาเลือกหน่วยงานที่ต้องการส่งต่อ')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/staff/update-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vn: selectedPatient.vn,
          status: 'completed',
          nextStepId: transferStepId,
          notes: noteText || undefined,
        }),
      })

      if (response.ok) {
        setShowTransferModal(false)
        setTransferStepId('')
        setNoteText('')
        setSelectedPatient(null)
        if (showRecentPatients) {
          fetchRecentPatients()
        } else {
          fetchPatients(false)
        }
        fetchTodayStats() // Refresh statistics
        alert('ส่งต่อสำเร็จ')
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      console.error('Failed to transfer:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleOpenTransferModal = (patient: Patient) => {
    setSelectedPatient(patient)
    setShowTransferModal(true)
    setTransferStepId('')
    setNoteText('')
  }

  const handleOpenNoteModal = (patient: Patient) => {
    setSelectedPatient(patient)
    setShowNoteModal(true)
    setNoteText(patient.currentStep?.notes || '')
  }

  const handleAddNote = async () => {
    if (!selectedPatient || !noteText.trim()) {
      alert('กรุณาใส่ Note')
      return
    }

    await handleUpdateStatus(selectedPatient.vn, 'in_progress', noteText)
  }

  // QR Scanner functions
  const handleQRCodeScanned = async (decodedText: string) => {
    console.log('[Staff QR Scanner] Scanned text:', decodedText)
    
    try {
      // Check if it's a URL (patient auto-login URL)
      if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
        try {
          const url = new URL(decodedText)
          const vnParam = url.searchParams.get('vn')
          
          if (vnParam && url.pathname.includes('/patient/auto-login')) {
            console.log('[Staff QR Scanner] Found VN:', vnParam)
            // Stop scanning
            stopScanning()
            setShowQRScanner(false)
            
            // Search for patient by VN
            await searchPatientByVN(vnParam.trim())
            return
          } else {
            throw new Error('QR Code URL ไม่ถูกต้อง')
          }
        } catch (urlErr: any) {
          throw new Error('QR Code URL ไม่ถูกต้อง\n\nกรุณาใช้ QR Code ที่ได้รับจากระบบ')
        }
      }
      
      // Try to parse as JSON (old format for backward compatibility)
      try {
        const data = JSON.parse(decodedText)
        if (data.vn) {
          stopScanning()
          setShowQRScanner(false)
          await searchPatientByVN(data.vn)
          return
        }
      } catch (jsonErr) {
        // Not JSON, try to extract VN from text
        const vnMatch = decodedText.match(/VN[:\s]*(\d+)/i)
        if (vnMatch && vnMatch[1]) {
          stopScanning()
          setShowQRScanner(false)
          await searchPatientByVN(vnMatch[1])
          return
        }
      }
      
      throw new Error('ไม่พบข้อมูล VN ใน QR Code')
    } catch (err: any) {
      console.error('[Staff QR Scanner] Error:', err)
      alert('❌ QR Code ไม่ถูกต้อง\n\n' + (err.message || 'กรุณาตรวจสอบว่า QR Code มาจากระบบนี้') + '\n\nคำแนะนำ:\n- ใช้ QR Code ที่ได้รับจากระบบเท่านั้น\n- QR Code ต้องเป็น URL หรือมีข้อมูล VN\n- ลองสแกนใหม่อีกครั้ง')
    }
  }

  const searchPatientByVN = async (vn: string) => {
    try {
      setSearchVn(vn)
      setSearchType('VN')
      
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/staff/login')
        return
      }

      // Search in active patients first
      const response = await fetch(`/api/staff/patients?vn=${encodeURIComponent(vn)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/staff/login')
        return
      }

      const data = await response.json()
      const foundPatients = data.patients || []
      
      if (foundPatients.length > 0) {
        // Found patient, open manage modal
        const patient = foundPatients[0]
        setSelectedPatient(patient)
        setShowTransferModal(true)
        setTransferStepId('')
        setNoteText('')
        alert(`✅ พบผู้ป่วย VN: ${patient.vn}\n\nกำลังเปิดหน้าจัดการผู้ป่วย...`)
        return
      }

      // Not found in active patients, try recent patients
      const now = new Date()
      const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000)
      const params = new URLSearchParams()
      params.append('includeCompleted', 'true')
      params.append('dateFrom', eightHoursAgo.toISOString())
      params.append('dateTo', now.toISOString())
      params.append('vn', vn)

      const recentResponse = await fetch(`/api/staff/patients?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        const recentPatientsList = recentData.patients || []
        const recent = recentPatientsList.find((p: Patient) => p.vn === vn)
        
        if (recent) {
          setSelectedPatient(recent)
          setShowTransferModal(true)
          setTransferStepId('')
          setNoteText('')
          setShowRecentPatients(true)
          setRecentPatients(recentPatientsList)
          alert(`✅ พบผู้ป่วย VN: ${recent.vn}\n\nกำลังเปิดหน้าจัดการผู้ป่วย...`)
          return
        }
      }

      // Not found anywhere
      alert(`❌ ไม่พบผู้ป่วย VN: ${vn}\n\nกรุณาตรวจสอบว่า VN ถูกต้อง`)
    } catch (err: any) {
      console.error('Failed to search patient:', err)
      alert('เกิดข้อผิดพลาดในการค้นหาผู้ป่วย')
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

      const html5QrCode = new Html5Qrcode('staff-qr-reader')
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
            console.log('[Staff QR Scanner] QR Code detected:', decodedText)
            handleQRCodeScanned(decodedText)
          },
          (errorMessage) => {
            // Ignore scanning errors (these are normal during scanning)
            if (!errorMessage.includes('No QR code found') && 
                !errorMessage.includes('NotFoundException') &&
                !errorMessage.includes('QR code parse error')) {
              console.log('[Staff QR Scanner] Scanning...', errorMessage)
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
        setScanning(false)
        setScanMode(null)
      }).catch(() => {
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
      const fileReaderId = 'staff-qr-file-reader'
      
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
        result = await html5QrCode.scanFile(file, false)
        console.log('[Staff QR Scanner] Scan successful, result:', result)
      } catch (scanErr: any) {
        console.log('[Staff QR Scanner] First scan attempt failed, trying alternative method')
        
        // If first attempt fails, try with showScanRegion: true
        try {
          result = await html5QrCode.scanFile(file, true)
          console.log('[Staff QR Scanner] Scan successful on second attempt, result:', result)
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
      const fileReaderElement = document.getElementById('staff-qr-file-reader')
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

  const handleOpenRevertModal = (patient: Patient) => {
    setSelectedPatient(patient)
    setSelectedStepId(patient.currentStep?.id || '')
    setShowRevertModal(true)
  }

  const handleRevertStatus = async () => {
    if (!selectedPatient || !selectedStepId) {
      alert('เกิดข้อผิดพลาด')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/staff/revert-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          journeyStepId: selectedStepId,
          status: 'in_progress',
        }),
      })

      if (response.ok) {
        setShowRevertModal(false)
        setSelectedPatient(null)
        setSelectedStepId('')
        if (showRecentPatients) {
          fetchRecentPatients()
        } else {
          fetchPatients(false)
        }
        fetchTodayStats() // Refresh statistics
        alert('ย้อนกลับสถานะสำเร็จ')
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      console.error('Failed to revert status:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    router.push('/')
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              🏥 {user?.role === 'admin' ? 'ผู้ดูแลระบบ - ดูผู้ป่วยทั้งหมด' : `แผนก: ${user?.department || 'ไม่ระบุ'}`}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">👤 {user?.fullName || user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Add Patient Button (only for staff with permission) */}
        {canAddPatients && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <button
              onClick={() => setShowAddPatientModal(true)}
              className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              ➕ เพิ่มผู้ป่วยใหม่
            </button>
          </div>
        )}

        {/* Scan QR Code Button */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <button
            onClick={() => setShowQRScanner(true)}
            className="w-full bg-purple-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
          >
            📷 สแกน QR Code เพื่อจัดการผู้ป่วย
          </button>
        </div>

        {/* Search and Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2 mb-3">
            <div className="flex gap-2 flex-1">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as 'VN' | 'HN')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="VN">VN</option>
                <option value="HN">HN</option>
              </select>
              <input
                type="text"
                value={searchVn}
                onChange={(e) => setSearchVn(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={`ค้นหา ${searchType}...`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button 
              onClick={handleSearch}
              className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600"
            >
              🔍 ค้นหา
            </button>
            {searchVn && (
              <button 
                onClick={handleClearSearch}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                title="ล้างการค้นหา"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={showRecentPatients ? handleHideRecentPatients : handleShowRecentPatients}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showRecentPatients
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {showRecentPatients ? '✕ ปิดรายการ' : '📋 ข้อมูลผู้ป่วยในช่วงเวลา 8 ชั่วโมงล่าสุด'}
            </button>
            {showRecentPatients && (
              <span className="text-sm text-gray-600">
                รวม {recentPatients.length} คน
              </span>
            )}
          </div>
        </div>

        {/* Patients List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              {showRecentPatients ? '📋 ข้อมูลผู้ป่วยในช่วงเวลา 8 ชั่วโมงล่าสุด' : 'รายการผู้ป่วยปัจจุบัน'}
            </h2>
            {showRecentPatients && (
              <p className="text-sm text-gray-500 mt-1">
                ตั้งแต่ {new Date(Date.now() - 8 * 60 * 60 * 1000).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <div className="divide-y divide-gray-200">
            {(showRecentPatients ? recentPatients : patients).length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {showRecentPatients ? 'ไม่มีผู้ป่วยในช่วงเวลา 8 ชั่วโมงล่าสุด' : 'ไม่มีผู้ป่วยในระบบ'}
              </div>
            ) : (
              (showRecentPatients ? recentPatients : patients).map((patient) => {
                const isActive = patient.currentStep?.status === 'waiting' || patient.currentStep?.status === 'in_progress'
                const isCompleted = patient.currentStep?.status === 'completed'
                
                return (
                  <div 
                    key={patient.visitId} 
                    className={`p-4 transition-colors ${
                      isActive 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : isCompleted 
                          ? 'bg-gray-50 border-l-4 border-gray-300' 
                          : 'bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800">
                            VN: {patient.vn}
                          </p>
                          {isActive && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              กำลังดำเนินการ
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                              เสร็จสิ้น
                            </span>
                          )}
                        </div>
                        {patient.currentStep && (
                          <>
                            <p className={`text-sm mt-1 ${
                              isActive ? 'text-blue-700 font-medium' : 'text-gray-600'
                            }`}>
                              สถานะ: {patient.currentStep.name} ({patient.currentStep.status})
                            </p>
                            {patient.currentStep.queueNumber && (
                              <p className="text-sm text-gray-600">
                                คิว: {patient.currentStep.queueNumber}
                              </p>
                            )}
                            {patient.currentStep.notes && (
                              <p className="text-sm text-gray-500 mt-1 italic">
                                📝 {patient.currentStep.notes}
                              </p>
                            )}
                            {patient.allSteps && patient.allSteps.length > 1 && (
                              <details className="mt-2">
                                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                  📋 ประวัติ ({patient.allSteps.length} ขั้นตอน)
                                </summary>
                                <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200">
                                  {patient.allSteps.map((step, idx) => (
                                    <div key={step.id} className="text-xs text-gray-600">
                                      {idx + 1}. {step.name} - {step.status}
                                      {step.notes && <span className="text-gray-500"> ({step.notes})</span>}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {patient.currentStep?.status === 'waiting' && (
                          <button
                            onClick={() => handleUpdateStatus(patient.vn, 'in_progress')}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600"
                          >
                            เริ่ม
                          </button>
                        )}
                        {patient.currentStep?.status === 'in_progress' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(patient.vn, 'completed')}
                              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600"
                            >
                              เสร็จสิ้น
                            </button>
                            <button
                              onClick={() => handleOpenNoteModal(patient)}
                              className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600"
                            >
                              📝 Note
                            </button>
                            <button
                              onClick={() => handleOpenTransferModal(patient)}
                              className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600"
                            >
                              ส่งต่อ
                            </button>
                          </>
                        )}
                        {patient.currentStep?.status === 'completed' && (
                          <button
                            onClick={() => handleOpenRevertModal(patient)}
                            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600"
                          >
                            ✏️ แก้ไข/ย้อนกลับ
                          </button>
                        )}
                        {/* Show revert button if current step is waiting/in_progress but there's a completed step in this department */}
                        {patient.currentStep && 
                         (patient.currentStep.status === 'waiting' || patient.currentStep.status === 'in_progress') &&
                         patient.allSteps && 
                         patient.allSteps.some(step => 
                           step.status === 'completed' && 
                           (step.department === user?.department || step.name === user?.department)
                         ) && (
                          <button
                            onClick={() => {
                              // Find the completed step in this department (most recent completed step)
                              const completedSteps = patient.allSteps?.filter(step => 
                                step.status === 'completed' && 
                                (step.department === user?.department || step.name === user?.department)
                              )
                              // Get the most recent completed step (last in array since it's ordered by startTime desc)
                              const completedStep = completedSteps && completedSteps.length > 0 
                                ? completedSteps[0] 
                                : null
                              if (completedStep) {
                                const patientWithCompletedStep = {
                                  ...patient,
                                  currentStep: completedStep,
                                }
                                handleOpenRevertModal(patientWithCompletedStep)
                              }
                            }}
                            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600"
                          >
                            ✏️ แก้ไข/ย้อนกลับ (ขั้นตอนที่เสร็จแล้ว)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-2">สถิติวันนี้:</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">ผู้ป่วยทั้งหมด</p>
              <p className="text-xl font-bold text-gray-800">{todayStats.total} คน</p>
            </div>
            <div>
              <p className="text-gray-600">รอคิว</p>
              <p className="text-xl font-bold text-gray-800">
                {todayStats.waiting} คน
              </p>
            </div>
            <div>
              <p className="text-gray-600">กำลังดำเนินการ</p>
              <p className="text-xl font-bold text-gray-800">
                {todayStats.inProgress} คน
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Add Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">➕ เพิ่มผู้ป่วยใหม่</h3>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VN *
                </label>
                <input
                  type="text"
                  value={newPatientVn}
                  onChange={(e) => setNewPatientVn(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="กรอก VN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HN *
                </label>
                <input
                  type="text"
                  value={newPatientHn}
                  onChange={(e) => setNewPatientHn(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="กรอก HN"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
                >
                  เพิ่มผู้ป่วย
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPatientModal(false)
                    setNewPatientVn('')
                    setNewPatientHn('')
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrCodeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">📱 QR Code</h3>
            <div className="flex justify-center mb-4">
              <img src={qrCodeData} alt="QR Code" className="w-64 h-64" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = qrCodeData
                  link.download = `qr-${newPatientVn}.png`
                  link.click()
                }}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                💾 ดาวน์โหลด
              </button>
              <button
                onClick={() => {
                  setShowQRModal(false)
                  setQrCodeData('')
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">📤 ส่งต่อผู้ป่วย VN: {selectedPatient.vn}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ส่งไปยังหน่วยงาน *
                </label>
                <select
                  value={transferStepId}
                  onChange={(e) => setTransferStepId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">-- เลือกหน่วยงาน --</option>
                  {steps.map((step) => (
                    <option key={step.id} value={step.id}>
                      {step.name} - {step.department}
                      {step.location && ` (${step.location})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📝 หมายเหตุ (จะแจ้งเตือนผู้ป่วย)
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="เช่น: กรุณาเตรียมบัตรประชาชน, งดน้ำงดอาหาร 6 ชั่วโมง..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg h-24"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowTransferModal(false)
                  setTransferStepId('')
                  setNoteText('')
                  setSelectedPatient(null)
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleTransfer}
                className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
              >
                ส่งต่อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">📝 เพิ่มหมายเหตุ VN: {selectedPatient.vn}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  หมายเหตุ (จะแจ้งเตือนผู้ป่วย)
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="เช่น: กรุณาเตรียมบัตรประชาชน, งดน้ำงดอาหาร 6 ชั่วโมง..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg h-24"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowNoteModal(false)
                  setNoteText('')
                  setSelectedPatient(null)
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddNote}
                className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert Modal */}
      {showRevertModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">✏️ แก้ไข/ย้อนกลับสถานะ VN: {selectedPatient.vn}</h3>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ คุณกำลังจะย้อนกลับสถานะจาก <strong>เสร็จสิ้น</strong> เป็น <strong>กำลังดำเนินการ</strong>
                </p>
                {selectedPatient.currentStep && (
                  <p className="text-sm text-gray-700 mt-2">
                    ขั้นตอนปัจจุบัน: <strong>{selectedPatient.currentStep.name}</strong>
                  </p>
                )}
              </div>
              {selectedPatient.allSteps && selectedPatient.allSteps.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประวัติขั้นตอน:
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {selectedPatient.allSteps.map((step, idx) => (
                      <div key={step.id} className={`text-xs py-1 ${
                        step.status === 'completed' ? 'text-green-600' :
                        step.status === 'in_progress' ? 'text-blue-600' :
                        'text-gray-500'
                      }`}>
                        {idx + 1}. {step.name} - {step.status}
                        {step.notes && <span className="text-gray-500"> ({step.notes})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowRevertModal(false)
                  setSelectedPatient(null)
                  setSelectedStepId('')
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRevertStatus}
                className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
              >
                ย้อนกลับสถานะ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">📱 สแกน QR Code เพื่อจัดการผู้ป่วย</h3>
            
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
                  id="staff-qr-reader" 
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
