import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      role: 'admin',
      fullName: 'ผู้ดูแลระบบ',
      email: 'admin@hospital.com',
      isActive: true,
    },
  })
  console.log('✅ Created admin user:', admin.username)

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 10)
  const staff = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      username: 'staff',
      passwordHash: staffPassword,
      role: 'staff',
      department: 'จุดคัดกรอง',
      fullName: 'พยาบาล A',
      isActive: true,
    },
  })
  console.log('✅ Created staff user:', staff.username)

  // Create service steps
  const steps = [
    {
      name: 'ลงทะเบียน',
      nameEn: 'Registration',
      department: 'แผนกต้อนรับ',
      location: 'ห้องต้อนรับ ชั้น 1',
      floor: 1,
      estimatedMinutes: 10,
      preparationText: 'เตรียมบัตรประชาชน',
      displayOrder: 1,
      nextSteps: [],
    },
    {
      name: 'วัดสัญญาณชีพ',
      nameEn: 'Vital Signs',
      department: 'จุดคัดกรอง',
      location: 'ห้องวัดสัญญาณชีพ ชั้น 1',
      floor: 1,
      estimatedMinutes: 15,
      preparationText: 'ไม่ต้องเตรียมตัวพิเศษ',
      displayOrder: 2,
      nextSteps: [],
    },
    {
      name: 'คัดกรอง',
      nameEn: 'Screening',
      department: 'จุดคัดกรอง',
      location: 'ห้องคัดกรอง ชั้น 1',
      floor: 1,
      estimatedMinutes: 20,
      preparationText: 'ตอบคำถามตามจริง',
      displayOrder: 3,
      nextSteps: [],
    },
    {
      name: 'รอพบแพทย์',
      nameEn: 'Waiting for Doctor',
      department: 'แผนกผู้ป่วยนอก',
      location: 'ห้องรอ ชั้น 2',
      floor: 2,
      estimatedMinutes: 30,
      preparationText: 'รอเรียกชื่อ',
      displayOrder: 4,
      nextSteps: [],
    },
    {
      name: 'พบแพทย์',
      nameEn: 'See Doctor',
      department: 'แผนกผู้ป่วยนอก',
      location: 'ห้องตรวจ ชั้น 2',
      floor: 2,
      estimatedMinutes: 20,
      preparationText: 'เตรียมคำถามที่ต้องการถาม',
      displayOrder: 5,
      nextSteps: [],
    },
    {
      name: 'จ่ายเงิน',
      nameEn: 'Payment',
      department: 'แผนกการเงิน',
      location: 'ห้องจ่ายเงิน ชั้น 1',
      floor: 1,
      estimatedMinutes: 10,
      preparationText: 'เตรียมบัตรประชาชนและเงินสด/บัตรเครดิต',
      displayOrder: 6,
      nextSteps: [],
    },
    {
      name: 'รับยา',
      nameEn: 'Pharmacy',
      department: 'แผนกเภสัชกรรม',
      location: 'ห้องจ่ายยา ชั้น 1',
      floor: 1,
      estimatedMinutes: 15,
      preparationText: 'รอเรียกชื่อ',
      displayOrder: 7,
      nextSteps: [],
    },
  ]

  // Update nextSteps after creating all steps
  const createdSteps = []
  for (const step of steps) {
    // Check if step exists
    const existing = await prisma.serviceStep.findFirst({
      where: { name: step.name },
    })
    
    let created
    if (existing) {
      // Update existing step
      created = await prisma.serviceStep.update({
        where: { id: existing.id },
        data: step,
      })
    } else {
      // Create new step
      created = await prisma.serviceStep.create({
        data: step,
      })
    }
    createdSteps.push(created)
    console.log(`✅ Created service step: ${created.name}`)
  }

  // Update nextSteps relationships
  for (let i = 0; i < createdSteps.length - 1; i++) {
    await prisma.serviceStep.update({
      where: { id: createdSteps[i].id },
      data: {
        nextSteps: [createdSteps[i + 1].id],
      },
    })
  }

  // Create sample patient visit for testing
  const testHn = '1234567'
  const testVn = '67010001'
  const hnHash = await bcrypt.hash(testHn, 10)

  const visit = await prisma.patientVisit.upsert({
    where: { vn: testVn },
    update: {},
    create: {
      vn: testVn,
      hnHash,
      startTime: new Date(),
    },
  })
  console.log('✅ Created test patient visit:', visit.vn)

  // Check if journey steps already exist
  const existingSteps = await prisma.journeyStep.findMany({
    where: { visitId: visit.id },
  })

  if (existingSteps.length === 0) {
    // Create first journey step
    const firstStep = createdSteps[0]
    await prisma.journeyStep.create({
      data: {
        visitId: visit.id,
        stepId: firstStep.id,
        status: 'completed',
        endTime: new Date(),
      },
    })

    // Create second journey step (in progress)
    const secondStep = createdSteps[1]
    const currentStep = await prisma.journeyStep.create({
      data: {
        visitId: visit.id,
        stepId: secondStep.id,
        status: 'in_progress',
      },
    })

    // Update visit current step
    await prisma.patientVisit.update({
      where: { id: visit.id },
      data: { currentStepId: secondStep.id },
    })
  } else {
    console.log('⚠️  Journey steps already exist, skipping creation')
  }

  console.log('✅ Created journey steps for test visit')

  console.log('\n🎉 Seed completed!')
  console.log('\n📝 Test credentials:')
  console.log('  Patient Login:')
  console.log('    VN: 67010001')
  console.log('    HN: 1234567')
  console.log('\n  Staff Login:')
  console.log('    Username: staff')
  console.log('    Password: staff123')
  console.log('\n  Admin Login:')
  console.log('    Username: admin')
  console.log('    Password: admin123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


