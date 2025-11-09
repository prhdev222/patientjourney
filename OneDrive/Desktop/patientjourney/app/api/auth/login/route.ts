import { NextRequest, NextResponse } from 'next/server'
import { authenticatePatient, generateAccessToken, generateRefreshToken } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Login API] Received body:', { vn: body.vn, hn: body.hn ? '***' : undefined })
    
    // Trim whitespace from VN and HN
    const trimmedBody = {
      vn: typeof body.vn === 'string' ? body.vn.trim() : body.vn,
      hn: typeof body.hn === 'string' ? body.hn.trim() : body.hn,
    }
    
    const { vn, hn } = loginSchema.parse(trimmedBody)
    console.log('[Login API] Parsed (after trim):', { vn, hnLength: hn?.length || 0, hn: hn })

    // Authenticate patient
    const visit = await authenticatePatient(vn, hn)
    console.log('[Login API] Authentication successful for VN:', visit.vn)

    // Generate tokens
    const payload = {
      userId: visit.id,
      vn: visit.vn,
      role: 'patient' as const,
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    return NextResponse.json({
      success: true,
      token: accessToken,
      refreshToken,
      visitId: visit.id,
    })
  } catch (error: any) {
    console.error('[Login API] Error:', error)
    console.error('[Login API] Error name:', error.name)
    console.error('[Login API] Error message:', error.message)
    
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


