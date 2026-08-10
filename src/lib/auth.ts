import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-in-production-32char'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url')
  const signature = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url')
  return `${header}.${body}.${signature}`
}

export function verifyToken(token: string): object | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, signature] = parts
    const expected = crypto
      .createHmac('sha256', ADMIN_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url')
    if (signature !== expected) return null
    return JSON.parse(Buffer.from(body, 'base64url').toString())
  } catch {
    return null
  }
}
