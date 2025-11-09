import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request, ['staff', 'admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  const { user } = authResult

  try {
    const body = await request.json()
    const { journeyStepId, status } = body

    if (!journeyStepId || !status) {
      return NextResponse.json(
        { error: 'Missing journeyStepId or status' },
        { status: 400 }
      )
    }

    // Find the journey step
    const journeyStep = await prisma.journeyStep.findUnique({
      where: { id: journeyStepId },
      include: {
        visit: true,
        step: true,
      },
    })

    if (!journeyStep) {
      return NextResponse.json(
        { error: 'Journey step not found' },
        { status: 404 }
      )
    }

    // Check if user has permission (staff can only revert steps in their department)
    if (user.role === 'staff' && user.department) {
      const stepMatches = journeyStep.step.department === user.department || 
                         journeyStep.step.name === user.department
      if (!stepMatches) {
        return NextResponse.json(
          { error: 'You do not have permission to revert this step' },
          { status: 403 }
        )
      }
    }

    // Get all journey steps for this visit to check for conflicts
    const allJourneySteps = await prisma.journeyStep.findMany({
      where: { visitId: journeyStep.visitId },
      include: { step: true },
      orderBy: { startTime: 'asc' },
    })

    // If reverting to in_progress, we need to:
    // 1. Set other in_progress steps to waiting (if they come after this step)
    // 2. Set completed steps that come after this step to waiting (if needed)
    if (status === 'in_progress') {
      const currentStepIndex = allJourneySteps.findIndex(js => js.id === journeyStepId)
      
      // Set all steps that come after this step and are in_progress to waiting
      for (let i = currentStepIndex + 1; i < allJourneySteps.length; i++) {
        const laterStep = allJourneySteps[i]
        if (laterStep.status === 'in_progress') {
          await prisma.journeyStep.update({
            where: { id: laterStep.id },
            data: {
              status: 'waiting',
              endTime: null,
            },
          })
        }
      }
    }

    // Revert the status
    const updatedStep = await prisma.journeyStep.update({
      where: { id: journeyStepId },
      data: {
        status: status,
        endTime: status === 'completed' ? new Date() : null,
        updatedById: user.userId,
      },
    })

    // If reverting to in_progress, update visit current step
    if (status === 'in_progress') {
      await prisma.patientVisit.update({
        where: { id: journeyStep.visitId },
        data: { currentStepId: journeyStep.stepId },
      })
    }

    return NextResponse.json({
      success: true,
      journeyStep: updatedStep,
    })
  } catch (error: any) {
    console.error('[Revert Status API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to revert status' },
      { status: 500 }
    )
  }
}

