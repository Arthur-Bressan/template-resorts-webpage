import { verifyToken } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'

export async function getAdminSession() {
  const headersList = await headers()
  const auth = headersList.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.replace('Bearer ', '')
  const payload = verifyToken(token) as { id: string; iat?: number } | null
  if (!payload) return null
  // Check token age (7 day expiry)
  if (Date.now() - (payload.iat || 0) > 7 * 24 * 60 * 60 * 1000) return null
  const admin = await db.admin.findUnique({ where: { id: payload.id } })
  return admin
}

export async function requireAdmin() {
  const admin = await getAdminSession()
  if (!admin) throw new Error('Unauthorized')
  return admin
}
