'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ServiceStep {
  id: string
  name: string
  department: string
  location?: string
  estimatedMinutes: number
  isActive: boolean
  displayOrder?: number
}

interface Staff {
  id: string
  username: string
  fullName?: string
  email?: string
  department: string
  isActive: boolean
}

interface Patient {
  id: string
  vn: string
  qrCode?: string
  startTime: string
  endTime?: string
  currentStep?: string
  createdAt: string
  updatedAt: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [steps, setSteps] = useState<ServiceStep[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to today's date
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [totalPatients, setTotalPatients] = useState(0)
  
  // Modal states
  const [showAddStepModal, setShowAddStepModal] = useState(false)
  const [showEditStepModal, setShowEditStepModal] = useState(false)
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [showEditStaffModal, setShowEditStaffModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showManageJourneyModal, setShowManageJourneyModal] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<string>('')
  const [editingStep, setEditingStep] = useState<ServiceStep | null>(null)
  const [selectedPatientVn, setSelectedPatientVn] = useState<string>('')
  const [journeySteps, setJourneySteps] = useState<Array<{
    id: string
    visitId: string
    stepId: string
    stepName: string
    stepDepartment: string
    status: string
    startTime: string
    endTime: string | null
    notes: string | null
    queueNumber: number | null
    updatedById: string | null
    createdAt: string
  }>>([])
  const [editingJourneyStep, setEditingJourneyStep] = useState<any>(null)
  
  // Unit staff management
  const [unitStaffList, setUnitStaffList] = useState<Array<{
    username: string
    password: string
    fullName: string
  }>>([])

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
    fetchData()
  }, [])

  // Auto-fetch when search or date changes (with debounce)
  useEffect(() => {
    // Skip on initial mount (only trigger when user actively changes filters)
    const hasActiveFilters = searchQuery.trim() || selectedDate
    if (!hasActiveFilters) return

    const timer = setTimeout(() => {
      fetchPatients()
    }, 500) // Debounce 500ms

    return () => clearTimeout(timer)
  }, [searchQuery, selectedDate])

  const fetchData = async () => {
    await Promise.all([fetchSteps(), fetchStaff(), fetchPatients()])
    setLoading(false)
  }

  const fetchSteps = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/admin/login')
        return
      }

      const response = await fetch('/api/admin/steps', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/admin/login')
        return
      }

      const data = await response.json()
      setSteps(data.steps || [])
    } catch (err: any) {
      console.error('Failed to fetch steps:', err)
    }
  }

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/admin/staff', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStaff(data.staff || [])
      }
    } catch (err: any) {
      console.error('Failed to fetch staff:', err)
    }
  }

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Build query parameters
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (selectedDate) {
        params.append('date', selectedDate)
      }
      params.append('limit', '100') // Increase limit to show more patients

      const response = await fetch(`/api/admin/patients?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPatients(data.visits || [])
        setTotalPatients(data.total || 0)
      }
    } catch (err: any) {
      console.error('Failed to fetch patients:', err)
    }
  }

  const handleSearch = () => {
    fetchPatients()
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    // Auto search when date changes
    setTimeout(() => {
      fetchPatients()
    }, 100)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedDate('')
    setTimeout(() => {
      fetchPatients()
    }, 100)
  }

  const fetchJourneySteps = async (vn: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/admin/patients/${vn}/journey-steps`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setJourneySteps(data.journeySteps || [])
      }
    } catch (err: any) {
      console.error('Failed to fetch journey steps:', err)
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    }
  }

  const handleUpdateJourneyStep = async (stepId: string, data: any) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('กรุณาเข้าสู่ระบบใหม่')
        router.push('/admin/login')
        return
      }

      console.log('[Admin Dashboard] Updating journey step:', stepId, data)

      const response = await fetch(`/api/admin/journey-steps/${stepId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await fetchJourneySteps(selectedPatientVn)
        setEditingJourneyStep(null)
        fetchPatients() // Refresh patient list
        alert('อัพเดทสำเร็จ')
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[Admin Dashboard] Failed to update journey step:', {
          status: response.status,
          statusText: response.statusText,
          error,
        })
        
        if (response.status === 401 || response.status === 403) {
          alert('สิทธิ์ไม่เพียงพอ กรุณาเข้าสู่ระบบใหม่')
          localStorage.removeItem('token')
          router.push('/admin/login')
        } else {
          alert(`เกิดข้อผิดพลาด: ${error.error || 'Unknown error'}`)
        }
      }
    } catch (err: any) {
      console.error('[Admin Dashboard] Failed to update journey step:', err)
      alert(`เกิดข้อผิดพลาด: ${err.message || 'Unknown error'}`)
    }
  }

  const handleDeleteJourneyStep = async (stepId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบขั้นตอนนี้?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/admin/journey-steps/${stepId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchJourneySteps(selectedPatientVn)
        fetchPatients() // Refresh patient list
        alert('ลบสำเร็จ')
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err: any) {
      console.error('Failed to delete journey step:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleCreateJourneyStep = async (data: any) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      console.log('[Admin Dashboard] Creating journey step with data:', data)

      const response = await fetch(`/api/admin/patients/${selectedPatientVn}/journey-steps`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await fetchJourneySteps(selectedPatientVn)
        setEditingJourneyStep(null)
        fetchPatients() // Refresh patient list
        alert('สร้างขั้นตอนสำเร็จ')
      } else {
        const error = await response.json()
        console.error('[Admin Dashboard] Failed to create journey step:', error)
        alert(`เกิดข้อผิดพลาด: ${error.error || 'Unknown error'}${error.details ? `\n\nDetails: ${JSON.stringify(error.details, null, 2)}` : ''}`)
      }
    } catch (err: any) {
      console.error('[Admin Dashboard] Failed to create journey step:', err)
      alert(`เกิดข้อผิดพลาด: ${err.message || 'Unknown error'}`)
    }
  }

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    const currentIndex = journeySteps.findIndex(js => js.id === stepId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= journeySteps.length) return

    const currentStep = journeySteps[currentIndex]
    const targetStep = journeySteps[newIndex]

    // Swap start times to reorder
    const currentStartTime = currentStep.startTime
    const targetStartTime = targetStep.startTime

    try {
      await Promise.all([
        handleUpdateJourneyStep(currentStep.id, { startTime: targetStartTime }),
        handleUpdateJourneyStep(targetStep.id, { startTime: currentStartTime }),
      ])
    } catch (err) {
      console.error('Failed to move step:', err)
      alert('เกิดข้อผิดพลาดในการเรียงลำดับ')
    }
  }

  const handleAddStep = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const unitName = formData.get('name') as string

    try {
      const token = localStorage.getItem('token')
      
      // Create unit (service step) - use unit name as department
      const stepResponse = await fetch('/api/admin/steps', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: unitName,
          department: unitName, // Use check-in point name as department
          estimatedMinutes: 30,
        }),
      })

      if (!stepResponse.ok) {
        const error = await stepResponse.json()
        alert(error.error || 'เกิดข้อผิดพลาดในการสร้างจุด check-in')
        return
      }

      const stepData = await stepResponse.json()
      const stepId = stepData.step.id

      // Create staff for this unit
      if (unitStaffList.length > 0) {
        for (const staffData of unitStaffList) {
          if (staffData.username && staffData.password) {
            await fetch('/api/admin/staff', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                username: staffData.username,
                password: staffData.password,
                fullName: staffData.fullName || undefined,
                department: unitName, // Use check-in point name as department
              }),
            })
          }
        }
      }

      setShowAddStepModal(false)
      setUnitStaffList([])
      fetchData()
        alert('เพิ่มจุด check-in สำเร็จ')
    } catch (err) {
      console.error('Failed to add step:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleAddStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      fullName: formData.get('fullName') as string || undefined,
      department: formData.get('department') as string, // This is now unit name (from dropdown)
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setShowAddStaffModal(false)
        fetchStaff()
        alert('เพิ่ม staff สำเร็จ')
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      console.error('Failed to add staff:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleEditStaff = (staff: Staff) => {
    setEditingStaff(staff)
    setShowEditStaffModal(true)
  }

  const handleUpdateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingStaff) return

    const formData = new FormData(e.currentTarget)
    const data: any = {
      username: formData.get('username') as string,
      fullName: formData.get('fullName') as string || undefined,
      department: formData.get('department') as string,
      isActive: formData.get('isActive') === 'true',
    }

    // Only include password if provided
    const password = formData.get('password') as string
    if (password && password.trim()) {
      data.password = password
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/staff/${editingStaff.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setShowEditStaffModal(false)
        setEditingStaff(null)
        fetchStaff()
        alert('แก้ไข staff สำเร็จ')
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      console.error('Failed to update staff:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('คุณแน่ใจว่าต้องการลบ staff นี้?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchStaff()
        alert('ลบ staff สำเร็จ')
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      console.error('Failed to delete staff:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleAddPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      vn: formData.get('vn') as string,
      hn: formData.get('hn') as string,
      startStepId: formData.get('startStepId') as string || undefined,
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/patients', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        setQrCodeData(result.visit.qrCode || '')
        setShowAddPatientModal(false)
        setShowQRModal(true)
        fetchPatients()
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      console.error('Failed to add patient:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow && qrCodeData) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - Patient</title>
            <style>
              body { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0;
                font-family: Arial, sans-serif;
              }
              img { 
                max-width: 500px; 
                height: auto;
              }
            </style>
          </head>
          <body>
            <img src="${qrCodeData}" alt="QR Code" />
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleEdit = async (step: ServiceStep) => {
    setEditingStep(step)
    setShowEditStepModal(true)
  }

  const handleUpdateStep = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingStep) return

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      location: formData.get('location') as string || undefined,
      estimatedMinutes: parseInt(formData.get('estimatedMinutes') as string) || 30,
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/steps/${editingStep.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setShowEditStepModal(false)
        setEditingStep(null)
        fetchSteps()
        alert('แก้ไขจุด check-in สำเร็จ')
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      console.error('Failed to update step:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจว่าต้องการลบขั้นตอนนี้?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/steps/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchSteps()
      }
    } catch (err) {
      console.error('Failed to delete step:', err)
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
          <h1 className="text-xl font-bold text-gray-800">🏥 Admin Dashboard</h1>
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

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowAddPatientModal(true)}
            className="bg-green-500 text-white px-6 py-4 rounded-lg hover:bg-green-600 text-center"
          >
            ➕ เพิ่มผู้ป่วย
          </button>
          <button
            onClick={() => setShowAddStaffModal(true)}
            className="bg-blue-500 text-white px-6 py-4 rounded-lg hover:bg-blue-600 text-center"
          >
            👥 เพิ่ม Staff
          </button>
          <button
            onClick={() => setShowAddStepModal(true)}
            className="bg-purple-500 text-white px-6 py-4 rounded-lg hover:bg-purple-600 text-center"
          >
            ⚙️ เพิ่มจุด check-in
          </button>
        </div>

        {/* Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 Overview Today</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">ผู้ป่วยทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-800">{patients.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Staff</p>
              <p className="text-2xl font-bold text-gray-800">{staff.length}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">จุด check-in</p>
              <p className="text-2xl font-bold text-gray-800">{steps.length}</p>
            </div>
          </div>
        </div>

        {/* Patients List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">👥 รายการผู้ป่วย</h2>
              <div className="text-sm text-gray-600">
                ทั้งหมด: <span className="font-semibold">{totalPatients}</span> คน
              </div>
            </div>
            
            {/* Search and Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🔍 ค้นหา VN
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="ค้นหา VN..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={handleSearch}
                    className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600"
                  >
                    ค้นหา
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📅 เลือกวันที่
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {selectedDate && (
                    <button
                      onClick={handleClearFilters}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
                      title="ล้างตัวกรอง"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {patients.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                ไม่มีผู้ป่วยในระบบ
              </div>
            ) : (
              patients.map((patient) => (
                <div key={patient.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">VN: {patient.vn}</p>
                    <p className="text-sm text-gray-600">
                      {patient.currentStep || 'ยังไม่เริ่มขั้นตอน'}
                    </p>
                    <p className="text-sm text-gray-500">
                      เริ่มต้น: {new Date(patient.startTime).toLocaleString('th-TH')}
                    </p>
                    {patient.endTime && (
                      <p className="text-sm text-gray-500">
                        สิ้นสุด: {new Date(patient.endTime).toLocaleString('th-TH')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setSelectedPatientVn(patient.vn)
                        await fetchJourneySteps(patient.vn)
                        setShowManageJourneyModal(true)
                      }}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600"
                    >
                      ⚙️ จัดการขั้นตอน
                    </button>
                    {patient.qrCode && (
                      <button
                        onClick={() => {
                          setQrCodeData(patient.qrCode!)
                          setShowQRModal(true)
                        }}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600"
                      >
                        📱 ดู QR Code
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Staff List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">👥 รายการ Staff</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {staff.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                ไม่มี staff ในระบบ
              </div>
            ) : (
              staff.map((s) => (
                <div key={s.id} className="p-4 flex justify-between items-center border-b border-gray-200 last:border-b-0">
                  <div>
                    <p className="font-semibold text-gray-800">{s.username}</p>
                    {s.fullName && (
                      <p className="text-sm text-gray-600">{s.fullName}</p>
                    )}
                    <p className="text-sm text-gray-500">แผนก: {s.department}</p>
                    <p className={`text-xs mt-1 ${s.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {s.isActive ? '✅ ใช้งาน' : '❌ ปิดการใช้งาน'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditStaff(s)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600"
                    >
                      ✏️ แก้ไข
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(s.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
                    >
                      🗑️ ลบ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Steps Management */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">⚙️ จัดการจุด check-in</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {steps.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                ไม่มีจุด check-in ในระบบ
              </div>
            ) : (
              steps.map((step, index) => (
                <div key={step.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {index + 1}. {step.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {step.location && `${step.location}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      เวลาโดยประมาณ: {step.estimatedMinutes} นาที
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(step)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(step.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Add Step Modal */}
      {showAddStepModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">➕ เพิ่มจุด check-in</h3>
            <form onSubmit={handleAddStep}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อจุด check-in *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Staff List for this unit */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium text-gray-700">
                      👥 Staff ประจำจุด check-in
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setUnitStaffList([...unitStaffList, { username: '', password: '', fullName: '' }])
                      }}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                      + เพิ่ม Staff
                    </button>
                  </div>
                  
                  {unitStaffList.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      ยังไม่มี Staff - คลิก "+ เพิ่ม Staff" เพื่อเพิ่ม
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {unitStaffList.map((staff, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-sm font-medium text-gray-700">
                              Staff #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newList = unitStaffList.filter((_, i) => i !== index)
                                setUnitStaffList(newList)
                              }}
                              className="text-red-500 text-sm hover:text-red-700"
                            >
                              ลบ
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Username *
                              </label>
                              <input
                                type="text"
                                value={staff.username}
                                onChange={(e) => {
                                  const newList = [...unitStaffList]
                                  newList[index].username = e.target.value
                                  setUnitStaffList(newList)
                                }}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Password *
                              </label>
                              <input
                                type="password"
                                value={staff.password}
                                onChange={(e) => {
                                  const newList = [...unitStaffList]
                                  newList[index].password = e.target.value
                                  setUnitStaffList(newList)
                                }}
                                required
                                minLength={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                ชื่อ-นามสกุล
                              </label>
                              <input
                                type="text"
                                value={staff.fullName}
                                onChange={(e) => {
                                  const newList = [...unitStaffList]
                                  newList[index].fullName = e.target.value
                                  setUnitStaffList(newList)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStepModal(false)
                    setUnitStaffList([])
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Step Modal */}
      {showEditStepModal && editingStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">✏️ แก้ไขจุด check-in</h3>
            <form onSubmit={handleUpdateStep}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อจุด check-in *
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingStep.name}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    สถานที่
                  </label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={editingStep.location || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เวลาโดยประมาณ (นาที)
                  </label>
                  <input
                    type="number"
                    name="estimatedMinutes"
                    defaultValue={editingStep.estimatedMinutes || 30}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditStepModal(false)
                    setEditingStep(null)
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">👥 เพิ่ม Staff</h3>
            <form onSubmit={handleAddStaff}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    name="username"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    จุด check-in *
                  </label>
                  <select
                    name="department"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">-- เลือกจุด check-in --</option>
                    {steps.map((step) => (
                      <option key={step.id} value={step.name}>
                        {step.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditStaffModal && editingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">✏️ แก้ไข Staff</h3>
            <form onSubmit={handleUpdateStaff}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    name="username"
                    defaultValue={editingStaff.username}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)
                  </label>
                  <input
                    type="password"
                    name="password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    defaultValue={editingStaff.fullName || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    จุด check-in *
                  </label>
                  <select
                    name="department"
                    defaultValue={editingStaff.department}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">-- เลือกจุด check-in --</option>
                    {steps.map((step) => (
                      <option key={step.id} value={step.name}>
                        {step.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    สถานะ
                  </label>
                  <select
                    name="isActive"
                    defaultValue={editingStaff.isActive ? 'true' : 'false'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="true">✅ ใช้งาน</option>
                    <option value="false">❌ ปิดการใช้งาน</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditStaffModal(false)
                    setEditingStaff(null)
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">➕ เพิ่มผู้ป่วย</h3>
            <form onSubmit={handleAddPatient}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VN (Visit Number) *
                  </label>
                  <input
                    type="text"
                    name="vn"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HN (Hospital Number) *
                  </label>
                  <input
                    type="text"
                    name="hn"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ขั้นตอนเริ่มต้น (Optional)
                  </label>
                  <select
                    name="startStepId"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">-- เลือกขั้นตอน --</option>
                    {steps.map((step) => (
                      <option key={step.id} value={step.id}>
                        {step.name} - {step.department}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
                >
                  บันทึก
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
              <img src={qrCodeData} alt="QR Code" className="max-w-full h-auto" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowQRModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                ปิด
              </button>
              <button
                onClick={handlePrintQR}
                className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
              >
                🖨️ พิมพ์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Journey Steps Modal */}
      {showManageJourneyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">⚙️ จัดการขั้นตอน VN: {selectedPatientVn}</h3>
              <button
                onClick={() => {
                  setShowManageJourneyModal(false)
                  setEditingJourneyStep(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Add New Step Button */}
            <div className="mb-4">
              <button
                onClick={() => setEditingJourneyStep({ isNew: true })}
                className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600"
              >
                ➕ เพิ่มขั้นตอนใหม่
              </button>
            </div>

            {/* Journey Steps List */}
            <div className="space-y-3">
              {journeySteps.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  ไม่มีขั้นตอน
                </div>
              ) : (
                journeySteps.map((step, index) => (
                  <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                    {editingJourneyStep?.id === step.id ? (
                      // Edit Form
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ขั้นตอน</label>
                            <select
                              value={editingJourneyStep.stepId}
                              onChange={(e) => setEditingJourneyStep({ ...editingJourneyStep, stepId: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              {steps.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} - {s.department}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                            <select
                              value={editingJourneyStep.status}
                              onChange={(e) => setEditingJourneyStep({ ...editingJourneyStep, status: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="waiting">waiting</option>
                              <option value="in_progress">in_progress</option>
                              <option value="completed">completed</option>
                              <option value="skipped">skipped</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่มต้น</label>
                            <div className="flex gap-2">
                              <input
                                type="datetime-local"
                                value={editingJourneyStep.startTime ? new Date(editingJourneyStep.startTime).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setEditingJourneyStep({ ...editingJourneyStep, startTime: new Date(e.target.value).toISOString() })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const now = new Date()
                                  setEditingJourneyStep({ ...editingJourneyStep, startTime: now.toISOString() })
                                }}
                                className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 whitespace-nowrap"
                                title="ตั้งเป็นเวลาปัจจุบัน"
                              >
                                ⏰ ตอนนี้
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาสิ้นสุด</label>
                            <div className="flex gap-2">
                              <input
                                type="datetime-local"
                                value={editingJourneyStep.endTime ? new Date(editingJourneyStep.endTime).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setEditingJourneyStep({ ...editingJourneyStep, endTime: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const now = new Date()
                                  setEditingJourneyStep({ ...editingJourneyStep, endTime: now.toISOString() })
                                }}
                                className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 whitespace-nowrap"
                                title="ตั้งเป็นเวลาปัจจุบัน"
                              >
                                ⏰ ตอนนี้
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Queue Number</label>
                            <input
                              type="number"
                              value={editingJourneyStep.queueNumber ?? ''}
                              onChange={(e) => setEditingJourneyStep({ ...editingJourneyStep, queueNumber: e.target.value ? parseInt(e.target.value) : null })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="หมายเลขคิว"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Journey Step ID</label>
                            <input
                              type="text"
                              value={editingJourneyStep.id || ''}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-500"
                              title="ID จาก database (read-only)"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                          <textarea
                            value={editingJourneyStep.notes || ''}
                            onChange={(e) => setEditingJourneyStep({ ...editingJourneyStep, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            rows={2}
                            placeholder="หมายเหตุ (สามารถลบได้โดยลบข้อความทั้งหมด)"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const updateData: any = {
                                status: editingJourneyStep.status,
                                startTime: editingJourneyStep.startTime,
                                endTime: editingJourneyStep.endTime,
                                queueNumber: editingJourneyStep.queueNumber || null,
                              }
                              
                              // Handle notes: if empty string, send null; otherwise send the value
                              if (editingJourneyStep.notes === undefined || editingJourneyStep.notes === '') {
                                updateData.notes = null
                              } else {
                                updateData.notes = editingJourneyStep.notes
                              }
                              
                              console.log('[Admin Dashboard] Update data:', updateData)
                              handleUpdateJourneyStep(step.id, updateData)
                            }}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600"
                          >
                            💾 บันทึก
                          </button>
                          <button
                            onClick={() => setEditingJourneyStep(null)}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm hover:bg-gray-300"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : editingJourneyStep?.isNew ? (
                      // New Step Form
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ขั้นตอน *</label>
                            <select
                              value={editingJourneyStep.stepId || ''}
                              onChange={(e) => setEditingJourneyStep({ ...editingJourneyStep, stepId: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              required
                            >
                              <option value="">-- เลือกขั้นตอน --</option>
                              {steps.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} - {s.department}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ *</label>
                            <select
                              value={editingJourneyStep.status || 'waiting'}
                              onChange={(e) => setEditingJourneyStep({ ...editingJourneyStep, status: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="waiting">waiting</option>
                              <option value="in_progress">in_progress</option>
                              <option value="completed">completed</option>
                              <option value="skipped">skipped</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่มต้น</label>
                            <div className="flex gap-2">
                              <input
                                type="datetime-local"
                                value={editingJourneyStep.startTime ? new Date(editingJourneyStep.startTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
                                onChange={(e) => setEditingJourneyStep({ ...editingJourneyStep, startTime: new Date(e.target.value).toISOString() })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const now = new Date()
                                  setEditingJourneyStep({ ...editingJourneyStep, startTime: now.toISOString() })
                                }}
                                className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 whitespace-nowrap"
                                title="ตั้งเป็นเวลาปัจจุบัน"
                              >
                                ⏰ ตอนนี้
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาสิ้นสุด</label>
                            <div className="flex gap-2">
                              <input
                                type="datetime-local"
                                value={editingJourneyStep.endTime ? new Date(editingJourneyStep.endTime).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setEditingJourneyStep({ ...editingJourneyStep, endTime: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const now = new Date()
                                  setEditingJourneyStep({ ...editingJourneyStep, endTime: now.toISOString() })
                                }}
                                className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 whitespace-nowrap"
                                title="ตั้งเป็นเวลาปัจจุบัน"
                              >
                                ⏰ ตอนนี้
                              </button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                          <textarea
                            value={editingJourneyStep.notes || ''}
                            onChange={(e) => setEditingJourneyStep({ ...editingJourneyStep, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (!editingJourneyStep.stepId) {
                                alert('กรุณาเลือกขั้นตอน')
                                return
                              }
                              handleCreateJourneyStep({
                                stepId: editingJourneyStep.stepId,
                                status: editingJourneyStep.status || 'waiting',
                                notes: editingJourneyStep.notes || null,
                                startTime: editingJourneyStep.startTime || new Date().toISOString(),
                                endTime: editingJourneyStep.endTime || null,
                                queueNumber: editingJourneyStep.queueNumber || null,
                              })
                            }}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600"
                          >
                            สร้าง
                          </button>
                          <button
                            onClick={() => setEditingJourneyStep(null)}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm hover:bg-gray-300"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Display Mode
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-800">{index + 1}. {step.stepName}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              step.status === 'completed' ? 'bg-green-100 text-green-700' :
                              step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              step.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {step.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <details className="cursor-pointer">
                              <summary className="font-medium text-gray-700 hover:text-gray-900">📊 ข้อมูล Database</summary>
                              <div className="mt-2 pl-4 space-y-1 text-xs bg-gray-50 p-2 rounded">
                                <p><strong>ID:</strong> {step.id}</p>
                                <p><strong>Visit ID:</strong> {step.visitId}</p>
                                <p><strong>Step ID:</strong> {step.stepId}</p>
                                <p><strong>Queue Number:</strong> {step.queueNumber ?? 'null'}</p>
                                <p><strong>Updated By ID:</strong> {step.updatedById ?? 'null'}</p>
                                <p><strong>Created At:</strong> {new Date(step.createdAt).toLocaleString('th-TH')}</p>
                              </div>
                            </details>
                            <p><strong>แผนก:</strong> {step.stepDepartment}</p>
                            <p><strong>เริ่มต้น:</strong> {new Date(step.startTime).toLocaleString('th-TH')}</p>
                            {step.endTime && (
                              <p><strong>สิ้นสุด:</strong> {new Date(step.endTime).toLocaleString('th-TH')}</p>
                            )}
                            {step.queueNumber && (
                              <p><strong>คิว:</strong> {step.queueNumber}</p>
                            )}
                            {step.notes && (
                              <p className="text-gray-500 italic">📝 <strong>Note:</strong> {step.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMoveStep(step.id, 'up')}
                            disabled={index === 0}
                            className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="ย้ายขึ้น"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveStep(step.id, 'down')}
                            disabled={index === journeySteps.length - 1}
                            className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="ย้ายลง"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => setEditingJourneyStep({ ...step, stepId: step.stepId })}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                          >
                            ✏️ แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteJourneyStep(step.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                          >
                            🗑️ ลบ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
