import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking seed data...\n')

  // Check patient visit
  const visit = await prisma.patientVisit.findUnique({
    where: { vn: '67010001' },
  })

  if (!visit) {
    console.error('❌ Patient visit with VN 67010001 not found!')
    console.log('💡 Run: npm run db:seed')
    return
  }

  console.log('✅ Patient visit found:')
  console.log(`   VN: ${visit.vn}`)
  console.log(`   HN Hash: ${visit.hnHash.substring(0, 20)}...`)

  // Test HN verification
  const testHn = '1234567'
  const isValid = await bcrypt.compare(testHn, visit.hnHash)

  console.log(`\n🔐 Testing HN verification:`)
  console.log(`   HN: ${testHn}`)
  console.log(`   Valid: ${isValid ? '✅ YES' : '❌ NO'}`)

  if (!isValid) {
    console.error('\n❌ HN hash verification failed!')
    console.log('💡 The HN hash in database does not match the test HN.')
    console.log('💡 Try running: npm run db:seed')
  } else {
    console.log('\n✅ Everything looks good!')
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

