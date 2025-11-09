import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, generateAccessToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken)

    // Generate new access token
    const newAccessToken = generateAccessToken(payload)

    return NextResponse.json({
      success: true,
      token: newAccessToken,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Invalid refresh token' },
      { status: 401 }
    )
  }
}



