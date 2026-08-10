import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const databaseUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

/**
 * Parse a libsql:// URL to extract auth token.
 * Handles both auth_token (snake_case, Turso CLI default) and authToken (camelCase, libsql client).
 * Returns a clean URL + separate authToken property for maximum compatibility.
 */
function parseLibsqlUrl(url: string): { url: string; authToken?: string } {
  const match = url.match(/\?(?:auth_token|authToken)=([^&]+)/)
  if (match) {
    const cleanUrl = url.split('?')[0]
    return { url: cleanUrl, authToken: match[1] }
  }
  return { url }
}

function createPrismaClient() {
  if (databaseUrl.startsWith('libsql://')) {
    const { url, authToken } = parseLibsqlUrl(databaseUrl)
    const adapter = new PrismaLibSQL({ url, authToken })
    return new PrismaClient({ adapter })
  }
  // Local SQLite: standard PrismaClient (no adapter needed)
  return new PrismaClient()
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
