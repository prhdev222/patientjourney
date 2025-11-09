import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { createServiceStepSchema, updateServiceStepSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const steps = await prisma.serviceStep.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json({ steps })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch steps' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const data = createServiceStepSchema.parse(body)

    // Create service step
    const step = await prisma.serviceStep.create({
      data: {
        ...data,
        nextSteps: data.nextSteps || [],
      },
    })

    return NextResponse.json({ step }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create step' },
      { status: 500 }
    )
  }
}


