import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🏥 ระบบติดตาม Patient Journey
        </h1>
        <p className="text-gray-600 mb-8">
          ติดตามสถานะการรักษาแบบ Real-time
        </p>
        
        <div className="space-y-4">
          <Link
            href="/patient/login"
            className="block w-full bg-primary-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            เข้าสู่ระบบ (ผู้ป่วย)
          </Link>
        </div>
      </div>
    </div>
  )
}


