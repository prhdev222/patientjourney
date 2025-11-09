// Script to verify Firebase config from environment variables
// Run: node scripts/verify-firebase-config.js

require('dotenv').config({ path: '.env.local' })

console.log('🔍 ตรวจสอบ Firebase Config...\n')

// Check Frontend Config
console.log('📱 Frontend Config (NEXT_PUBLIC_*):')
console.log('  API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ มี' : '❌ ไม่มี')
console.log('  Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '❌ ไม่มี')
console.log('  Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '❌ ไม่มี')
console.log('  Storage Bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '❌ ไม่มี')
console.log('  Messaging Sender ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '❌ ไม่มี')
console.log('  App ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '❌ ไม่มี')
console.log('  VAPID Key:', process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ? '✅ มี' : '❌ ไม่มี')

console.log('\n🔧 Backend Config (Firebase Admin):')
console.log('  Project ID:', process.env.FIREBASE_PROJECT_ID || '❌ ไม่มี')
console.log('  Client Email:', process.env.FIREBASE_CLIENT_EMAIL || '❌ ไม่มี')
console.log('  Private Key:', process.env.FIREBASE_PRIVATE_KEY ? '✅ มี' : '❌ ไม่มี')

// Verify Private Key format
if (process.env.FIREBASE_PRIVATE_KEY) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
  const hasBegin = privateKey.includes('-----BEGIN PRIVATE KEY-----')
  const hasEnd = privateKey.includes('-----END PRIVATE KEY-----')
  const hasNewlines = privateKey.includes('\\n') || privateKey.includes('\n')
  
  console.log('\n🔐 Private Key Verification:')
  console.log('  Has BEGIN:', hasBegin ? '✅' : '❌')
  console.log('  Has END:', hasEnd ? '✅' : '❌')
  console.log('  Has newlines:', hasNewlines ? '✅' : '❌')
  
  if (hasBegin && hasEnd && hasNewlines) {
    console.log('\n✅ Private Key format ถูกต้อง!')
  } else {
    console.log('\n❌ Private Key format ไม่ถูกต้อง!')
  }
  
  // Check if newlines are escaped correctly
  if (privateKey.includes('\\n')) {
    console.log('  ✅ Newlines ถูก escape เป็น \\n (ถูกต้อง)')
  } else if (privateKey.includes('\n')) {
    console.log('  ⚠️  Newlines ไม่ได้ escape - ควรใช้ \\n ใน .env.local')
  }
}

console.log('\n📝 สรุป:')
const allFrontend = 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID

const allBackend =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY

if (allFrontend && allBackend) {
  console.log('✅ Firebase Config ครบถ้วน!')
} else {
  console.log('❌ Firebase Config ยังไม่ครบ - กรุณาตรวจสอบ .env.local')
}

