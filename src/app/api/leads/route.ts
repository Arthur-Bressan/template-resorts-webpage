import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPublicTenant, getSiteConfig } from '@/lib/data'
import { createNotification } from '@/lib/notifications'
import { sendTransactionalEmail } from '@/lib/email'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_PHONE_CHARACTERS = /^[+\d ().-]+$/

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined
  return date
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return value.replace(/[&<>"']/g, (character) => entities[character] || character)
}

function formatDateOnly(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date)
}

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

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const contact = typeof body.contact === 'string' ? body.contact.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const consent = body.consent === true
  const checkIn = parseDate(body.checkIn)
  const checkOut = parseDate(body.checkOut)
  const desiredCategoryId = typeof body.desiredCategoryId === 'string' ? body.desiredCategoryId.trim() : ''

  if (!name || name.length > 120 || !contact || contact.length > 254 || !message || message.length > 5000) {
    return NextResponse.json({ error: 'Informe nome, contato e mensagem válidos' }, { status: 400 })
  }
  if (!consent) return NextResponse.json({ error: 'O consentimento é obrigatório' }, { status: 400 })
  if (checkIn === undefined || checkOut === undefined || Boolean(checkIn) !== Boolean(checkOut)) {
    return NextResponse.json({ error: 'Informe um período válido com entrada e saída' }, { status: 400 })
  }
  if (checkIn && checkOut && checkOut <= checkIn) {
    return NextResponse.json({ error: 'A data de saída deve ser posterior à entrada' }, { status: 400 })
  }

  const email = EMAIL_PATTERN.test(contact) ? contact.toLowerCase() : ''
  const phone = email ? '' : contact
  if (!email && (phone.length > 40 || !ALLOWED_PHONE_CHARACTERS.test(phone) || (phone.match(/\d/g) || []).length < 8)) {
    return NextResponse.json({ error: 'Informe um e-mail ou telefone válido' }, { status: 400 })
  }

  let desiredCategory: string | null = null
  if (desiredCategoryId) {
    const room = await db.room.findFirst({
      where: { id: desiredCategoryId, tenantId: tenant.id, published: true },
      select: { id: true, name: true },
    })
    if (!room) return NextResponse.json({ error: 'Categoria indisponível' }, { status: 400 })
    desiredCategory = room.name
  }

  let propertyName = tenant.name
  let propertyEmail = ''
  try {
    const { settings } = await getSiteConfig(tenant.id, tenant.name)
    propertyName = settings.name || tenant.name
    propertyEmail = settings.email.trim()
  } catch {
    // Contact details are optional; configuration lookup must not prevent the
    // transactional lead + CMS notification from being recorded.
  }

  const lead = await db.$transaction(async (transaction) => {
    const createdLead = await transaction.contactSubmission.create({
      data: {
        tenantId: tenant.id,
        name,
        email,
        phone,
        message,
        consent,
        status: 'new',
        ...(checkIn ? { checkIn } : {}),
        ...(checkOut ? { checkOut } : {}),
        ...(desiredCategoryId ? { desiredCategoryId } : {}),
        ...(desiredCategory ? { desiredCategory } : {}),
      },
      select: { id: true, name: true },
    })

    await createNotification(tenant.id, 'lead.created', {
      eventKey: `lead.created:${createdLead.id}`,
      title: 'Novo lead recebido',
      message: `${createdLead.name} enviou uma consulta.`,
      href: '/admin/contacts',
      data: { leadId: createdLead.id },
    }, transaction)

    return createdLead
  })

  const emailNotification = propertyEmail
    ? sendTransactionalEmail({
        to: propertyEmail,
        fromName: propertyName,
        replyTo: propertyEmail,
        subject: `Nova consulta para ${propertyName}`,
        text: [
          `Novo lead recebido por ${propertyName}.`,
          `Nome: ${lead.name}`,
          `Contato: ${email || phone}`,
          `Mensagem: ${message}`,
          checkIn && checkOut ? `Período: ${formatDateOnly(checkIn)} a ${formatDateOnly(checkOut)}` : '',
          desiredCategory ? `Categoria desejada: ${desiredCategory}` : '',
        ].filter(Boolean).join('\n'),
        html: `<h1>Novo lead recebido</h1><p><strong>Hospedagem:</strong> ${escapeHtml(propertyName)}</p><p><strong>Nome:</strong> ${escapeHtml(lead.name)}</p><p><strong>Contato:</strong> ${escapeHtml(email || phone)}</p><p><strong>Mensagem:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>${checkIn && checkOut ? `<p><strong>Período:</strong> ${formatDateOnly(checkIn)} a ${formatDateOnly(checkOut)}</p>` : ''}${desiredCategory ? `<p><strong>Categoria desejada:</strong> ${escapeHtml(desiredCategory)}</p>` : ''}`,
      })
    : Promise.resolve({ sent: false as const, reason: 'not_configured' as const })

  // Email delivery runs after the transaction and cannot roll back either row.
  await Promise.allSettled([emailNotification])

  return NextResponse.json({ ok: true }, { status: 201 })
}
