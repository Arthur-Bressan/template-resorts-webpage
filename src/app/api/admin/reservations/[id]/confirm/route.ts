import { NextRequest, NextResponse } from 'next/server'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { escapeEmailHtml } from '@/lib/guest-reservation-link'
import { createNotification } from '@/lib/notifications'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const result = await serializableTransaction(async (tx) => {
      const now = new Date()
      const reservation = await tx.reservation.findFirst({
        where: { id, tenantId, bookingSource: 'manual', status: 'pending', room: { is: { tenantId } } },
        include: {
          items: { where: { tenantId } },
          tenant: { select: { name: true, siteSetting: { select: { name: true, email: true } } } },
        },
      })
      if (!reservation) return { kind: 'not-found' as const }
      if (!reservation.items.length || reservation.items.some((item) => item.status !== 'pending' || item.holdExpiresAt <= now)) {
        return { kind: 'expired' as const }
      }

      const [reservationUpdate, itemUpdate] = await Promise.all([
        tx.reservation.updateMany({ where: { id, tenantId, bookingSource: 'manual', status: 'pending' }, data: { status: 'confirmed' } }),
        tx.reservationItem.updateMany({ where: { tenantId, reservationId: id, status: 'pending', holdExpiresAt: { gt: now } }, data: { status: 'confirmed' } }),
      ])
      if (!reservationUpdate.count || itemUpdate.count !== reservation.items.length) throw new Error('Manual reservation changed before confirmation')
      await createNotification(tenantId, 'reservation.confirmed_manual', {
        eventKey: `reservation.confirmed_manual:${id}:${now.toISOString()}`,
        title: 'Reserva presencial confirmada',
        message: `A equipe confirmou a reserva de ${reservation.guestName}.`,
        href: '/admin/reservations',
        data: { reservationId: id },
      }, tx)
      return {
        kind: 'confirmed' as const,
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail,
        tenantName: reservation.tenant?.siteSetting?.name || reservation.tenant?.name || 'Hospedagem',
        tenantEmail: reservation.tenant?.siteSetting?.email || '',
      }
    })

    if (result.kind === 'not-found') return NextResponse.json({ error: 'Reserva manual pendente não encontrada.' }, { status: 404 })
    if (result.kind === 'expired') return NextResponse.json({ error: 'A retenção expirou. Não é possível confirmar esta reserva.' }, { status: 409 })
    const message = 'A equipe confirmou operacionalmente sua reserva presencial.'
    await sendTransactionalEmail({ to: result.guestEmail, fromName: result.tenantName, subject: 'Reserva confirmada', html: `<p>Olá, ${escapeEmailHtml(result.guestName)}.</p><p>${message}</p>`, text: `Olá, ${result.guestName}. ${message}` })
    if (result.tenantEmail) await sendTransactionalEmail({ to: result.tenantEmail, fromName: result.tenantName, subject: 'Reserva presencial confirmada', html: `<p>${message}</p>`, text: message })
    return NextResponse.json({ ok: true, status: 'confirmed' })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) return NextResponse.json({ error: 'A retenção mudou durante a confirmação. Atualize a tela antes de tentar novamente.' }, { status: 409 })
    return NextResponse.json({ error: 'Não foi possível confirmar a reserva.' }, { status: 409 })
  }
}
