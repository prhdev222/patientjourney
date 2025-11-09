import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    console.log('[FCM Subscribe API] Received request')
    
    // Verify authentication using middleware
    const authResult = await authenticateRequest(request, ['patient', 'admin', 'staff'])
    
    if ('error' in authResult) {
      console.error('[FCM Subscribe API] Authentication failed')
      return authResult.error
    }

    const { user } = authResult
    console.log('[FCM Subscribe API] Token verified, userId:', user.userId, 'role:', user.role, 'vn:', user.vn)

    const body = await request.json()
    const { fcmToken } = body

    console.log('[FCM Subscribe API] FCM token received:', fcmToken ? `${fcmToken.substring(0, 20)}...` : 'null')

    // If fcmToken is null, remove it (unsubscribe)
    if (fcmToken === null) {
      try {
        // For patients, userId is the visit ID
        // For staff/admin, we can't unsubscribe (they don't have visits)
        if (user.role === 'patient') {
          await prisma.patientVisit.update({
            where: { id: user.userId },
            data: { fcmToken: null },
          })
          console.log('[FCM Subscribe API] FCM token removed')
        }
        return NextResponse.json({ success: true, message: 'Unsubscribed' })
      } catch (error: any) {
        console.error('[FCM Subscribe API] Error removing token:', error)
        // If visit doesn't exist, that's okay
        return NextResponse.json({ success: true, message: 'Unsubscribed' })
      }
    }

    if (!fcmToken) {
      console.error('[FCM Subscribe API] FCM token is required')
      return NextResponse.json(
        { error: 'FCM token is required' },
        { status: 400 }
      )
    }

    // Only patients can subscribe to FCM notifications
    // But allow admin/staff to subscribe for testing purposes (they can view patient dashboard)
    // Actually, let's keep it strict - only patients
    if (user.role !== 'patient') {
      console.error('[FCM Subscribe API] Only patients can subscribe to FCM. User role:', user.role)
      return NextResponse.json(
        { error: 'Only patients can subscribe to FCM notifications. Please login as a patient.' },
        { status: 403 }
      )
    }

    // Find visit by userId (which should be the visit ID for patients)
    // For patients, userId is the visit.id
    let visit
    try {
      console.log('[FCM Subscribe API] Looking for visit with userId:', user.userId, 'vn:', user.vn)
      
      // Try to find visit by userId (which should be the visit ID)
      visit = await prisma.patientVisit.findUnique({
        where: { id: user.userId },
      })

      if (!visit) {
        console.log('[FCM Subscribe API] Visit not found by userId, trying VN...')
        // If not found, try to find by VN if available
        if (user.vn) {
          visit = await prisma.patientVisit.findUnique({
            where: { vn: user.vn },
          })
          if (visit) {
            console.log('[FCM Subscribe API] Visit found by VN:', visit.vn)
          }
        }
      } else {
        console.log('[FCM Subscribe API] Visit found by userId:', visit.vn)
      }

      if (!visit) {
        console.error('[FCM Subscribe API] Visit not found for userId:', user.userId, 'vn:', user.vn)
        // Try to list all visits to debug
        const allVisits = await prisma.patientVisit.findMany({
          take: 5,
          select: { id: true, vn: true },
        })
        console.log('[FCM Subscribe API] Available visits (first 5):', allVisits)
        return NextResponse.json(
          { error: `Patient visit not found. userId: ${user.userId}, vn: ${user.vn || 'N/A'}` },
          { status: 404 }
        )
      }

      // Update FCM token
      console.log('[FCM Subscribe API] Updating FCM token for visit:', visit.id, visit.vn)
      await prisma.patientVisit.update({
        where: { id: visit.id },
        data: { fcmToken },
      })

      console.log('[FCM Subscribe API] FCM token updated successfully for visit:', visit.vn)
      return NextResponse.json({ success: true, vn: visit.vn })
    } catch (dbError: any) {
      console.error('[FCM Subscribe API] Database error:', dbError)
      console.error('[FCM Subscribe API] Database error details:', {
        code: dbError.code,
        meta: dbError.meta,
        message: dbError.message,
        stack: dbError.stack,
      })
      
      // Check if it's a Prisma validation error (field doesn't exist)
      if (dbError.message?.includes('Unknown argument') || 
          dbError.message?.includes('Invalid field') ||
          dbError.code === 'P2009') {
        console.error('[FCM Subscribe API] Prisma Client may not be regenerated. Run: npx prisma generate')
        return NextResponse.json(
          { 
            error: 'Database schema mismatch. Please restart the server after running: npx prisma generate',
            details: process.env.NODE_ENV === 'development' ? {
              message: dbError.message,
              code: dbError.code,
            } : undefined,
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `Database error: ${dbError.message}`,
          details: process.env.NODE_ENV === 'development' ? {
            message: dbError.message,
            code: dbError.code,
            meta: dbError.meta,
          } : undefined,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[FCM Subscribe API] Unexpected error:', error)
    console.error('[FCM Subscribe API] Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to subscribe',
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
        } : undefined,
      },
      { status: 500 }
    )
  }
}

