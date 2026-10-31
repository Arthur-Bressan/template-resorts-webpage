import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { parseRoomUnitDrafts, RoomUnitInputError, saveRoomUnitDrafts } from '@/lib/room-units'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const { id } = await params
    const room = await db.room.findFirst({
      where: { id, tenantId },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { orderBy: { sortOrder: 'asc' } },
        units: { where: { tenantId }, orderBy: [{ identifier: 'asc' }, { id: 'asc' }] },
      },
    })
    if (!room) {
      return NextResponse.json({ error: 'Quarto não encontrado' }, { status: 404 })
    }
    return NextResponse.json(room)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { admin, tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const body = await request.json()
    const { images, amenities } = body
    const cancellationWindowHours = body.cancellationWindowHours === undefined || body.cancellationWindowHours === null || body.cancellationWindowHours === ''
      ? null
      : body.cancellationWindowHours
    if (cancellationWindowHours !== null && (!Number.isSafeInteger(cancellationWindowHours) || cancellationWindowHours < 0 || cancellationWindowHours > 720)) {
      return NextResponse.json({ error: 'O prazo deve ser um nÃºmero inteiro entre 0 e 720 horas.' }, { status: 400 })
    }
    const unitDrafts = body.units === undefined ? undefined : parseRoomUnitDrafts(body.units)
    const roomData = {
      name: body.name,
      slug: body.slug,
      price: body.price,
      capacity: body.capacity,
      size: body.size,
      cancellationWindowHours,
      bedType: body.bedType,
      description: body.description,
      descriptionLong: body.descriptionLong,
      policy: body.policy,
      sortOrder: body.sortOrder,
      published: body.published,
    }

    const existingRoom = await db.room.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!existingRoom) return NextResponse.json({ error: 'Quarto não encontrado' }, { status: 404 })

    if (typeof roomData.slug === 'string') {
      const collision = await db.room.findFirst({
        where: { tenantId, slug: roomData.slug, id: { not: id } },
        select: { id: true },
      })
      if (collision) {
        return NextResponse.json({ error: 'Este slug já está em uso nesta empresa' }, { status: 409 })
      }
    }

    const room = await serializableTransaction(async (tx) => {
      const ownedRoom = await tx.room.findFirst({ where: { id, tenantId }, select: { id: true, cancellationWindowHours: true } })
      if (!ownedRoom) return null
      const updated = await tx.room.updateMany({ where: { id, tenantId }, data: roomData })
      if (!updated.count) return null
      if (ownedRoom.cancellationWindowHours !== cancellationWindowHours) {
        await tx.roomCancellationPolicyChange.create({
          data: {
            tenantId,
            roomId: id,
            previousWindowHours: ownedRoom.cancellationWindowHours,
            newWindowHours: cancellationWindowHours,
            changedByAdminId: admin.id,
          },
        })
      }

      if (Array.isArray(images)) {
        await tx.roomImage.deleteMany({ where: { roomId: id, room: { is: { tenantId } } } })
        if (images.length > 0) {
          await tx.roomImage.createMany({
            data: images.map((img: { src: string; alt: string; sortOrder?: number }, i: number) => ({
              src: img.src,
              alt: img.alt || '',
              sortOrder: img.sortOrder ?? i,
              roomId: id,
            })),
          })
        }
      }

      if (Array.isArray(amenities)) {
        await tx.roomAmenity.deleteMany({ where: { roomId: id, room: { is: { tenantId } } } })
        if (amenities.length > 0) {
          await tx.roomAmenity.createMany({
            data: amenities.map((a: { name: string; icon: string; sortOrder?: number }, i: number) => ({
              name: a.name,
              icon: a.icon || 'Sparkles',
              sortOrder: a.sortOrder ?? i,
              roomId: id,
            })),
          })
        }
      }

      if (unitDrafts) await saveRoomUnitDrafts(tx, { tenantId, roomId: id, drafts: unitDrafts })

      return tx.room.findFirst({
        where: { id, tenantId },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          amenities: { orderBy: { sortOrder: 'asc' } },
          units: { where: { tenantId }, orderBy: [{ identifier: 'asc' }, { id: 'asc' }] },
        },
      })
    })

    if (!room) return NextResponse.json({ error: 'Quarto não encontrado' }, { status: 404 })
    return NextResponse.json(room)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) {
      return NextResponse.json({ error: 'A disponibilidade mudou durante a atualização da categoria. Atualize e tente novamente.' }, { status: 409 })
    }
    if (error instanceof RoomUnitInputError) {
      const status = error.code === 'UNIT_NOT_FOUND' ? 404 : error.code === 'UNIT_HAS_RESERVATION' ? 409 : 400
      return NextResponse.json({ error: error.message }, { status })
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este slug já está em uso nesta empresa' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const result = await serializableTransaction(async (tx) => {
      const room = await tx.room.findFirst({ where: { id, tenantId }, select: { id: true } })
      if (!room) return 'not-found'
      const [reservationItemCount, blockCount] = await Promise.all([
        tx.reservationItem.count({ where: { tenantId, roomId: id } }),
        tx.availabilityBlock.count({ where: { tenantId, roomUnit: { is: { roomId: id, tenantId } } } }),
      ])
      if (reservationItemCount || blockCount) return 'in-use'
      await tx.roomUnit.deleteMany({ where: { tenantId, roomId: id } })
      await tx.room.deleteMany({ where: { id, tenantId } })
      return 'deleted'
    })
    if (result === 'not-found') return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    if (result === 'in-use') return NextResponse.json({ error: 'Remova reservas e bloqueios antes de excluir a categoria.' }, { status: 409 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isSerializationConflict(error)) {
      return NextResponse.json({ error: 'A disponibilidade mudou durante a exclusão da categoria. Atualize e tente novamente.' }, { status: 409 })
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003') {
      return NextResponse.json({ error: 'A categoria ainda possui registros vinculados e não pode ser excluída.' }, { status: 409 })
    }
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
