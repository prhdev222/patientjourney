import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Add connection pool parameters to DATABASE_URL if using Neon
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || ''
  
  // If using Neon, add connection pool parameters
  if (url.includes('neon.tech') && !url.includes('pgbouncer=true')) {
    // Add connection pool parameters for Neon
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}pgbouncer=true&connect_timeout=10&pool_timeout=10`
  }
  
  return url
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

// Handle connection errors gracefully with retry
let retryCount = 0
const maxRetries = 3

const connectWithRetry = async () => {
  try {
    await prisma.$connect()
    retryCount = 0
  } catch (err: any) {
    retryCount++
    if (retryCount < maxRetries) {
      console.warn(`Database connection failed (attempt ${retryCount}/${maxRetries}), retrying...`)
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      return connectWithRetry()
    } else {
      console.error('Failed to connect to database after retries:', err)
    }
  }
}

// Connect on initialization
connectWithRetry()

// Disconnect on process exit
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}


