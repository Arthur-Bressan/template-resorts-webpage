import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPublicTenant } from '@/lib/data'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const tenant = await getPublicTenant()
  if (!tenant) return NextResponse.json({ error: 'Hospedagem não encontrada' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    const parsed = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Informe um e-mail válido' }, { status: 400 })
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: 'O consentimento é obrigatório' }, { status: 400 })
  }

  // An existing consent record is never replaced with a withdrawn value. This
  // route only accepts an explicit opt-in and makes duplicate submissions safe.
  await db.newsletterSubscriber.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    create: { tenantId: tenant.id, email, consent: true },
    update: { consent: true },
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
