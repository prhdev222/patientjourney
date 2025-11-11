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
      select: {
        vn: true,
        qrCode: true,
      },
    })

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    // Return QR code if exists, otherwise return null
    return NextResponse.json({
      vn: visit.vn,
      qrCode: visit.qrCode || null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch QR code' },
      { status: 500 }
    )
  }
}

