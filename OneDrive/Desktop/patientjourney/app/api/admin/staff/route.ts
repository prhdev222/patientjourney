import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const createStaffSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(6),
  fullName: z.string().optional(),
  department: z.string().min(1).max(100),
  canAddPatients: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { username, password, fullName, department, canAddPatients } = createStaffSchema.parse(body)

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create staff user
    const staff = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: 'staff',
        department,
        fullName,
        isActive: true,
        canAddPatients: canAddPatients || false,
      },
    })

    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        username: staff.username,
        fullName: staff.fullName,
        email: staff.email,
        department: staff.department,
        canAddPatients: staff.canAddPatients,
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
      { error: error.message || 'Failed to create staff' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const staff = await prisma.user.findMany({
      where: {
        role: 'staff',
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        department: true,
        isActive: true,
        canAddPatients: true,
        createdAt: true,
      },
      orderBy: {
        department: 'asc',
      },
    })

    return NextResponse.json({ staff })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch staff' },
      { status: 500 }
    )
  }
}

