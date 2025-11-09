import { NextRequest, NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { prisma } from '@/lib/prisma'

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { visitId, title, body, url } = await request.json()

    if (!visitId) {
      return NextResponse.json(
        { error: 'visitId is required' },
        { status: 400 }
      )
    }

    // Get visit with FCM token
    const visit = await prisma.patientVisit.findUnique({
      where: { id: visitId },
    })

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    if (!visit.fcmToken) {
      return NextResponse.json(
        { error: 'No FCM token found for this visit' },
        { status: 404 }
      )
    }

    // Send push notification via FCM
    const message = {
      notification: {
        title: title || 'สถานะอัพเดท',
        body: body || 'มีการอัพเดทสถานะใหม่',
      },
      data: {
        url: url || '/patient/dashboard',
      },
      token: visit.fcmToken,
    }

    const response = await admin.messaging().send(message)

    return NextResponse.json({
      success: true,
      messageId: response,
    })
  } catch (error: any) {
    console.error('Error sending FCM notification:', error)

    // Handle invalid token
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      // Remove invalid token from database
      const { visitId } = await request.json()
      await prisma.patientVisit.update({
        where: { id: visitId },
        data: { fcmToken: null },
      })
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    )
  }
}

