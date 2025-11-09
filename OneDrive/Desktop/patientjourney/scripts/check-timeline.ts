import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking timeline data...\n')

  // Find visit
  const visit = await prisma.patientVisit.findUnique({
    where: { vn: '67010001' },
    include: {
      journeySteps: {
        include: {
          step: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      },
    },
  })

  if (!visit) {
    console.error('❌ Visit not found!')
    return
  }

  console.log(`✅ Visit found: ${visit.vn}`)
  console.log(`📊 Journey Steps count: ${visit.journeySteps.length}\n`)

  visit.journeySteps.forEach((js, index) => {
    console.log(`${index + 1}. ${js.step.name}`)
    console.log(`   Status: ${js.status}`)
    console.log(`   Start: ${js.startTime}`)
    console.log(`   End: ${js.endTime || 'N/A'}`)
    console.log(`   ID: ${js.id}`)
    console.log(`   Step ID: ${js.stepId}`)
    console.log('')
  })

  // Check for duplicates
  const stepNames = visit.journeySteps.map((js) => js.step.name)
  const duplicates = stepNames.filter((name, index) => stepNames.indexOf(name) !== index)
  
  if (duplicates.length > 0) {
    console.log('⚠️  Duplicate step names found:')
    duplicates.forEach((name) => {
      const duplicateSteps = visit.journeySteps.filter((js) => js.step.name === name)
      console.log(`   - ${name}: ${duplicateSteps.length} times`)
      duplicateSteps.forEach((js) => {
        console.log(`     ID: ${js.id}, Start: ${js.startTime}`)
      })
    })
  } else {
    console.log('✅ No duplicates found')
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

