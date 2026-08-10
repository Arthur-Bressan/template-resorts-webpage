import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const room = await db.room.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { orderBy: { sortOrder: 'asc' } },
      },
    })
    if (!room) {
      return NextResponse.json({ error: 'Quarto não encontrado' }, { status: 404 })
    }
    return NextResponse.json(room)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { images, amenities, ...roomData } = body

    const room = await db.$transaction(async (tx) => {
      await tx.room.update({ where: { id }, data: roomData })

      await tx.roomImage.deleteMany({ where: { roomId: id } })
      if (images && images.length > 0) {
        await tx.roomImage.createMany({
          data: images.map((img: { src: string; alt: string; sortOrder?: number }, i: number) => ({
            src: img.src,
            alt: img.alt || '',
            sortOrder: img.sortOrder ?? i,
            roomId: id,
          })),
        })
      }

      await tx.roomAmenity.deleteMany({ where: { roomId: id } })
      if (amenities && amenities.length > 0) {
        await tx.roomAmenity.createMany({
          data: amenities.map((a: { name: string; icon: string; sortOrder?: number }, i: number) => ({
            name: a.name,
            icon: a.icon || 'Sparkles',
            sortOrder: a.sortOrder ?? i,
            roomId: id,
          })),
        })
      }

      return tx.room.findUnique({
        where: { id },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          amenities: { orderBy: { sortOrder: 'asc' } },
        },
      })
    })

    return NextResponse.json(room)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    await db.room.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
