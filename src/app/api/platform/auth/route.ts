import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'
import {
  generatePlatformAdminToken,
  getPlatformAdminSession,
} from '@/lib/platform-auth'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password || email.length > 254 || password.length > 128) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const admin = await db.platformAdmin.findUnique({ where: { email } })
    if (
      !admin?.isActive ||
      !(await verifyPassword(password, admin.password))
    ) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = generatePlatformAdminToken({ id: admin.id })
    return NextResponse.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    })
  } catch {
    return NextResponse.json({ error: 'Não foi possível autenticar' }, { status: 500 })
  }
}

export async function GET() {
  const admin = await getPlatformAdminSession()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  return NextResponse.json({ admin: { id: admin.id, email: admin.email, name: admin.name } })
}

export async function DELETE() {
  const admin = await getPlatformAdminSession()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  return NextResponse.json({ ok: true })
}
