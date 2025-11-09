import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-key'
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10')

export interface JWTPayload {
  userId: string
  vn?: string
  role: 'admin' | 'staff' | 'patient'
  department?: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload
  } catch (error) {
    throw new Error('Invalid refresh token')
  }
}

export async function authenticatePatient(vn: string, hn: string) {
  // Find patient visit by VN
  const visit = await prisma.patientVisit.findUnique({
    where: { vn },
  })

  if (!visit) {
    console.error(`[Auth] Visit not found for VN: ${vn}`)
    throw new Error('Invalid VN or HN')
  }

  // Verify HN hash
  console.log(`[Auth] Verifying HN for VN: ${vn}`)
  console.log(`[Auth] HN length: ${hn.length}`)
  console.log(`[Auth] HN value: ${hn}`)
  console.log(`[Auth] Stored hash: ${visit.hnHash.substring(0, 30)}...`)
  
  const isValid = await verifyPassword(hn, visit.hnHash)
  console.log(`[Auth] Verification result: ${isValid}`)
  
  if (!isValid) {
    console.error(`[Auth] Invalid HN for VN: ${vn}`)
    console.error(`[Auth] Expected HN length: 7, Got: ${hn.length}`)
    throw new Error('Invalid VN or HN')
  }

  return visit
}

export async function authenticateUser(username: string, password: string) {
  console.log(`[Auth] Authenticating user: ${username}`)
  
  const user = await prisma.user.findUnique({
    where: { username },
  })

  if (!user) {
    console.error(`[Auth] User not found: ${username}`)
    throw new Error('Invalid credentials')
  }

  if (!user.isActive) {
    console.error(`[Auth] User is not active: ${username}`)
    throw new Error('Invalid credentials')
  }

  console.log(`[Auth] User found: ${user.username}, role: ${user.role}, department: ${user.department}, isActive: ${user.isActive}`)

  const isValid = await verifyPassword(password, user.passwordHash)
  console.log(`[Auth] Password verification result: ${isValid}`)
  
  if (!isValid) {
    console.error(`[Auth] Invalid password for user: ${username}`)
    throw new Error('Invalid credentials')
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })

  return user
}


