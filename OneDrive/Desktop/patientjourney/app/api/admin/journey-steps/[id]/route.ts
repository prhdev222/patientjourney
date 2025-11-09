import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// PUT: Update journey step
const updateJourneyStepSchema = z.object({
  status: z.enum(['waiting', 'in_progress', 'completed', 'skipped']).optional(),
  notes: z.string().nullable().optional(),
  startTime: z.string().optional(), // ISO string
  endTime: z.string().nullable().optional(), // ISO string or null
  queueNumber: z.number().int().nullable().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Update Journey Step API] Received request for step:', params.id)
  
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    console.error('[Update Journey Step API] Authentication failed')
    return authResult.error
  }

  console.log('[Update Journey Step API] Authenticated user:', authResult.user.userId, 'role:', authResult.user.role)

  try {
    const body = await request.json()
    console.log('[Update Journey Step API] Request body:', body)
    
    const data = updateJourneyStepSchema.parse(body)
    console.log('[Update Journey Step API] Parsed data:', data)

    const journeyStep = await prisma.journeyStep.findUnique({
      where: { id: params.id },
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

    // Build update data
    const updateData: any = {
      updatedById: authResult.user.userId,
    }

    if (data.status !== undefined) {
      updateData.status = data.status
    }

    if (data.notes !== undefined) {
      // If notes is empty string, set to null
      updateData.notes = data.notes === '' ? null : data.notes
    }

    if (data.startTime !== undefined) {
      updateData.startTime = new Date(data.startTime)
    }

    if (data.endTime !== undefined) {
      updateData.endTime = data.endTime ? new Date(data.endTime) : null
    }

    if (data.queueNumber !== undefined) {
      updateData.queueNumber = data.queueNumber
    }

    console.log('[Update Journey Step API] Updating with data:', updateData)
    
    const updatedStep = await prisma.journeyStep.update({
      where: { id: params.id },
      data: updateData,
      include: {
        step: true,
      },
    })

    console.log('[Update Journey Step API] Journey step updated successfully:', updatedStep.id)

    // Update visit current step if this step is now active
    if (data.status === 'in_progress' || data.status === 'waiting') {
      await prisma.patientVisit.update({
        where: { id: journeyStep.visitId },
        data: { currentStepId: journeyStep.stepId },
      })
    }

    // Send push notification if notes were added/updated and visit has FCM token
    if (data.notes !== undefined && journeyStep.visit.fcmToken) {
      try {
        const stepName = updatedStep.step.name
        let notificationTitle = '📝 มีหมายเหตุใหม่'
        let notificationBody = ''

        if (data.notes && data.notes.trim() !== '') {
          // Note was added or updated
          notificationBody = `ขั้นตอน: ${stepName}\n\n📝 หมายเหตุ: ${data.notes}`
        } else {
          // Note was removed
          notificationTitle = '📝 หมายเหตุถูกลบ'
          notificationBody = `ขั้นตอน: ${stepName}\n\nหมายเหตุถูกลบแล้ว`
        }

        // Send notification via internal API
        const notificationResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              visitId: journeyStep.visitId,
              title: notificationTitle,
              body: notificationBody,
              url: '/patient/dashboard',
            }),
          }
        )

        if (notificationResponse.ok) {
          console.log('[Update Journey Step API] Notification sent successfully')
        } else {
          const errorData = await notificationResponse.json().catch(() => ({}))
          console.warn('[Update Journey Step API] Failed to send notification:', errorData)
        }
      } catch (notificationError: any) {
        console.error('[Update Journey Step API] Error sending notification:', notificationError)
        // Don't fail the update if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      journeyStep: {
        id: updatedStep.id,
        stepId: updatedStep.stepId,
        stepName: updatedStep.step.name,
        stepDepartment: updatedStep.step.department,
        status: updatedStep.status,
        startTime: updatedStep.startTime,
        endTime: updatedStep.endTime,
        notes: updatedStep.notes,
        queueNumber: updatedStep.queueNumber,
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
      { error: error.message || 'Failed to update journey step' },
      { status: 500 }
    )
  }
}

// DELETE: Delete journey step
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const journeyStep = await prisma.journeyStep.findUnique({
      where: { id: params.id },
      include: {
        visit: true,
      },
    })

    if (!journeyStep) {
      return NextResponse.json(
        { error: 'Journey step not found' },
        { status: 404 }
      )
    }

    await prisma.journeyStep.delete({
      where: { id: params.id },
    })

    // If this was the current step, update visit currentStepId
    if (journeyStep.visit.currentStepId === journeyStep.stepId) {
      // Find the next active step
      const nextStep = await prisma.journeyStep.findFirst({
        where: {
          visitId: journeyStep.visitId,
          status: { in: ['waiting', 'in_progress'] },
        },
        orderBy: { startTime: 'asc' },
      })

      await prisma.patientVisit.update({
        where: { id: journeyStep.visitId },
        data: { currentStepId: nextStep?.stepId || null },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Journey step deleted successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete journey step' },
      { status: 500 }
    )
  }
}

