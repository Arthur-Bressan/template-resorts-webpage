import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { generateSessionToken, verifySessionToken } from '@/lib/auth'

export function generatePlatformAdminToken(payload: Record<string, unknown>): string {
  return generateSessionToken(payload, 'platform-admin', 'PLATFORM_ADMIN_SECRET')
}

export async function getPlatformAdminSession() {
  const headersList = await headers()
  const authorization = headersList.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const payload = verifySessionToken(
    authorization.slice('Bearer '.length),
    'platform-admin',
    'PLATFORM_ADMIN_SECRET',
  )
  if (!payload || typeof payload.id !== 'string') return null

  return db.platformAdmin.findFirst({
    where: { id: payload.id, isActive: true },
    select: { id: true, email: true, name: true, isActive: true },
  })
}

export async function requirePlatformAdmin() {
  const admin = await getPlatformAdminSession()
  if (!admin) throw new Error('Unauthorized')
  return admin
}
