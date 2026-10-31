import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export type SessionAudience = 'company-admin' | 'platform-admin'
export type SessionSecretName = 'ADMIN_SECRET' | 'PLATFORM_ADMIN_SECRET'

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

function getSigningSecret(secretName: SessionSecretName): string {
  const secret = process.env[secretName]
  if (!secret || secret.length < 32) {
    throw new Error(`Authentication is not configured (${secretName})`)
  }
  return secret
}

export function generateSessionToken(
  payload: Record<string, unknown>,
  audience: SessionAudience,
  secretName: SessionSecretName,
): string {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(
    JSON.stringify({ ...payload, aud: audience, iat: now, exp: now + SESSION_TTL_SECONDS }),
  ).toString('base64url')
  const unsignedToken = `${header}.${body}`
  const signature = crypto
    .createHmac('sha256', getSigningSecret(secretName))
    .update(unsignedToken)
    .digest('base64url')
  return `${unsignedToken}.${signature}`
}

export function verifySessionToken(
  token: string,
  audience: SessionAudience,
  secretName: SessionSecretName,
): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [encodedHeader, encodedPayload, signature] = parts
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString()) as {
      alg?: unknown
      typ?: unknown
    }
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null

    const unsignedToken = `${encodedHeader}.${encodedPayload}`
    const expectedSignature = crypto
      .createHmac('sha256', getSigningSecret(secretName))
      .update(unsignedToken)
      .digest()
    const suppliedSignature = Buffer.from(signature, 'base64url')
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as Record<
      string,
      unknown
    >
    const now = Math.floor(Date.now() / 1000)
    if (
      payload.aud !== audience ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      payload.iat > now + 60 ||
      payload.exp <= now
    ) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export function generateToken(payload: Record<string, unknown>): string {
  return generateSessionToken(payload, 'company-admin', 'ADMIN_SECRET')
}

export function verifyToken(token: string): Record<string, unknown> | null {
  return verifySessionToken(token, 'company-admin', 'ADMIN_SECRET')
}
