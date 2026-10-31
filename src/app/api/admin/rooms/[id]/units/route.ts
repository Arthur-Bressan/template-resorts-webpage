import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { parseRoomUnitDrafts, RoomUnitInputError, saveRoomUnitDrafts } from '@/lib/room-units'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const { id: roomId } = await params
    const room = await db.room.findFirst({ where: { id: roomId, tenantId }, select: { id: true } })
    if (!room) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })

    const units = await db.roomUnit.findMany({
      where: { tenantId, roomId },
      orderBy: [{ identifier: 'asc' }, { id: 'asc' }],
      include: { blocks: { where: { tenantId }, orderBy: { checkIn: 'asc' } } },
    })
    return NextResponse.json(units)
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
    const { id: roomId } = await params
    const body = await request.json()
    const drafts = parseRoomUnitDrafts([{ identifier: body.identifier, isActive: body.isActive }])
    const result = await serializableTransaction(async (tx) => {
      const room = await tx.room.findFirst({ where: { id: roomId, tenantId }, select: { id: true } })
      if (!room) return null
      await saveRoomUnitDrafts(tx, { tenantId, roomId, drafts })
      return tx.roomUnit.findMany({
        where: { tenantId, roomId },
        orderBy: [{ identifier: 'asc' }, { id: 'asc' }],
      })
    })
    if (!result) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) {
      return NextResponse.json({ error: 'A disponibilidade mudou durante a atualização das unidades. Atualize e tente novamente.' }, { status: 409 })
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id: roomId } = await params
    const body = await request.json()
    const drafts = parseRoomUnitDrafts(body.units)
    const result = await serializableTransaction(async (tx) => {
      const room = await tx.room.findFirst({ where: { id: roomId, tenantId }, select: { id: true } })
      if (!room) return null
      return saveRoomUnitDrafts(tx, { tenantId, roomId, drafts })
    })
    if (!result) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    return NextResponse.json(result)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) {
      return NextResponse.json({ error: 'A disponibilidade mudou durante a atualização das unidades. Atualize e tente novamente.' }, { status: 409 })
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
