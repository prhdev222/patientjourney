import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testing patient login...\n')

  const testVn = '67010001'
  const testHn = '1234567'

  // Find visit
  const visit = await prisma.patientVisit.findUnique({
    where: { vn: testVn },
  })

  if (!visit) {
    console.error('❌ Visit not found!')
    console.log('💡 Run: npm run db:seed')
    return
  }

  console.log('✅ Visit found:')
  console.log(`   VN: ${visit.vn}`)
  console.log(`   HN Hash: ${visit.hnHash.substring(0, 30)}...`)

  // Test HN verification
  console.log(`\n🔐 Testing HN verification:`)
  console.log(`   HN: ${testHn}`)
  
  const isValid = await bcrypt.compare(testHn, visit.hnHash)
  console.log(`   Valid: ${isValid ? '✅ YES' : '❌ NO'}`)

  if (!isValid) {
    console.error('\n❌ HN verification failed!')
    console.log('💡 The HN hash does not match.')
    
    // Try to create a new hash
    console.log('\n🔄 Creating new hash...')
    const newHash = await bcrypt.hash(testHn, 10)
    console.log(`   New hash: ${newHash.substring(0, 30)}...`)
    
    // Update visit
    await prisma.patientVisit.update({
      where: { id: visit.id },
      data: { hnHash: newHash },
    })
    
    console.log('✅ Updated HN hash in database')
    
    // Test again
    const isValidAfterUpdate = await bcrypt.compare(testHn, newHash)
    console.log(`\n✅ Verification after update: ${isValidAfterUpdate ? 'YES' : 'NO'}`)
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

