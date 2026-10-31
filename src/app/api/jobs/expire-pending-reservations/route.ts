import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { RESERVATION_HOLD_TTL_MS } from '@/lib/availability'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

const BATCH_SIZE = 100

export const dynamic = 'force-dynamic'

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || secret.length < 16) return false
  const authorization = request.headers.get('authorization') || ''
  const expected = Buffer.from(`Bearer ${secret}`)
  const supplied = Buffer.from(authorization)
  return expected.length === supplied.length && timingSafeEqual(expected, supplied)
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character)
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const now = new Date()
  const legacyCutoff = new Date(now.getTime() - RESERVATION_HOLD_TTL_MS)
  const expirationFilter = {
    OR: [
      { items: { some: { status: { in: ['pending', 'cancellation_requested'] }, holdExpiresAt: { lte: now } } } },
      { items: { none: {} }, createdAt: { lte: legacyCutoff } },
    ],
  }
  const candidates = await db.reservation.findMany({
    where: { status: 'pending', tenantId: { not: null }, ...expirationFilter },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
    select: {
      id: true,
      tenantId: true,
      guestName: true,
      guestEmail: true,
      createdAt: true,
      checkIn: true,
      checkOut: true,
      items: { where: { status: { in: ['pending', 'cancellation_requested'] } }, select: { holdExpiresAt: true } },
      tenant: { select: { name: true } },
    },
  })

  let expiredCount = 0
  for (const candidate of candidates) {
    if (!candidate.tenantId) continue
    const holdExpiry = candidate.items.length > 0
      ? new Date(Math.min(...candidate.items.map((item) => item.holdExpiresAt.getTime())))
      : new Date(candidate.createdAt.getTime() + RESERVATION_HOLD_TTL_MS)
    let transitioned: boolean
    try {
      transitioned = await serializableTransaction(async (tx) => {
        const update = await tx.reservation.updateMany({
          where: {
            id: candidate.id,
            tenantId: candidate.tenantId,
            status: 'pending',
            ...expirationFilter,
          },
          data: { status: 'expired', mercadoPagoStatus: 'expired' },
        })
        if (!update.count) return false

        await tx.reservationItem.updateMany({
          where: { tenantId: candidate.tenantId, reservationId: candidate.id, status: { in: ['pending', 'cancellation_requested'] } },
          data: { status: 'expired' },
        })
        await createNotification(candidate.tenantId, 'reservation.expired', {
          eventKey: `reservation.expired:${candidate.id}:${holdExpiry.toISOString()}`,
          title: 'Retenção de reserva expirada',
          message: `A retenção da reserva de ${candidate.guestName} expirou; as unidades voltaram à disponibilidade.`,
          href: '/admin/reservations',
          data: { reservationId: candidate.id, holdExpiresAt: holdExpiry.toISOString() },
        }, tx)
        return true
      })
    } catch (error) {
      if (isSerializationConflict(error)) {
        return NextResponse.json({ error: 'Uma retenção mudou durante a expiração; esta execução terminou sem repetir a operação.' }, { status: 409 })
      }
      throw error
    }
    if (!transitioned) continue
    expiredCount += 1

    await sendTransactionalEmail({
      to: candidate.guestEmail,
      subject: `Prazo de pagamento da reserva ${candidate.id} encerrado`,
      fromName: candidate.tenant?.name,
      html: `<p>Olá, ${escapeHtml(candidate.guestName)}.</p><p>O prazo para concluir o pagamento da reserva de ${escapeHtml(candidate.tenant?.name || 'sua hospedagem')} terminou. As unidades foram liberadas.</p><p>Para reservar novamente, escolha as datas e acomodações disponíveis no site.</p>`,
      text: `Olá, ${candidate.guestName}. O prazo para concluir o pagamento da reserva de ${candidate.tenant?.name || 'sua hospedagem'} terminou. As unidades foram liberadas. Para reservar novamente, escolha as datas e acomodações disponíveis no site.`,
    })
  }

  return NextResponse.json({ ok: true, processed: expiredCount, scanned: candidates.length })
}

export async function POST(request: NextRequest) {
  return GET(request)
}
