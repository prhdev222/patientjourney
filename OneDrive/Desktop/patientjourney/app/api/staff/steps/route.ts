import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request, ['staff', 'admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const steps = await prisma.serviceStep.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        department: true,
        location: true,
        floor: true,
        estimatedMinutes: true,
      },
    })

    return NextResponse.json({ steps })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch steps' },
      { status: 500 }
    )
  }
}

