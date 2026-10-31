import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  findActiveReservationItemConflict,
  findLegacyReservationConflicts,
  parseStayDates,
  AvailabilityError,
} from '@/lib/availability'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const { id: roomUnitId } = await params
    const unit = await db.roomUnit.findFirst({ where: { id: roomUnitId, tenantId }, select: { id: true } })
    if (!unit) return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
    const blocks = await db.availabilityBlock.findMany({
      where: { tenantId, roomUnitId },
      orderBy: { checkIn: 'asc' },
    })
    return NextResponse.json(blocks)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id: roomUnitId } = await params
    const body = await request.json()
    const dates = parseStayDates({ checkIn: body.checkIn, checkOut: body.checkOut })
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (!reason || reason.length > 500) {
      return NextResponse.json({ error: 'Informe um motivo de até 500 caracteres.' }, { status: 400 })
    }

    const result = await serializableTransaction(async (tx) => {
      const unit = await tx.roomUnit.findFirst({ where: { id: roomUnitId, tenantId }, select: { id: true, roomId: true } })
      if (!unit) return { kind: 'not-found' as const }
      const conflict = await findActiveReservationItemConflict(
        { tenantId, roomUnitId, dates },
        tx,
      )
      if (conflict) return { kind: 'conflict' as const }
      const legacyConflicts = await findLegacyReservationConflicts(
        { tenantId, categoryId: unit.roomId, dates },
        tx,
      )
      if (legacyConflicts.length > 0) return { kind: 'legacy-conflict' as const }
      const block = await tx.availabilityBlock.create({
        data: { tenantId, roomUnitId, checkIn: dates.checkIn, checkOut: dates.checkOut, reason },
      })
      return { kind: 'created' as const, block }
    })
    if (result.kind === 'not-found') return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
    if (result.kind === 'conflict') return NextResponse.json({ error: 'A unidade já possui uma reserva ativa nesse período.' }, { status: 409 })
    if (result.kind === 'legacy-conflict') return NextResponse.json({ error: 'A categoria possui uma reserva legada sem unidade atribuída nesse período.' }, { status: 409 })
    return NextResponse.json(result.block, { status: 201 })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) {
      return NextResponse.json({ error: 'A disponibilidade mudou durante a criação do bloqueio. Atualize e tente novamente.' }, { status: 409 })
    }
    if (error instanceof AvailabilityError && error.code === 'INVALID_INPUT') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
