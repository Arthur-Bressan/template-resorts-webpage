import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { escapeEmailHtml } from '@/lib/guest-reservation-link'
import { createNotification } from '@/lib/notifications'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

type Decision = 'approve' | 'deny' | 'cancel'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const body = await request.json()
    const action = body.action as Decision
    const itemIds = Array.isArray(body.itemIds)
      ? [...new Set(body.itemIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim()).map((value: string) => value.trim()))]
      : []
    if (!['approve', 'deny', 'cancel'].includes(action) || !itemIds.length || itemIds.length > 50) {
      return NextResponse.json({ error: 'Informe a ação e as unidades da reserva.' }, { status: 400 })
    }
    const occurrenceId = randomUUID()

    const result = await serializableTransaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id, tenantId, room: { is: { tenantId } }, status: { notIn: ['cancelled', 'expired', 'completed'] } },
        include: {
          items: { where: { tenantId } },
          payments: { select: { status: true } },
          tenant: { select: { name: true, siteSetting: { select: { name: true, email: true } } } },
        },
      })
      if (!reservation) return { kind: 'not-found' as const }
      const selected = reservation.items.filter((item) => itemIds.includes(item.id))
      if (selected.length !== itemIds.length) return { kind: 'item-not-found' as const }
      const paidOnline = reservation.payments.some((payment) => payment.status === 'approved') || reservation.mercadoPagoStatus === 'approved'
      const now = new Date()
      if (action === 'deny' && reservation.status === 'pending' && selected.some((item) => item.holdExpiresAt <= now)) {
        return { kind: 'pending-expired' as const }
      }

      for (const item of selected) {
        const isRequested = item.status === 'cancellation_requested'
        if (action === 'approve' && !isRequested) return { kind: 'not-requested' as const }
        if (action === 'deny' && !isRequested) return { kind: 'not-requested' as const }
        if (action === 'cancel' && ['cancelled', 'expired'].includes(item.status)) return { kind: 'inactive' as const }

        if (action === 'deny') {
          const restoreStatus = reservation.status === 'pending' && item.holdExpiresAt > now ? 'pending' : 'confirmed'
          await tx.reservationItem.updateMany({ where: { id: item.id, tenantId, status: 'cancellation_requested' }, data: { status: restoreStatus } })
          await tx.reservationItemCancellationEvent.create({
            data: { tenantId, reservationId: id, reservationItemId: item.id, action: 'request_denied', actorType: 'staff', policyWindowHours: item.cancellationWindowHoursAtRequest },
          })
        } else {
          await tx.reservationItem.updateMany({
            where: { id: item.id, tenantId, status: item.status },
            data: { status: 'cancelled', refundStatus: paidOnline ? 'manual_refund_required' : item.refundStatus },
          })
          await tx.reservationItemCancellationEvent.create({
            data: {
              tenantId,
              reservationId: id,
              reservationItemId: item.id,
              action: action === 'approve' ? 'request_approved' : 'staff_cancelled',
              actorType: 'staff',
              policyWindowHours: item.cancellationWindowHoursAtRequest,
            },
          })
        }
      }

      const remaining = await tx.reservationItem.count({ where: { tenantId, reservationId: id, status: { notIn: ['cancelled', 'expired'] } } })
      if (!remaining) await tx.reservation.updateMany({ where: { id, tenantId }, data: { status: 'cancelled' } })

      if (action !== 'deny') {
        await createNotification(tenantId, 'reservation.cancelled', {
          eventKey: `reservation.cancelled:${id}:${occurrenceId}`,
          title: 'Cancelamento de unidades da reserva',
          message: `${selected.length} unidade(s) foram canceladas. ${paidOnline ? 'A pousada deve processar eventual reembolso manualmente.' : ''}`.trim(),
          href: '/admin/reservations',
          data: { reservationId: id, itemIds: selected.map((item) => item.id).join(','), refundRequired: paidOnline },
        }, tx)
      } else {
        await createNotification(tenantId, 'reservation.cancel_request_denied', {
          eventKey: `reservation.cancel_request_denied:${id}:${occurrenceId}`,
          title: 'Pedido de cancelamento recusado',
          message: `A equipe recusou o pedido de cancelamento de ${reservation.guestName}; as unidades continuam ocupadas.`,
          href: '/admin/reservations',
          data: { reservationId: id, itemIds: selected.map((item) => item.id).join(',') },
        }, tx)
      }
      return {
        kind: 'updated' as const,
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail,
        tenantName: reservation.tenant?.siteSetting?.name || reservation.tenant?.name || 'Hospedagem',
        tenantEmail: reservation.tenant?.siteSetting?.email || '',
        paidOnline,
        action,
        itemCount: selected.length,
        reservationId: id,
      }
    })

    if (result.kind === 'not-found') return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
    if (result.kind === 'item-not-found') return NextResponse.json({ error: 'Uma unidade não pertence a esta reserva.' }, { status: 404 })
    if (result.kind === 'not-requested') return NextResponse.json({ error: 'A unidade selecionada não tem pedido aguardando análise.' }, { status: 409 })
    if (result.kind === 'inactive') return NextResponse.json({ error: 'A unidade selecionada já está liberada.' }, { status: 409 })
    if (result.kind === 'pending-expired') return NextResponse.json({ error: 'A retenção desta reserva pendente terminou; aguarde a expiração do pedido.' }, { status: 409 })

    const actionMessage = result.action === 'deny'
      ? 'A pousada analisou seu pedido e manteve as unidades reservadas.'
      : `A pousada cancelou ${result.itemCount} unidade(s) da reserva.${result.paidOnline ? ' Eventual reembolso será processado manualmente pela pousada.' : ''}`
    await sendTransactionalEmail({
      to: result.guestEmail,
      fromName: result.tenantName,
      subject: `Atualização da reserva ${result.reservationId}`,
      html: `<p>Olá, ${escapeEmailHtml(result.guestName)}.</p><p>${actionMessage}</p>`,
      text: `Olá, ${result.guestName}. ${actionMessage}`,
    })
    if (result.tenantEmail) await sendTransactionalEmail({
      to: result.tenantEmail,
      fromName: result.tenantName,
      subject: result.action === 'deny' ? 'Pedido de cancelamento recusado' : 'Cancelamento de reserva registrado',
      html: `<p>${result.action === 'deny' ? 'Pedido recusado.' : `${result.itemCount} unidade(s) canceladas.`} ${result.paidOnline && result.action !== 'deny' ? 'Registre o reembolso manual após processá-lo.' : ''}</p>`,
      text: `${result.action === 'deny' ? 'Pedido recusado.' : `${result.itemCount} unidade(s) canceladas.`} ${result.paidOnline && result.action !== 'deny' ? 'Registre o reembolso manual após processá-lo.' : ''}`,
    })
    return NextResponse.json({ ok: true, action: result.action, refundRequired: result.paidOnline && result.action !== 'deny' })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) return NextResponse.json({ error: 'A reserva mudou durante o processamento do cancelamento. Atualize a tela antes de tentar novamente.' }, { status: 409 })
    return NextResponse.json({ error: 'Não foi possível processar o cancelamento.' }, { status: 500 })
  }
}
