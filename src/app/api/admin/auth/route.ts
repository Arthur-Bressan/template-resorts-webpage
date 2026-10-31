import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateToken, hashPassword, verifyPassword } from '@/lib/auth'
import { getAdminSession, requireCompanyAdmin } from '@/lib/admin-auth'

const INVALID_INVITATION = 'Convite inválido ou expirado'

function publicAdmin(admin: { id: string; email: string; name: string; role: string }) {
  return { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
}

async function acceptInvitation(body: Record<string, unknown>) {
  const token = typeof body.token === 'string' ? body.token : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (
    !token ||
    token.length > 128 ||
    password.length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return NextResponse.json(
      { error: 'Informe o convite e uma senha com pelo menos 12 caracteres' },
      { status: 400 },
    )
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const invitation = await db.adminInvitation.findUnique({ where: { tokenHash } })
  if (
    !invitation ||
    invitation.usedAt ||
    invitation.revokedAt ||
    invitation.expiresAt <= new Date()
  ) {
    return NextResponse.json({ error: INVALID_INVITATION }, { status: 400 })
  }

  const sessionToken = generateToken({ id: invitation.adminId })
  const passwordHash = await hashPassword(password)
  const now = new Date()
  const admin = await db.$transaction(async (tx) => {
    const currentInvitation = await tx.adminInvitation.findUnique({ where: { tokenHash } })
    if (
      !currentInvitation ||
      currentInvitation.usedAt ||
      currentInvitation.revokedAt ||
      currentInvitation.expiresAt <= now
    ) {
      return null
    }

    const invitedAdmin = await tx.admin.findUnique({
      where: { id: currentInvitation.adminId },
      select: { id: true, password: true },
    })
    if (!invitedAdmin || invitedAdmin.password !== null) return null

    const consumed = await tx.adminInvitation.updateMany({
      where: {
        id: currentInvitation.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    })
    if (consumed.count !== 1) return null

    return tx.admin.update({
      where: { id: currentInvitation.adminId },
      data: { password: passwordHash },
    })
  })

  if (!admin) return NextResponse.json({ error: INVALID_INVITATION }, { status: 400 })
  return NextResponse.json({ token: sessionToken, admin: publicAdmin(admin) })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    if (body.action === 'accept-invitation') return await acceptInvitation(body)

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password || email.length > 254 || password.length > 128) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({ where: { email } })
    if (!admin?.password || !(await verifyPassword(password, admin.password))) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const memberships = await db.companyMembership.findMany({
      where: { adminId: admin.id },
      select: { role: true, tenantId: true },
    })
    if (memberships.length !== 1 || memberships[0].role !== 'admin') {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }
    const tenantMembershipCount = await db.companyMembership.count({
      where: { tenantId: memberships[0].tenantId },
    })
    if (tenantMembershipCount !== 1) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = generateToken({ id: admin.id })
    return NextResponse.json({ token, admin: publicAdmin(admin) })
  } catch {
    return NextResponse.json({ error: 'Não foi possível autenticar' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { admin, tenant } = await requireCompanyAdmin()
    return NextResponse.json({
      admin: publicAdmin(admin),
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    })
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
}

export async function DELETE() {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  return NextResponse.json({ ok: true })
}
