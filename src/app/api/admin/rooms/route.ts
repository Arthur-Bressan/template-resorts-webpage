import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { parseRoomUnitDrafts, RoomUnitInputError, saveRoomUnitDrafts } from '@/lib/room-units'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const { searchParams } = new URL(request.url)
    const publishedOnly = searchParams.get('published') === 'true'

    const where = { tenantId, ...(publishedOnly ? { published: true } : {}) }

    const rooms = await db.room.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { orderBy: { sortOrder: 'asc' } },
        units: { where: { tenantId }, orderBy: [{ identifier: 'asc' }, { id: 'asc' }] },
      },
    })
    return NextResponse.json(rooms)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const body = await request.json()
    const { images, amenities } = body
    const cancellationWindowHours = body.cancellationWindowHours === undefined || body.cancellationWindowHours === null || body.cancellationWindowHours === ''
      ? null
      : body.cancellationWindowHours
    if (cancellationWindowHours !== null && (!Number.isSafeInteger(cancellationWindowHours) || cancellationWindowHours < 0 || cancellationWindowHours > 720)) {
      return NextResponse.json({ error: 'O prazo deve ser um nÃºmero inteiro entre 0 e 720 horas.' }, { status: 400 })
    }
    const unitDrafts = body.units === undefined
      ? [{ identifier: '1', isActive: true }]
      : parseRoomUnitDrafts(body.units)
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

    const room = await serializableTransaction(async (tx) => {
      if (typeof roomData.slug === 'string') {
        const collision = await tx.room.findFirst({
          where: { tenantId, slug: roomData.slug },
          select: { id: true },
        })
        if (collision) throw new Error('Room slug already exists for this company')
      }
      const created = await tx.room.create({ data: { ...roomData, tenantId } })
      if (cancellationWindowHours !== null) {
        await tx.roomCancellationPolicyChange.create({
          data: {
            tenantId,
            roomId: created.id,
            previousWindowHours: null,
            newWindowHours: cancellationWindowHours,
            changedByAdminId: admin.id,
          },
        })
      }

      if (Array.isArray(images) && images.length > 0) {
        await tx.roomImage.createMany({
          data: images.map((img: { src: string; alt: string; sortOrder?: number }, i: number) => ({
            src: img.src,
            alt: img.alt || '',
            sortOrder: img.sortOrder ?? i,
            roomId: created.id,
          })),
        })
      }

      if (Array.isArray(amenities) && amenities.length > 0) {
        await tx.roomAmenity.createMany({
          data: amenities.map((a: { name: string; icon: string; sortOrder?: number }, i: number) => ({
            name: a.name,
            icon: a.icon || 'Sparkles',
            sortOrder: a.sortOrder ?? i,
            roomId: created.id,
          })),
        })
      }

      await saveRoomUnitDrafts(tx, { tenantId, roomId: created.id, drafts: unitDrafts })

      return tx.room.findFirst({
        where: { id: created.id, tenantId },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          amenities: { orderBy: { sortOrder: 'asc' } },
          units: { where: { tenantId }, orderBy: [{ identifier: 'asc' }, { id: 'asc' }] },
        },
      })
    })

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) {
      return NextResponse.json({ error: 'A disponibilidade mudou durante o cadastro da categoria. Atualize e tente novamente.' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'Room slug already exists for this company') {
      return NextResponse.json({ error: 'Este slug já está em uso nesta empresa' }, { status: 409 })
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
