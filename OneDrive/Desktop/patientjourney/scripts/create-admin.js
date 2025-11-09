/**
 * Script สำหรับสร้าง Admin Account ใน Production Database
 * 
 * วิธีใช้งาน:
 * 1. ตั้งค่า DATABASE_URL ใน environment variable
 * 2. รัน: node scripts/create-admin.js
 * 
 * หรือใช้ dotenv-cli:
 * npx dotenv-cli -e .env.local -- node scripts/create-admin.js
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const readline = require('readline')

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function main() {
  console.log('\n🔐 สร้าง Admin Account\n')
  console.log('============================================================\n')

  // Get admin details
  const username = await question('Username (default: admin): ') || 'admin'
  const password = await question('Password (min 6 characters): ')
  const fullName = await question('Full Name (optional): ') || null
  const email = await question('Email (optional): ') || null

  if (!password || password.length < 6) {
    console.error('\n❌ Password ต้องมีอย่างน้อย 6 ตัวอักษร')
    process.exit(1)
  }

  try {
    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { username },
    })

    if (existing) {
      const update = await question(`\n⚠️  Username "${username}" มีอยู่แล้ว ต้องการอัปเดต password? (y/n): `)
      if (update.toLowerCase() !== 'y') {
        console.log('\n❌ ยกเลิกการสร้าง admin account')
        process.exit(0)
      }

      // Update existing admin
      const passwordHash = await bcrypt.hash(password, 12)
      const updated = await prisma.user.update({
        where: { username },
        data: {
          passwordHash,
          role: 'admin',
          fullName: fullName || undefined,
          email: email || undefined,
          isActive: true,
        },
      })

      console.log('\n✅ อัปเดต Admin Account สำเร็จ!')
      console.log('\n📝 Account Details:')
      console.log(`   Username: ${updated.username}`)
      console.log(`   Full Name: ${updated.fullName || 'N/A'}`)
      console.log(`   Email: ${updated.email || 'N/A'}`)
      console.log(`   Role: ${updated.role}`)
      console.log(`   Status: ${updated.isActive ? '✅ Active' : '❌ Inactive'}`)
    } else {
      // Create new admin
      const passwordHash = await bcrypt.hash(password, 12)
      const admin = await prisma.user.create({
        data: {
          username,
          passwordHash,
          role: 'admin',
          fullName: fullName || undefined,
          email: email || undefined,
          isActive: true,
        },
      })

      console.log('\n✅ สร้าง Admin Account สำเร็จ!')
      console.log('\n📝 Account Details:')
      console.log(`   Username: ${admin.username}`)
      console.log(`   Full Name: ${admin.fullName || 'N/A'}`)
      console.log(`   Email: ${admin.email || 'N/A'}`)
      console.log(`   Role: ${admin.role}`)
      console.log(`   Status: ${admin.isActive ? '✅ Active' : '❌ Inactive'}`)
    }

    console.log('\n============================================================\n')
    console.log('🔗 Login URL:')
    console.log('   https://your-app.vercel.app/hospital')
    console.log('\n============================================================\n')

  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาด:', error.message)
    if (error.code === 'P2002') {
      console.error('   Username นี้มีอยู่แล้ว')
    }
    process.exit(1)
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

main()

