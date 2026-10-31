import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { findActiveReservationItemConflict } from '@/lib/availability'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { escapeEmailHtml } from '@/lib/guest-reservation-link'
import { createNotification } from '@/lib/notifications'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

class ManualReviewConflictError extends Error {}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const body = await request.json()
    const action = body.action
    if (action !== 'confirm' && action !== 'cancel') return NextResponse.json({ error: 'Escolha confirmar ou cancelar após análise.' }, { status: 400 })
    const occurrenceId = randomUUID()

    const result = await serializableTransaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id, tenantId, status: 'manual_review', room: { is: { tenantId } } },
        include: {
          items: { where: { tenantId }, include: { roomUnit: { select: { id: true, isActive: true } } } },
          payments: { select: { status: true } },
          tenant: { select: { name: true, siteSetting: { select: { name: true, email: true } } } },
        },
      })
      if (!reservation) return { kind: 'not-found' as const }
      if (!reservation.items.length) return { kind: 'no-items' as const }
      const paidOnline = reservation.payments.some((payment) => payment.status === 'approved') || reservation.mercadoPagoStatus === 'approved'
      const now = new Date()
      const inactiveItems = reservation.items.filter((item) => ['cancelled', 'expired'].includes(item.status))
      const cancelledItems = reservation.items.filter((item) => item.status === 'cancelled')
      const confirmableItems = reservation.items.filter((item) => item.status !== 'cancelled')

      if (action === 'confirm') {
        if (reservation.checkOut <= now) return { kind: 'past' as const }
        if (!confirmableItems.length) return { kind: 'no-active-items' as const }
        for (const item of confirmableItems) {
          if (!item.roomUnit.isActive) return { kind: 'unavailable' as const }
          const conflict = await findActiveReservationItemConflict({
            tenantId,
            roomUnitId: item.roomUnitId,
            dates: { checkIn: item.checkIn, checkOut: item.checkOut },
            excludeReservationId: id,
          }, tx, now)
          if (conflict) return { kind: 'unavailable' as const }
          const block = await tx.availabilityBlock.findFirst({
            where: { tenantId, roomUnitId: item.roomUnitId, checkIn: { lt: item.checkOut }, checkOut: { gt: item.checkIn } },
            select: { id: true },
          })
          if (block) return { kind: 'unavailable' as const }
        }
        for (const item of confirmableItems) {
          const updated = await tx.reservationItem.updateMany({
            where: { id: item.id, tenantId, reservationId: id, status: item.status },
            data: { status: 'confirmed' },
          })
          if (!updated.count) throw new ManualReviewConflictError()
        }
        if (paidOnline) {
          for (const item of cancelledItems.filter((row) => row.refundStatus !== 'recorded')) {
            const updated = await tx.reservationItem.updateMany({
              where: { id: item.id, tenantId, reservationId: id, status: item.status, refundStatus: { not: 'recorded' } },
              data: { refundStatus: 'manual_refund_required' },
            })
            if (!updated.count) throw new ManualReviewConflictError()
            await tx.reservationItemCancellationEvent.create({
              data: { tenantId, reservationId: id, reservationItemId: item.id, action: 'manual_review_partial_refund_required', actorType: 'staff' },
            })
          }
        }
        const updatedReservation = await tx.reservation.updateMany({ where: { id, tenantId, status: 'manual_review' }, data: { status: 'confirmed', paymentReviewRequired: false } })
        if (!updatedReservation.count) throw new ManualReviewConflictError()
      } else {
        const updatedReservation = await tx.reservation.updateMany({ where: { id, tenantId, status: 'manual_review' }, data: { status: 'cancelled', paymentReviewRequired: false } })
        if (!updatedReservation.count) throw new ManualReviewConflictError()
        for (const item of reservation.items) {
          const itemIsInactive = ['cancelled', 'expired'].includes(item.status)
          if (!itemIsInactive || (paidOnline && item.refundStatus !== 'recorded')) {
            const updated = await tx.reservationItem.updateMany({
              where: { id: item.id, tenantId, reservationId: id, status: item.status },
              data: {
                ...(!itemIsInactive ? { status: 'cancelled' } : {}),
                ...(paidOnline && item.refundStatus !== 'recorded' ? { refundStatus: 'manual_refund_required' } : {}),
              },
            })
            if (!updated.count) throw new ManualReviewConflictError()
          }
          await tx.reservationItemCancellationEvent.create({
            data: { tenantId, reservationId: id, reservationItemId: item.id, action: 'manual_review_cancelled', actorType: 'staff' },
          })
        }
      }

      const refundItems = paidOnline
        ? (action === 'confirm' ? cancelledItems : reservation.items).filter((item) => item.refundStatus !== 'recorded')
        : []
      const refundRequired = refundItems.length > 0
      const refundNotice = refundRequired ? ' Reembolso manual pendente para ' + refundItems.length + ' unidade(s); confira os valores por unidade nos itens da reserva.' : ''
      const excludedNotice = action === 'confirm' && cancelledItems.length
        ? ' As unidades canceladas permaneceram sem reserva e não foram reabertas.'
        : ''
      const notificationMessage = action === 'confirm'
        ? 'A equipe confirmou ' + confirmableItems.length + ' unidade(s) disponível(is) da reserva ' + id + '.' + excludedNotice + refundNotice
        : 'A equipe cancelou a reserva ' + id + ' após análise.' + refundNotice

      await createNotification(tenantId, action === 'confirm' ? 'reservation.manual_review_confirmed' : 'reservation.manual_review_cancelled', {
        eventKey: `reservation.${action === 'confirm' ? 'manual_review_confirmed' : 'manual_review_cancelled'}:${id}:${occurrenceId}`,
        title: action === 'confirm'
          ? cancelledItems.length ? 'Unidades disponíveis confirmadas após revisão' : 'Reserva revisada e confirmada'
          : 'Reserva revisada e cancelada',
        message: notificationMessage,
        href: '/admin/reservations',
        data: {
          reservationId: id,
          paidOnline,
          confirmedItemCount: action === 'confirm' ? confirmableItems.length : 0,
          excludedItemCount: action === 'confirm' ? cancelledItems.length : inactiveItems.length,
          refundRequired,
          refundItemIds: refundItems.map((item) => item.id),
        },
      }, tx)
      return {
        kind: 'updated' as const,
        action,
        paidOnline,
        partial: action === 'confirm' && cancelledItems.length > 0,
        confirmedItemCount: action === 'confirm' ? confirmableItems.length : 0,
        refundRequired,
        refundItemCount: refundItems.length,
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail,
        tenantName: reservation.tenant?.siteSetting?.name || reservation.tenant?.name || 'Hospedagem',
        tenantEmail: reservation.tenant?.siteSetting?.email || '',
      }
    })

    if (result.kind === 'not-found') return NextResponse.json({ error: 'Reserva em revisão manual não encontrada.' }, { status: 404 })
    if (result.kind === 'no-items') return NextResponse.json({ error: 'A reserva não possui unidades para revisar.' }, { status: 409 })
    if (result.kind === 'past') return NextResponse.json({ error: 'O período já terminou; não é possível confirmar a reserva.' }, { status: 409 })
    if (result.kind === 'no-active-items') return NextResponse.json({ error: 'Todas as unidades já estão canceladas. Cancele a reserva após a análise para concluir o reembolso.' }, { status: 409 })
    if (result.kind === 'unavailable') return NextResponse.json({ error: 'Uma unidade não está disponível. Reatribua a unidade ou cancele após a análise.' }, { status: 409 })

    const refundMessage = result.refundRequired
      ? ' O reembolso manual correspondente a ' + result.refundItemCount + ' unidade(s) será processado pela pousada.'
      : ''
    const message = result.action === 'confirm'
      ? 'Após análise, a pousada confirmou ' + result.confirmedItemCount + ' unidade(s) ainda disponíveis. A confirmação foi feita manualmente.'
        + (result.partial ? ' As unidades canceladas permaneceram sem reserva e não foram reabertas.' : '')
        + refundMessage
      : 'Após análise, a pousada cancelou sua reserva.' + refundMessage
    await sendTransactionalEmail({ to: result.guestEmail, fromName: result.tenantName, subject: 'Resultado da análise da reserva', html: `<p>Olá, ${escapeEmailHtml(result.guestName)}.</p><p>${message}</p>`, text: `Olá, ${result.guestName}. ${message}` })
    if (result.tenantEmail) await sendTransactionalEmail({ to: result.tenantEmail, fromName: result.tenantName, subject: 'Análise manual de pagamento concluída', html: `<p>${message}</p>`, text: message })
    return NextResponse.json({
      ok: true,
      status: result.action === 'confirm' ? 'confirmed' : 'cancelled',
      partial: result.partial,
      confirmedItemCount: result.confirmedItemCount,
      refundRequired: result.refundRequired,
      refundItemCount: result.refundItemCount,
    })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (error instanceof ManualReviewConflictError) return NextResponse.json({ error: 'A reserva ou uma unidade foi alterada durante a revisão. Atualize a tela antes de tentar novamente.' }, { status: 409 })
    if (isSerializationConflict(error)) return NextResponse.json({ error: 'A disponibilidade mudou durante a revisão. Atualize a tela antes de tentar novamente.' }, { status: 409 })
    return NextResponse.json({ error: 'Não foi possível concluir a análise manual.' }, { status: 500 })
  }
}
