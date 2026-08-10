import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'
import { getAdminSession } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    // Step-by-step to isolate failures
    let admin
    try {
      admin = await db.admin.findUnique({ where: { email } })
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      console.error('[AUTH/DB]', msg)
      return NextResponse.json({ error: 'Erro ao buscar admin', debug: msg }, { status: 500 })
    }

    if (!admin) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    let valid
    try {
      valid = await verifyPassword(password, admin.password)
    } catch (bcryptErr) {
      const msg = bcryptErr instanceof Error ? bcryptErr.message : String(bcryptErr)
      console.error('[AUTH/BCRYPT]', msg)
      return NextResponse.json({ error: 'Erro ao verificar senha', debug: msg }, { status: 500 })
    }

    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = generateToken({ id: admin.id, email: admin.email, role: admin.role })

    return NextResponse.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[AUTH ERROR]', msg, e instanceof Error ? e.stack : '')
    return NextResponse.json({ error: 'Erro interno', debug: msg }, { status: 500 })
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
