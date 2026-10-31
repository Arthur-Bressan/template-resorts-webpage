import { createHash, randomBytes } from 'node:crypto'
import { getPlatformBaseDomain, isValidTenantSlug } from '@/lib/tenant-context'

/** The raw token is a bearer credential; persist only its SHA-256 digest. */
export function createGuestReservationToken() {
  const token = randomBytes(32).toString('hex')
  return { token, tokenHash: hashGuestReservationToken(token) }
}

export function hashGuestReservationToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function isGuestReservationToken(value: string) {
  return /^[a-f0-9]{64}$/i.test(value)
}

export function getGuestReservationUrl(token: string, tenantSlug: string) {
  const baseDomain = getPlatformBaseDomain()
  if (!baseDomain || !isValidTenantSlug(tenantSlug) || !isGuestReservationToken(token)) return null
  try {
    const parsed = new URL(`https://${tenantSlug}.${baseDomain}`)
    return new URL(`/reservas/gerenciar/${token}`, parsed).toString()
  } catch {
    return null
  }
}

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character)
}
