/**
 * Quick Script สำหรับสร้าง Admin Account (ไม่ต้องกรอกข้อมูล)
 * 
 * วิธีใช้งาน:
 * npx dotenv-cli -e .env.local -- node scripts/create-admin-quick.js
 * 
 * หรือตั้งค่า environment variables:
 * ADMIN_USERNAME=admin
 * ADMIN_PASSWORD=your-secure-password
 * 
 * แล้วรัน:
 * node scripts/create-admin-quick.js
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const fullName = process.env.ADMIN_FULL_NAME || 'ผู้ดูแลระบบ'
  const email = process.env.ADMIN_EMAIL || 'admin@hospital.com'

  console.log('\n🔐 สร้าง Admin Account (Quick Mode)\n')
  console.log('============================================================\n')

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create or update admin
    const admin = await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash,
        role: 'admin',
        fullName: fullName || undefined,
        email: email || undefined,
        isActive: true,
      },
      create: {
        username,
        passwordHash,
        role: 'admin',
        fullName: fullName || undefined,
        email: email || undefined,
        isActive: true,
      },
    })

    console.log('✅ สร้าง/อัปเดต Admin Account สำเร็จ!\n')
    console.log('📝 Account Details:')
    console.log(`   Username: ${admin.username}`)
    console.log(`   Password: ${password}`)
    console.log(`   Full Name: ${admin.fullName || 'N/A'}`)
    console.log(`   Email: ${admin.email || 'N/A'}`)
    console.log(`   Role: ${admin.role}`)
    console.log(`   Status: ${admin.isActive ? '✅ Active' : '❌ Inactive'}`)
    console.log('\n============================================================\n')
    console.log('⚠️  หมายเหตุ:')
    console.log('   - เปลี่ยน password ทันทีหลังจาก login ครั้งแรก')
    console.log('   - เก็บ password ไว้เป็นความลับ')
    console.log('   - ใช้ password ที่แข็งแรงใน production')
    console.log('\n============================================================\n')

  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาด:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

