import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { parseRoomUnitDrafts, RoomUnitInputError, saveRoomUnitDrafts } from '@/lib/room-units'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const body = await request.json()
    const drafts = parseRoomUnitDrafts([{ id, identifier: body.identifier, isActive: body.isActive }])
    const unit = await serializableTransaction(async (tx) => {
      const existing = await tx.roomUnit.findFirst({
        where: { id, tenantId },
        select: { roomId: true },
      })
      if (!existing) return null
      await saveRoomUnitDrafts(tx, { tenantId, roomId: existing.roomId, drafts })
      return tx.roomUnit.findFirst({ where: { id, tenantId } })
    })
    if (!unit) return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
    return NextResponse.json(unit)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) {
      return NextResponse.json({ error: 'A disponibilidade mudou durante a alteração da unidade. Atualize e tente novamente.' }, { status: 409 })
    }
    if (error instanceof RoomUnitInputError) {
      const status = error.code === 'UNIT_NOT_FOUND' ? 404 : error.code === 'UNIT_HAS_RESERVATION' ? 409 : 400
      return NextResponse.json({ error: error.message }, { status })
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este identificador já está em uso nesta categoria.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const result = await serializableTransaction(async (tx) => {
      const unit = await tx.roomUnit.findFirst({ where: { id, tenantId }, select: { id: true } })
      if (!unit) return 'not-found'
      const [reservationItemCount, blockCount] = await Promise.all([
        tx.reservationItem.count({ where: { tenantId, roomUnitId: id } }),
        tx.availabilityBlock.count({ where: { tenantId, roomUnitId: id } }),
      ])
      if (reservationItemCount || blockCount) return 'in-use'
      await tx.roomUnit.deleteMany({ where: { id, tenantId } })
      return 'deleted'
    })
    if (result === 'not-found') return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
    if (result === 'in-use') return NextResponse.json({ error: 'Unidades com reservas ou bloqueios não podem ser excluídas.' }, { status: 409 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) {
      return NextResponse.json({ error: 'A disponibilidade mudou durante a exclusão da unidade. Atualize e tente novamente.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
