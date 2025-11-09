import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'
import QRCode from 'qrcode'

const createPatientSchema = z.object({
  vn: z.string().min(1).max(20),
  hn: z.string().min(1).max(20),
  startStepId: z.string().uuid().optional(), // Optional: first step to start
})

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request, ['admin', 'staff'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  // Staff can only add patients if they are at "ลงทะเบียน" (Registration) department
  if (authResult.user.role === 'staff') {
    const allowedDepartments = ['ลงทะเบียน', 'Registration', 'registration']
    if (!authResult.user.department || !allowedDepartments.includes(authResult.user.department)) {
      return NextResponse.json(
        { error: 'Only staff at "ลงทะเบียน" department can add patients' },
        { status: 403 }
      )
    }
  }

  try {
    const body = await request.json()
    const { vn, hn, startStepId } = createPatientSchema.parse(body)

    // Check if VN already exists
    const existingVisit = await prisma.patientVisit.findUnique({
      where: { vn },
    })

    if (existingVisit) {
      return NextResponse.json(
        { error: 'VN already exists' },
        { status: 400 }
      )
    }

    // Hash HN
    const hnHash = await hashPassword(hn)

    // Generate QR code
    const qrCodeData = JSON.stringify({ vn, hn })
    const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    } as any)

    // Create patient visit
    const visit = await prisma.patientVisit.create({
      data: {
        vn,
        hnHash,
        qrCode: qrCodeImage,
        startTime: new Date(),
        currentStepId: startStepId || null,
      },
    })

    // Create first journey step
    let firstStepId = startStepId
    
    // If no startStepId provided, find the first check-in point (lowest displayOrder or oldest)
    if (!firstStepId) {
      const firstStep = await prisma.serviceStep.findFirst({
        where: { isActive: true },
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'asc' }, // Fallback to oldest if no displayOrder
        ],
      })
      
      if (firstStep) {
        firstStepId = firstStep.id
        console.log(`[Admin Patients API] Found first step: ${firstStep.name}, department: ${firstStep.department}`)
        // Update visit with currentStepId
        await prisma.patientVisit.update({
          where: { id: visit.id },
          data: { currentStepId: firstStepId },
        })
      } else {
        console.log(`[Admin Patients API] No active steps found`)
      }
    }
    
    // Create journey step if we have a step ID
    if (firstStepId) {
      const journeyStep = await prisma.journeyStep.create({
        data: {
          visitId: visit.id,
          stepId: firstStepId,
          status: 'waiting',
        },
        include: {
          step: {
            select: { name: true, department: true },
          },
        },
      })
      console.log(`[Admin Patients API] Created journey step: step=${journeyStep.step.name}, department=${journeyStep.step.department}, status=${journeyStep.status}`)
    } else {
      console.log(`[Admin Patients API] No step ID available, skipping journey step creation`)
    }

    return NextResponse.json({
      success: true,
      visit: {
        id: visit.id,
        vn: visit.vn,
        qrCode: visit.qrCode,
        startTime: visit.startTime,
      },
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create patient' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')?.trim()
    const dateFilter = searchParams.get('date')

    // Build where clause
    const where: any = {}

    // Search by VN
    if (search) {
      where.vn = {
        contains: search,
        mode: 'insensitive', // Case-insensitive search
      }
    }

    // Filter by date (start of day to end of day)
    if (dateFilter) {
      const startOfDay = new Date(dateFilter)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(dateFilter)
      endOfDay.setHours(23, 59, 59, 999)

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    const visits = await prisma.patientVisit.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: {
        startTime: 'desc', // Show newest first
      },
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

    const total = await prisma.patientVisit.count({ where })

    return NextResponse.json({
      visits: visits.map((visit) => ({
        id: visit.id,
        vn: visit.vn,
        startTime: visit.startTime,
        endTime: visit.endTime,
        currentStep: visit.journeySteps.find((js) => 
          js.status === 'in_progress' || js.status === 'waiting'
        )?.step.name || null,
        createdAt: visit.createdAt,
        updatedAt: visit.updatedAt,
      })),
      total,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}

