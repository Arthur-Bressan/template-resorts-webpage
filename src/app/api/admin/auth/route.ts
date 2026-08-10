import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'
import { getAdminSession, requireAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({ where: { email } })
    if (!admin) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const valid = await verifyPassword(password, admin.password)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = generateToken({ id: admin.id, email: admin.email, role: admin.role })

    return NextResponse.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const admin = await getAdminSession()
    if (!admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE() {
  return NextResponse.json({ ok: true })
}
