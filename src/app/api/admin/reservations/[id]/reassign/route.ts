import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { findActiveReservationItemConflict, AvailabilityError } from '@/lib/availability'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { createNotification } from '@/lib/notifications'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const body = await request.json()
    const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : ''
    const roomUnitId = typeof body.roomUnitId === 'string' ? body.roomUnitId.trim() : ''
    if (!itemId || !roomUnitId) return NextResponse.json({ error: 'Reserva, item e unidade são obrigatórios.' }, { status: 400 })

    const result = await serializableTransaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id, tenantId, room: { is: { tenantId } }, status: { notIn: ['cancelled', 'expired', 'completed'] } },
        select: { id: true, status: true },
      })
      if (!reservation) return { kind: 'reservation-not-found' as const }
      const item = await tx.reservationItem.findFirst({ where: { id: itemId, reservationId: id, tenantId } })
      if (!item || ['cancelled', 'expired'].includes(item.status) && reservation.status !== 'manual_review') return { kind: 'item-not-found' as const }
      const unit = await tx.roomUnit.findFirst({ where: { id: roomUnitId, tenantId, roomId: item.roomId, isActive: true } })
      if (!unit) return { kind: 'unit-not-found' as const }

      const conflict = await findActiveReservationItemConflict({
        tenantId,
        roomUnitId,
        dates: { checkIn: item.checkIn, checkOut: item.checkOut },
        excludeReservationId: id,
      }, tx)
      if (conflict) return { kind: 'conflict' as const }
      const block = await tx.availabilityBlock.findFirst({
        where: { tenantId, roomUnitId, checkIn: { lt: item.checkOut }, checkOut: { gt: item.checkIn } },
        select: { id: true },
      })
      if (block) return { kind: 'blocked' as const }

      const updated = await tx.reservationItem.updateMany({
        where: { id: itemId, reservationId: id, tenantId, roomUnitId: item.roomUnitId },
        data: { roomUnitId },
      })
      if (!updated.count) return { kind: 'item-not-found' as const }
      await createNotification(tenantId, 'reservation.unit_reassigned', {
        eventKey: `reservation.unit_reassigned:${itemId}:${roomUnitId}:${randomUUID()}`,
        title: 'Unidade da reserva alterada',
        message: 'A equipe reatribuiu uma unidade física.',
        href: '/admin/reservations',
        data: { reservationId: id, reservationItemId: itemId, roomUnitId },
      }, tx)
      return { kind: 'updated' as const }
    })

    if (result.kind === 'reservation-not-found') return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
    if (result.kind === 'item-not-found') return NextResponse.json({ error: 'Item da reserva não encontrado.' }, { status: 404 })
    if (result.kind === 'unit-not-found') return NextResponse.json({ error: 'A unidade precisa estar ativa na mesma categoria.' }, { status: 400 })
    if (result.kind === 'conflict' || result.kind === 'blocked') return NextResponse.json({ error: 'A unidade escolhida não está disponível nesse período.' }, { status: 409 })
    const item = await db.reservationItem.findFirst({ where: { id: itemId, reservationId: id, tenantId }, include: { roomUnit: { select: { id: true, identifier: true } } } })
    return NextResponse.json(item)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) return NextResponse.json({ error: 'A disponibilidade mudou durante a reatribuição. Atualize a tela antes de tentar novamente.' }, { status: 409 })
    if (error instanceof AvailabilityError) return NextResponse.json({ error: error.message }, { status: 400 })
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Esta unidade já está atribuída nesta reserva.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Não foi possível reatribuir a unidade.' }, { status: 500 })
  }
}
