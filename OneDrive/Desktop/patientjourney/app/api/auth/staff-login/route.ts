import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, generateAccessToken, generateRefreshToken } from '@/lib/auth'
import { staffLoginSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = staffLoginSchema.parse(body)

    console.log(`[Staff Login API] Attempting login for username: ${username}`)

    // Authenticate user
    const user = await authenticateUser(username, password)
    
    console.log(`[Staff Login API] Authentication successful for user: ${user.username}, role: ${user.role}, department: ${user.department}`)

    // Generate tokens
    const payload = {
      userId: user.id,
      role: user.role as 'admin' | 'staff',
      department: user.department || undefined,
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    return NextResponse.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        department: user.department,
        fullName: user.fullName,
        canAddPatients: user.canAddPatients || false,
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
      { error: error.message || 'Authentication failed' },
      { status: 401 }
    )
  }
}


