import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const [amenities, distances, directions, sensory, stats] = await Promise.all([
      db.aboutAmenity.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
      db.distance.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
      db.direction.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
      db.sensoryConfig.findFirst({ where: { tenantId } }),
      db.stat.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
    ])
    return NextResponse.json({
      amenities,
      distances,
      directions,
      sensory: sensory ? { ...sensory, paragraphs: JSON.parse(sensory.paragraphs || '[]') } : { title: '', paragraphs: [] },
      stats,
    })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const body = await request.json()
    const { amenities, distances, directions, sensory, stats } = body

    await db.$transaction(async (tx) => {
      // Amenities: atomic replace
      await tx.aboutAmenity.deleteMany({ where: { tenantId } })
      if (Array.isArray(amenities) && amenities.length > 0) {
        await tx.aboutAmenity.createMany({ data: amenities.map((item: Record<string, unknown>, index: number) => ({
          icon: item.icon as string,
          label: item.label as string,
          desc: (item.desc as string) || '',
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
          tenantId,
        })) })
      }

      // Distances: atomic replace
      await tx.distance.deleteMany({ where: { tenantId } })
      if (Array.isArray(distances) && distances.length > 0) {
        await tx.distance.createMany({ data: distances.map((item: Record<string, unknown>, index: number) => ({
          place: item.place as string,
          distance: item.distance as string,
          time: item.time as string,
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
          tenantId,
        })) })
      }

      // Directions: atomic replace
      await tx.direction.deleteMany({ where: { tenantId } })
      if (Array.isArray(directions) && directions.length > 0) {
        await tx.direction.createMany({ data: directions.map((item: Record<string, unknown>, index: number) => ({
          city: item.city as string,
          route: item.route as string,
          type: (item.type as string) || 'carro',
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
          tenantId,
        })) })
      }

      // Sensory: upsert singleton
      if (sensory) {
        const current = await tx.sensoryConfig.findFirst({ where: { tenantId }, select: { id: true } })
        const sensoryData = {
          title: typeof sensory.title === 'string' ? sensory.title : '',
          paragraphs: JSON.stringify(Array.isArray(sensory.paragraphs) ? sensory.paragraphs : []),
        }
        if (current) {
          await tx.sensoryConfig.updateMany({ where: { id: current.id, tenantId }, data: sensoryData })
        } else {
          await tx.sensoryConfig.create({ data: { ...sensoryData, tenantId } })
        }
      }

      // Stats: atomic replace
      await tx.stat.deleteMany({ where: { tenantId } })
      if (Array.isArray(stats) && stats.length > 0) {
        await tx.stat.createMany({ data: stats.map((item: Record<string, unknown>, index: number) => ({
          value: Number(item.value) || 0,
          suffix: (item.suffix as string) || '',
          label: item.label as string,
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
          tenantId,
        })) })
      }
    })

    const result = await Promise.all([
      db.aboutAmenity.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
      db.distance.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
      db.direction.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
      db.sensoryConfig.findFirst({ where: { tenantId } }),
      db.stat.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
    ])

    return NextResponse.json({
      amenities: result[0],
      distances: result[1],
      directions: result[2],
      sensory: result[3] ? { ...result[3], paragraphs: JSON.parse(result[3].paragraphs || '[]') } : { title: '', paragraphs: [] },
      stats: result[4],
    })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
