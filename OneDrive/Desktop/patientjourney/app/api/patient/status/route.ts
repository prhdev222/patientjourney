import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request, ['patient'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  const { user } = authResult

  try {
    // Get patient visit
    const visit = await prisma.patientVisit.findUnique({
      where: { id: user.userId },
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
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    // Get current step
    const currentStep = visit.journeySteps.find(
      (js) => js.status === 'in_progress' || js.status === 'waiting'
    )

    // Get next step
    const completedSteps = visit.journeySteps.filter(
      (js) => js.status === 'completed'
    )
    const nextSteps = currentStep?.step.nextSteps as string[] | undefined
    const nextStepId = nextSteps?.[0] as string | undefined
    const nextStep = nextStepId
      ? await prisma.serviceStep.findUnique({
          where: { id: nextStepId },
        })
      : null

    // Calculate estimated wait time
    const estimatedWaitTime = currentStep?.step.estimatedMinutes || 0

    return NextResponse.json({
      visit: {
        vn: visit.vn,
        startTime: visit.startTime,
        currentStepId: visit.currentStepId,
      },
      currentStep: currentStep
        ? {
            id: currentStep.id,
            name: currentStep.step.name,
            status: currentStep.status,
            startTime: currentStep.startTime,
            queueNumber: currentStep.queueNumber,
            estimatedWaitTime,
          }
        : null,
      timeline: visit.journeySteps.map((js) => ({
        id: js.id,
        stepName: js.step.name,
        status: js.status,
        startTime: js.startTime,
        endTime: js.endTime,
        queueNumber: js.queueNumber,
        notes: js.notes, // Include notes in timeline
      })),
      nextStep: nextStep
        ? {
            id: nextStep.id,
            name: nextStep.name,
            location: nextStep.location,
            floor: nextStep.floor,
            preparationText: nextStep.preparationText,
            estimatedMinutes: nextStep.estimatedMinutes,
          }
        : null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch status' },
      { status: 500 }
    )
  }
}


