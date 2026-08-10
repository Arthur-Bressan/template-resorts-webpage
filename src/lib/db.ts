import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

/**
 * Prisma schema uses `url = env("DATABASE_URL")` with `provider = "sqlite"`.
 * SQLite provider ONLY accepts `file:` URLs for validation.
 *
 * For Turso (libsql://), we use separate env vars and the Prisma adapter.
 * The adapter handles all DB operations — the schema URL is just for validation.
 *
 * Local dev: DATABASE_URL="file:./db/custom.db" (default .env)
 * Vercel/Turso: TURSO_DATABASE_URL="libsql://..." + TURSO_AUTH_TOKEN="..."
 *               DATABASE_URL="file:./placeholder.db" (for schema validation)
 */
const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

function createPrismaClient(): PrismaClient {
  if (tursoUrl) {
    const adapter = new PrismaLibSQL({ url: tursoUrl, authToken: tursoToken })
    return new PrismaClient({ adapter })
  }
  // Local SQLite: standard PrismaClient (no adapter needed)
  return new PrismaClient()
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
