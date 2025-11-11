import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const updateStaffSchema = z.object({
  username: z.string().min(3).max(100).optional(),
  password: z.string().min(6).optional(),
  fullName: z.string().optional(),
  department: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  canAddPatients: z.boolean().optional(),
})

// GET: Get single staff member
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const staff = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        department: true,
        isActive: true,
        canAddPatients: true,
        createdAt: true,
        lastLogin: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ staff })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch staff' },
      { status: 500 }
    )
  }
}

// PUT: Update staff member
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
    const data = updateStaffSchema.parse(body)

    // Check if staff exists
    const existingStaff = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingStaff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    // Check if username is being changed and if it already exists
    if (data.username && data.username !== existingStaff.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: data.username },
      })

      if (usernameExists) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: any = {}
    
    if (data.username !== undefined) {
      updateData.username = data.username
    }
    
    if (data.password !== undefined) {
      updateData.passwordHash = await hashPassword(data.password)
    }
    
    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName
    }
    
    if (data.department !== undefined) {
      updateData.department = data.department
    }
    
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
    }
    
    if (data.canAddPatients !== undefined) {
      updateData.canAddPatients = data.canAddPatients
    }

    const updatedStaff = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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
    })

    return NextResponse.json({
      success: true,
      staff: updatedStaff,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update staff' },
      { status: 500 }
    )
  }
}

// DELETE: Delete staff member (soft delete by setting isActive to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateRequest(request, ['admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const staff = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    // Prevent deleting admin users
    if (staff.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin user' },
        { status: 403 }
      )
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Staff deleted successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete staff' },
      { status: 500 }
    )
  }
}

