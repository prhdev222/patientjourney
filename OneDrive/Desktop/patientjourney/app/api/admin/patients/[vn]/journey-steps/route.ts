import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET: Get all journey steps for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: { vn: string } }
) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const visit = await prisma.patientVisit.findUnique({
      where: { vn: params.vn },
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
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      visitId: visit.id,
      vn: visit.vn,
      journeySteps: visit.journeySteps.map(js => ({
        id: js.id,
        visitId: js.visitId,
        stepId: js.stepId,
        stepName: js.step.name,
        stepDepartment: js.step.department,
        status: js.status,
        startTime: js.startTime,
        endTime: js.endTime,
        notes: js.notes,
        queueNumber: js.queueNumber,
        updatedById: js.updatedById,
        createdAt: js.createdAt,
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch journey steps' },
      { status: 500 }
    )
  }
}

// POST: Create new journey step
const createJourneyStepSchema = z.object({
  stepId: z.string().uuid(),
  status: z.enum(['waiting', 'in_progress', 'completed', 'skipped']),
  notes: z.string().optional().nullable(),
  startTime: z.string().optional(), // ISO string
  endTime: z.string().optional().nullable(), // ISO string or null
  queueNumber: z.number().int().nullable().optional(), // Added queueNumber
})

export async function POST(
  request: NextRequest,
  { params }: { params: { vn: string } }
) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const body = await request.json()
    console.log('[Create Journey Step API] Received body:', body)
    
    const { stepId, status, notes, startTime, endTime, queueNumber } = createJourneyStepSchema.parse(body)
    console.log('[Create Journey Step API] Parsed data:', { stepId, status, notes, startTime, endTime, queueNumber })

    const visit = await prisma.patientVisit.findUnique({
      where: { vn: params.vn },
    })

    if (!visit) {
      console.error('[Create Journey Step API] Visit not found for VN:', params.vn)
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    console.log('[Create Journey Step API] Creating journey step for visit:', visit.id)
    const journeyStep = await prisma.journeyStep.create({
      data: {
        visitId: visit.id,
        stepId,
        status,
        notes: notes || null,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : null,
        queueNumber: queueNumber || null, // Added queueNumber
        updatedById: authResult.user.userId,
      },
      include: {
        step: true,
      },
    })
    console.log('[Create Journey Step API] Journey step created successfully:', journeyStep.id)

    // Update visit current step if this is the active step
    if (status === 'in_progress' || status === 'waiting') {
      await prisma.patientVisit.update({
        where: { id: visit.id },
        data: { currentStepId: stepId },
      })
    }

    return NextResponse.json({
      success: true,
      journeyStep: {
        id: journeyStep.id,
        stepId: journeyStep.stepId,
        stepName: journeyStep.step.name,
        stepDepartment: journeyStep.step.department,
        status: journeyStep.status,
        startTime: journeyStep.startTime,
        endTime: journeyStep.endTime,
        notes: journeyStep.notes,
      },
    })
  } catch (error: any) {
    console.error('[Create Journey Step API] Error:', error)
    if (error.name === 'ZodError') {
      console.error('[Create Journey Step API] Validation errors:', error.errors)
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create journey step' },
      { status: 500 }
    )
  }
}

