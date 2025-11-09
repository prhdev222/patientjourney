import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning duplicate journey steps...\n')

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

  // Group by step name
  const stepGroups = new Map<string, typeof visit.journeySteps>()
  
  visit.journeySteps.forEach((js) => {
    const stepName = js.step.name
    if (!stepGroups.has(stepName)) {
      stepGroups.set(stepName, [])
    }
    stepGroups.get(stepName)!.push(js)
  })

  // Find duplicates and keep only the latest one
  let deletedCount = 0
  
  for (const [stepName, steps] of stepGroups.entries()) {
    if (steps.length > 1) {
      console.log(`⚠️  Found ${steps.length} duplicates for "${stepName}"`)
      
      // Sort by startTime descending (newest first)
      steps.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      
      // Keep the first (newest) one, delete the rest
      const toKeep = steps[0]
      const toDelete = steps.slice(1)
      
      console.log(`   Keeping: ${toKeep.id} (${toKeep.startTime})`)
      
      for (const step of toDelete) {
        console.log(`   Deleting: ${step.id} (${step.startTime})`)
        await prisma.journeyStep.delete({
          where: { id: step.id },
        })
        deletedCount++
      }
    }
  }

  console.log(`\n✅ Deleted ${deletedCount} duplicate journey steps`)
  
  // Update current step if needed
  const remainingSteps = await prisma.journeyStep.findMany({
    where: { visitId: visit.id },
    include: {
      step: true,
    },
    orderBy: { startTime: 'asc' },
  })
  
  if (remainingSteps.length > 0) {
    const currentStep = remainingSteps.find((js) => js.status === 'in_progress' || js.status === 'waiting')
    if (currentStep) {
      await prisma.patientVisit.update({
        where: { id: visit.id },
        data: { currentStepId: currentStep.stepId },
      })
      console.log(`✅ Updated current step to: ${currentStep.step.name}`)
    }
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

