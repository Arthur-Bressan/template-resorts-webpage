import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const publishedOnly = searchParams.get('published') === 'true'

    const where = publishedOnly ? { published: true } : undefined

    const rooms = await db.room.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { orderBy: { sortOrder: 'asc' } },
      },
    })
    return NextResponse.json(rooms)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { images, amenities, ...roomData } = body

    const room = await db.$transaction(async (tx) => {
      const created = await tx.room.create({ data: roomData })

      if (images && images.length > 0) {
        await tx.roomImage.createMany({
          data: images.map((img: { src: string; alt: string; sortOrder?: number }, i: number) => ({
            src: img.src,
            alt: img.alt || '',
            sortOrder: img.sortOrder ?? i,
            roomId: created.id,
          })),
        })
      }

      if (amenities && amenities.length > 0) {
        await tx.roomAmenity.createMany({
          data: amenities.map((a: { name: string; icon: string; sortOrder?: number }, i: number) => ({
            name: a.name,
            icon: a.icon || 'Sparkles',
            sortOrder: a.sortOrder ?? i,
            roomId: created.id,
          })),
        })
      }

      return tx.room.findUnique({
        where: { id: created.id },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          amenities: { orderBy: { sortOrder: 'asc' } },
        },
      })
    })

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
