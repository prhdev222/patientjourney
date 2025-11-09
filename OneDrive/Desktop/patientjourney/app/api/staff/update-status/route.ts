import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { updateStatusSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request, ['staff', 'admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  const { user } = authResult

  try {
    const body = await request.json()
    const { vn, status, nextStepId, notes } = updateStatusSchema.parse(body)

    // Find visit
    const visit = await prisma.patientVisit.findUnique({
      where: { vn },
      include: {
        journeySteps: {
          where: {
            status: { in: ['waiting', 'in_progress'] },
          },
          include: {
            step: true,
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

    // Update current journey step
    const currentJourneyStep = visit.journeySteps[0]
    if (currentJourneyStep) {
      await prisma.journeyStep.update({
        where: { id: currentJourneyStep.id },
        data: {
          status,
          endTime: status === 'completed' ? new Date() : null,
          notes,
          updatedById: user.userId,
        },
      })
    }

    // Create new journey step if next step is provided
    if (nextStepId && status === 'completed') {
      const nextStep = await prisma.serviceStep.findUnique({
        where: { id: nextStepId },
      })

      if (nextStep) {
        await prisma.journeyStep.create({
          data: {
            visitId: visit.id,
            stepId: nextStepId,
            status: 'waiting',
            updatedById: user.userId,
          },
        })

        // Update visit current step
        await prisma.patientVisit.update({
          where: { id: visit.id },
          data: { currentStepId: nextStepId },
        })
      }
    }

    // Send push notification if FCM token exists
    if (visit.fcmToken) {
      try {
        const stepName = currentJourneyStep?.step.name || 'ขั้นตอน'
        let notificationTitle = 'สถานะอัพเดท'
        let notificationBody = ''

        if (status === 'completed') {
          notificationBody = `✅ ${stepName} เสร็จสิ้นแล้ว`
        } else if (status === 'in_progress') {
          notificationBody = `🔄 กำลังดำเนินการ: ${stepName}`
        } else if (status === 'waiting') {
          notificationBody = `⏳ รอคิว: ${stepName}`
        }

        // Add notes to notification if provided
        if (notes) {
          notificationBody += `\n\n📝 หมายเหตุ: ${notes}`
        }

        if (notificationBody) {
          // Send push notification (don't wait for response)
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitId: visit.id,
              title: notificationTitle,
              body: notificationBody,
              url: '/patient/dashboard',
            }),
          }).catch((error) => {
            console.error('Failed to send push notification:', error)
          })
        }
      } catch (error) {
        console.error('Error sending push notification:', error)
        // Don't fail the request if push fails
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update status' },
      { status: 500 }
    )
  }
}


