import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdmin()
    const [amenities, distances, directions, sensory, stats] = await Promise.all([
      db.aboutAmenity.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.distance.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.direction.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.sensoryConfig.findUnique({ where: { id: 'main' } }),
      db.stat.findMany({ orderBy: { sortOrder: 'asc' } }),
    ])
    return NextResponse.json({
      amenities,
      distances,
      directions,
      sensory: sensory || { id: 'main', title: '', paragraphs: '[]' },
      stats,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { amenities, distances, directions, sensory, stats } = body

    await db.$transaction(async (tx) => {
      // Amenities: atomic replace
      await tx.aboutAmenity.deleteMany()
      if (amenities && amenities.length > 0) {
        await tx.aboutAmenity.createMany({ data: amenities })
      }

      // Distances: atomic replace
      await tx.distance.deleteMany()
      if (distances && distances.length > 0) {
        await tx.distance.createMany({ data: distances })
      }

      // Directions: atomic replace
      await tx.direction.deleteMany()
      if (directions && directions.length > 0) {
        await tx.direction.createMany({ data: directions })
      }

      // Sensory: upsert singleton
      if (sensory) {
        await tx.sensoryConfig.upsert({
          where: { id: 'main' },
          update: { title: sensory.title, paragraphs: sensory.paragraphs },
          create: { id: 'main', title: sensory.title, paragraphs: sensory.paragraphs },
        })
      }

      // Stats: atomic replace
      await tx.stat.deleteMany()
      if (stats && stats.length > 0) {
        await tx.stat.createMany({ data: stats })
      }
    })

    const result = await Promise.all([
      db.aboutAmenity.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.distance.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.direction.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.sensoryConfig.findUnique({ where: { id: 'main' } }),
      db.stat.findMany({ orderBy: { sortOrder: 'asc' } }),
    ])

    return NextResponse.json({
      amenities: result[0],
      distances: result[1],
      directions: result[2],
      sensory: result[3] || { id: 'main', title: '', paragraphs: '[]' },
      stats: result[4],
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
