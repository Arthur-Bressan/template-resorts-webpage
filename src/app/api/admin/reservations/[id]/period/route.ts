import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { findActiveReservationItemConflict, findLegacyReservationConflicts, parseStayDates, AvailabilityError } from '@/lib/availability'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { escapeEmailHtml } from '@/lib/guest-reservation-link'
import { createNotification } from '@/lib/notifications'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const body = await request.json()
    const dates = parseStayDates({ checkIn: body.checkIn, checkOut: body.checkOut })
    const guests = body.guests
    if (typeof guests !== 'number' || !Number.isSafeInteger(guests) || guests < 1 || guests > 50) {
      return NextResponse.json({ error: 'Informe um número válido de hóspedes.' }, { status: 400 })
    }
    const nights = (dates.checkOut.getTime() - dates.checkIn.getTime()) / 86400000
    if (!Number.isSafeInteger(nights) || nights < 1) return NextResponse.json({ error: 'A estadia deve ter ao menos uma noite.' }, { status: 400 })

    const result = await serializableTransaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id, tenantId, room: { is: { tenantId } }, status: { in: ['pending', 'confirmed'] } },
        include: {
          items: { where: { tenantId, status: { notIn: ['cancelled', 'expired'] } }, include: { room: { select: { id: true, name: true, price: true, capacity: true } } } },
          payments: { select: { status: true } },
          tenant: { select: { name: true, siteSetting: { select: { name: true, email: true } } } },
        },
      })
      if (!reservation) return { kind: 'not-found' as const }
      if (!reservation.items.length) return { kind: 'no-items' as const }
      if (reservation.status === 'pending' && reservation.items.some((item) => item.holdExpiresAt <= new Date())) return { kind: 'expired' as const }
      const capacity = reservation.items.reduce((total, item) => total + item.room.capacity, 0)
      if (guests > capacity) return { kind: 'capacity' as const }

      for (const item of reservation.items) {
        const conflict = await findActiveReservationItemConflict({
          tenantId,
          roomUnitId: item.roomUnitId,
          dates,
          excludeReservationId: id,
        }, tx)
        if (conflict) return { kind: 'conflict' as const }
        const block = await tx.availabilityBlock.findFirst({
          where: { tenantId, roomUnitId: item.roomUnitId, checkIn: { lt: dates.checkOut }, checkOut: { gt: dates.checkIn } },
          select: { id: true },
        })
        if (block) return { kind: 'blocked' as const }
        const legacy = await findLegacyReservationConflicts({ tenantId, categoryId: item.roomId, dates }, tx)
        if (legacy.length) return { kind: 'legacy-conflict' as const }
      }

      const oldActiveTotal = roundMoney(reservation.items.reduce((total, item) => total + item.totalPrice, 0))
      const newActiveTotal = roundMoney(reservation.items.reduce((total, item) => total + roundMoney(item.room.price) * nights, 0))
      const delta = roundMoney(newActiveTotal - oldActiveTotal)
      const adjustedReservationTotal = roundMoney(reservation.totalPrice + delta)
      for (const item of reservation.items) {
        await tx.reservationItem.updateMany({
          where: { id: item.id, tenantId, reservationId: id, status: item.status },
          data: {
            checkIn: dates.checkIn,
            checkOut: dates.checkOut,
            unitPricePerNight: roundMoney(item.room.price),
            totalPrice: roundMoney(item.room.price * nights),
          },
        })
      }
      await tx.reservation.updateMany({ where: { id, tenantId }, data: { checkIn: dates.checkIn, checkOut: dates.checkOut, guests, totalPrice: adjustedReservationTotal } })
      await createNotification(tenantId, 'reservation.period_changed', {
        eventKey: `reservation.period_changed:${id}:${randomUUID()}`,
        title: 'Período da reserva alterado',
        message: `A equipe alterou o período da reserva de ${reservation.guestName}.`,
        href: '/admin/reservations',
        data: { reservationId: id, totalBefore: reservation.totalPrice, totalAfter: adjustedReservationTotal, delta },
      }, tx)
      return {
        kind: 'updated' as const,
        reservationId: id,
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail,
        tenantName: reservation.tenant?.siteSetting?.name || reservation.tenant?.name || 'Hospedagem',
        tenantEmail: reservation.tenant?.siteSetting?.email || '',
        totalBefore: reservation.totalPrice,
        totalAfter: adjustedReservationTotal,
        delta,
        paidOnline: reservation.payments.some((payment) => payment.status === 'approved') || reservation.mercadoPagoStatus === 'approved',
      }
    })

    if (result.kind === 'not-found') return NextResponse.json({ error: 'Reserva não encontrada ou não pode ser alterada.' }, { status: 404 })
    if (result.kind === 'no-items') return NextResponse.json({ error: 'Reserva sem unidades ativas não pode ser alterada.' }, { status: 409 })
    if (result.kind === 'expired') return NextResponse.json({ error: 'A retenção da reserva expirou.' }, { status: 409 })
    if (result.kind === 'capacity') return NextResponse.json({ error: 'O número de hóspedes excede a capacidade das unidades.' }, { status: 400 })
    if (result.kind === 'conflict' || result.kind === 'blocked' || result.kind === 'legacy-conflict') return NextResponse.json({ error: 'Uma unidade não está disponível para o novo período.' }, { status: 409 })

    const deltaText = result.delta > 0
      ? `Diferença de ${result.delta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a cobrar fora do sistema.`
      : result.delta < 0
        ? `Diferença de ${Math.abs(result.delta).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para reembolso manual fora do sistema.`
        : 'O valor total permaneceu igual.'
    await sendTransactionalEmail({
      to: result.guestEmail,
      fromName: result.tenantName,
      subject: `Alteração na reserva ${result.reservationId}`,
      html: `<p>O período e/ou número de hóspedes da sua reserva foi atualizado.</p><p>${deltaText}</p>`,
      text: `O período e/ou número de hóspedes da sua reserva foi atualizado. ${deltaText}`,
    })
    if (result.tenantEmail) await sendTransactionalEmail({
      to: result.tenantEmail,
      fromName: result.tenantName,
      subject: `Reserva ${result.reservationId} alterada`,
      html: `<p>Alteração registrada para ${escapeEmailHtml(result.guestName)}. ${deltaText}</p>`,
      text: `Alteração registrada para ${result.guestName}. ${deltaText}`,
    })
    return NextResponse.json({
      reservationId: result.reservationId,
      totalBefore: result.totalBefore,
      totalAfter: result.totalAfter,
      delta: result.delta,
      paidOnline: result.paidOnline,
      settlementMessage: result.paidOnline ? deltaText : null,
    })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) return NextResponse.json({ error: 'A disponibilidade mudou durante a alteração do período. Atualize a tela antes de tentar novamente.' }, { status: 409 })
    if (error instanceof AvailabilityError) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Não foi possível alterar o período da reserva.' }, { status: 500 })
  }
}
