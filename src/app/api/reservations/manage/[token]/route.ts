import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { escapeEmailHtml, hashGuestReservationToken, isGuestReservationToken } from '@/lib/guest-reservation-link'
import { createNotification } from '@/lib/notifications'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

type RouteContext = { params: Promise<{ token: string }> }

function noStoreJson(value: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set('Cache-Control', 'no-store, private')
  return NextResponse.json(value, { ...init, headers })
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { token } = await params
  if (!isGuestReservationToken(token)) return noStoreJson({ error: 'Link inválido.' }, { status: 404 })
  const reservation = await db.reservation.findUnique({
    where: { manageTokenHash: hashGuestReservationToken(token) },
    include: {
      tenant: { select: { name: true, siteSetting: { select: { name: true } } } },
    },
  })
  if (!reservation || !reservation.tenantId) return noStoreJson({ error: 'Reserva não encontrada.' }, { status: 404 })
  const items = await db.reservationItem.findMany({
    where: { tenantId: reservation.tenantId, reservationId: reservation.id },
    orderBy: [{ room: { name: 'asc' } }, { roomUnit: { identifier: 'asc' } }],
    include: {
      room: { select: { id: true, name: true, cancellationWindowHours: true } },
      roomUnit: { select: { identifier: true } },
    },
  })
  if (!items.length) return noStoreJson({ error: 'Esta reserva não possui unidades físicas registradas para gerenciamento. Entre em contato com a pousada.' }, { status: 409 })

  const now = new Date()
  return noStoreJson({
    reservation: {
      id: reservation.id,
      guestName: reservation.guestName,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      guests: reservation.guests,
      totalPrice: reservation.totalPrice,
      status: reservation.status,
      propertyName: reservation.tenant?.siteSetting?.name || reservation.tenant?.name || 'Hospedagem',
      items: items.map((item) => {
        const deadline = item.room.cancellationWindowHours == null
          ? null
          : new Date(item.checkIn.getTime() - item.room.cancellationWindowHours * 60 * 60 * 1000)
        const reservationOpen = reservation.status === 'confirmed' || (reservation.status === 'pending' && item.holdExpiresAt > now)
        const canRequest = !['cancelled', 'expired', 'cancellation_requested'].includes(item.status) && reservationOpen
        return {
          id: item.id,
          roomName: item.room.name,
          unitIdentifier: item.roomUnit.identifier,
          checkIn: item.checkIn,
          checkOut: item.checkOut,
          status: item.status,
          refundStatus: item.refundStatus,
          cancellationWindowHours: item.room.cancellationWindowHours,
          cancellationDeadline: deadline,
          canCancelDirectly: canRequest && deadline !== null && now <= deadline,
          canRequestCancellation: canRequest,
        }
      }),
    },
  })
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { token } = await params
  if (!isGuestReservationToken(token)) return noStoreJson({ error: 'Link inválido.' }, { status: 404 })
  let body: Record<string, unknown>
  try {
    const parsed = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return noStoreJson({ error: 'Pedido inválido.' }, { status: 400 })
    body = parsed as Record<string, unknown>
  } catch {
    return noStoreJson({ error: 'Pedido inválido.' }, { status: 400 })
  }
  const itemIds = Array.isArray(body.itemIds)
    ? [...new Set(body.itemIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim()).map((value: string) => value.trim()))]
    : []
  if (itemIds.length > 20) return noStoreJson({ error: 'Selecione no máximo 20 unidades por vez.' }, { status: 400 })
  const occurrenceId = randomUUID()

  const result = await serializableTransaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { manageTokenHash: hashGuestReservationToken(token) },
      include: {
        tenant: { select: { id: true, name: true, siteSetting: { select: { name: true, email: true } } } },
        payments: { select: { status: true } },
      },
    })
    if (!reservation || !reservation.tenantId || !reservation.tenant) return { kind: 'not-found' as const }
    const items = await tx.reservationItem.findMany({
      where: { tenantId: reservation.tenantId, reservationId: reservation.id },
      include: { room: { select: { id: true, name: true, cancellationWindowHours: true } } },
    })
    if (!items.length) return { kind: 'no-items' as const }
    if (!itemIds.length) return { kind: 'empty-selection' as const }
    if (!['confirmed', 'pending'].includes(reservation.status)) return { kind: 'not-open' as const }
    const selected = items.filter((item) => itemIds.includes(item.id))
    if (selected.length !== itemIds.length) return { kind: 'item-not-found' as const }
    if (selected.some((item) => ['cancelled', 'expired', 'cancellation_requested'].includes(item.status))) return { kind: 'inactive' as const }

    const now = new Date()
    if (reservation.status === 'pending' && selected.some((item) => item.holdExpiresAt <= now)) return { kind: 'hold-expired' as const }
    const paidOnline = reservation.payments.some((payment) => payment.status === 'approved') || reservation.mercadoPagoStatus === 'approved'
    let directCount = 0
    let reviewCount = 0
    for (const item of selected) {
      const windowHours = item.room.cancellationWindowHours
      const deadline = windowHours == null ? null : new Date(item.checkIn.getTime() - windowHours * 3600000)
      const direct = deadline !== null && now <= deadline
      const nextStatus = direct ? 'cancelled' : 'cancellation_requested'
      await tx.reservationItem.updateMany({
        where: { id: item.id, reservationId: reservation.id, tenantId: reservation.tenantId, status: item.status },
        data: {
          status: nextStatus,
          ...(direct && paidOnline ? { refundStatus: 'manual_refund_required' } : {}),
          cancellationRequestedAt: now,
          cancellationWindowHoursAtRequest: windowHours,
        },
      })
      await tx.reservationItemCancellationEvent.create({
        data: {
          tenantId: reservation.tenantId,
          reservationId: reservation.id,
          reservationItemId: item.id,
          action: direct ? 'guest_cancelled_directly' : 'guest_requested_review',
          actorType: 'guest_link',
          policyWindowHours: windowHours,
        },
      })
      if (direct) directCount += 1
      else reviewCount += 1
    }

    const stillActive = await tx.reservationItem.count({ where: { tenantId: reservation.tenantId, reservationId: reservation.id, status: { notIn: ['cancelled', 'expired'] } } })
    if (!stillActive) await tx.reservation.updateMany({ where: { id: reservation.id, tenantId: reservation.tenantId }, data: { status: 'cancelled' } })

    if (directCount) await createNotification(reservation.tenantId, 'reservation.cancelled', {
      eventKey: `reservation.cancelled:${reservation.id}:${occurrenceId}`,
      title: 'Cancelamento direto solicitado pelo hóspede',
      message: `${directCount} unidade(s) foram canceladas pelo link do hóspede.${paidOnline ? ' Registre eventual reembolso após processá-lo manualmente.' : ''}`,
      href: '/admin/reservations',
      data: { reservationId: reservation.id, directCount, refundRequired: paidOnline },
    }, tx)
    if (reviewCount) await createNotification(reservation.tenantId, 'reservation.cancel_requested', {
      eventKey: `reservation.cancel_requested:${reservation.id}:${occurrenceId}`,
      title: 'Pedido de cancelamento para análise',
      message: `${reviewCount} unidade(s) seguem ocupadas até a análise da pousada.`,
      href: '/admin/reservations',
      data: { reservationId: reservation.id, reviewCount },
    }, tx)

    return {
      kind: 'updated' as const,
      reservationId: reservation.id,
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail,
      tenantName: reservation.tenant.siteSetting?.name || reservation.tenant.name,
      tenantEmail: reservation.tenant.siteSetting?.email || '',
      directCount,
      reviewCount,
      paidOnline,
    }
  }).catch((error: unknown) => {
    if (isSerializationConflict(error)) return null
    throw error
  })

  if (result === null) return noStoreJson({ error: 'A reserva mudou durante o processamento. Atualize e tente novamente.' }, { status: 409 })
  if (result.kind === 'not-found') return noStoreJson({ error: 'Reserva não encontrada.' }, { status: 404 })
  if (result.kind === 'no-items') return noStoreJson({ error: 'Esta reserva não possui unidades físicas registradas para cancelamento. Entre em contato com a pousada.' }, { status: 409 })
  if (result.kind === 'empty-selection') return noStoreJson({ error: 'Selecione ao menos uma unidade.' }, { status: 400 })
  if (result.kind === 'not-open') return noStoreJson({ error: 'Esta reserva está aguardando análise da pousada. Entre em contato com a equipe.' }, { status: 409 })
  if (result.kind === 'item-not-found') return noStoreJson({ error: 'Unidade não pertence a esta reserva.' }, { status: 404 })
  if (result.kind === 'inactive') return noStoreJson({ error: 'Uma unidade selecionada já foi cancelada ou tem pedido em análise.' }, { status: 409 })
  if (result.kind === 'hold-expired') return noStoreJson({ error: 'A retenção pendente terminou. Entre em contato com a pousada para esclarecer a situação.' }, { status: 409 })

  const messages = [
    result.directCount ? `${result.directCount} unidade(s) cancelada(s) dentro do prazo.` : '',
    result.reviewCount ? `${result.reviewCount} pedido(s) enviado(s) para análise; as unidades permanecem reservadas até a decisão da pousada.` : '',
    result.directCount && result.paidOnline ? 'Eventual reembolso será processado manualmente pela pousada.' : '',
  ].filter(Boolean)
  const message = messages.join(' ')
  await sendTransactionalEmail({
    to: result.guestEmail,
    fromName: result.tenantName,
    subject: 'Atualização do cancelamento da reserva',
    html: `<p>Olá, ${escapeEmailHtml(result.guestName)}.</p><p>${message}</p>`,
    text: `Olá, ${result.guestName}. ${message}`,
  })
  if (result.tenantEmail) await sendTransactionalEmail({
    to: result.tenantEmail,
    fromName: result.tenantName,
    subject: 'Pedido de cancelamento de reserva',
    html: `<p>${escapeEmailHtml(result.guestName)} solicitou o cancelamento de unidades. ${result.reviewCount ? `${result.reviewCount} unidade(s) aguardam sua análise e continuam ocupadas.` : ''} ${result.directCount && result.paidOnline ? 'Registre eventual reembolso manual após processá-lo.' : ''}</p>`,
    text: `${result.guestName} solicitou o cancelamento de unidades. ${result.reviewCount ? `${result.reviewCount} unidade(s) aguardam sua análise e continuam ocupadas.` : ''} ${result.directCount && result.paidOnline ? 'Registre eventual reembolso manual após processá-lo.' : ''}`,
  })
  return noStoreJson({ ok: true, directCount: result.directCount, reviewCount: result.reviewCount, message })
}
