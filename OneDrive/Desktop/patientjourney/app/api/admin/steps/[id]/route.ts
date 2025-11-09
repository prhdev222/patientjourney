import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { updateServiceStepSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const step = await prisma.serviceStep.findUnique({
      where: { id: params.id },
    })

    if (!step) {
      return NextResponse.json(
        { error: 'Step not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ step })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch step' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const data = updateServiceStepSchema.parse(body)

    const step = await prisma.serviceStep.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ step })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update step' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    // Soft delete
    await prisma.serviceStep.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete step' },
      { status: 500 }
    )
  }
}



