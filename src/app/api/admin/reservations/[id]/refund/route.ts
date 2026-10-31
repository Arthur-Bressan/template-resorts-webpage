import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { escapeEmailHtml } from '@/lib/guest-reservation-link'
import { createNotification } from '@/lib/notifications'

class ManualRefundConflictError extends Error {}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const body = await request.json()
    const itemIds = Array.isArray(body.itemIds)
      ? [...new Set(body.itemIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim()).map((value: string) => value.trim()))]
      : []
    if (!itemIds.length || itemIds.length > 50) return NextResponse.json({ error: 'Selecione as unidades com reembolso processado.' }, { status: 400 })
    const occurrenceId = randomUUID()

    const result = await db.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id, tenantId, room: { is: { tenantId } } },
        include: {
          items: { where: { tenantId, id: { in: itemIds } } },
          payments: { select: { status: true } },
          tenant: { select: { name: true, siteSetting: { select: { name: true, email: true } } } },
        },
      })
      if (!reservation) return { kind: 'not-found' as const }
      if (reservation.items.length !== itemIds.length) return { kind: 'item-not-found' as const }
      if (!reservation.payments.some((payment) => payment.status === 'approved') && reservation.mercadoPagoStatus !== 'approved') {
        return { kind: 'not-paid' as const }
      }
      if (reservation.items.some((item) => !['cancelled', 'expired'].includes(item.status) || item.refundStatus !== 'manual_refund_required')) {
        return { kind: 'not-required' as const }
      }
      for (const item of reservation.items) {
        const updated = await tx.reservationItem.updateMany({
          where: { id: item.id, tenantId, reservationId: id, status: item.status, refundStatus: 'manual_refund_required' },
          data: { refundStatus: 'recorded' },
        })
        if (!updated.count) throw new ManualRefundConflictError()
        await tx.reservationItemCancellationEvent.create({
          data: { tenantId, reservationId: id, reservationItemId: item.id, action: 'manual_refund_recorded', actorType: 'staff' },
        })
      }
      const notificationMessage = 'A pousada registrou o processamento manual de reembolso para ' + reservation.items.length + ' unidade(s) de ' + reservation.guestName + '.'
      await createNotification(tenantId, 'reservation.refund_recorded', {
        eventKey: `reservation.refund_recorded:${id}:${occurrenceId}`,
        title: 'Reembolso manual registrado',
        message: notificationMessage,
        href: '/admin/reservations',
        data: {
          reservationId: id,
          itemIds: reservation.items.map((item) => item.id).join(','),
          refundItemCount: reservation.items.length,
        },
      }, tx)
      return {
        kind: 'recorded' as const,
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail,
        refundItemCount: reservation.items.length,
        tenantName: reservation.tenant?.siteSetting?.name || reservation.tenant?.name || 'Hospedagem',
        tenantEmail: reservation.tenant?.siteSetting?.email || '',
      }
    })
    if (result.kind === 'not-found') return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
    if (result.kind === 'item-not-found') return NextResponse.json({ error: 'Unidade não pertence a esta reserva.' }, { status: 404 })
    if (result.kind === 'not-paid') return NextResponse.json({ error: 'Não há pagamento online aprovado vinculado a esta reserva.' }, { status: 409 })
    if (result.kind === 'not-required') return NextResponse.json({ error: 'Selecione somente unidades canceladas ou expiradas com reembolso manual pendente.' }, { status: 409 })

    const message = 'A pousada registrou que o reembolso referente a ' + result.refundItemCount + ' unidade(s) foi processado manualmente no Mercado Pago.'
    await sendTransactionalEmail({
      to: result.guestEmail,
      fromName: result.tenantName,
      subject: 'Reembolso registrado',
      html: `<p>Olá, ${escapeEmailHtml(result.guestName)}.</p><p>${message}</p>`,
      text: `Olá, ${result.guestName}. ${message}`,
    })
    if (result.tenantEmail) await sendTransactionalEmail({
      to: result.tenantEmail,
      fromName: result.tenantName,
      subject: 'Reembolso manual registrado no painel',
      html: `<p>${message}</p>`,
      text: message,
    })
    return NextResponse.json({ ok: true, refundStatus: 'recorded', refundItemCount: result.refundItemCount })
  } catch (error) {
    if (error instanceof ManualRefundConflictError) return NextResponse.json({ error: 'Uma unidade foi alterada durante o registro. Atualize a tela antes de tentar novamente.' }, { status: 409 })
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Não foi possível registrar o reembolso.' }, { status: 500 })
  }
}
