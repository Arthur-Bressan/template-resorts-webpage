import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isMercadoPagoDevelopmentMockEnabled } from '@/lib/mercadopago'
import { getTenantFromHost } from '@/lib/tenant-context'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getTenantFromHost(request.headers.get('host'))
    if (!tenant) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const [rooms, connection] = await Promise.all([
      db.room.findMany({
        where: { tenantId: tenant.id, published: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          units: { where: { tenantId: tenant.id, isActive: true }, select: { id: true } },
        },
      }),
      db.mercadoPagoConnection.findUnique({
        where: { tenantId: tenant.id },
        select: { status: true },
      }),
    ])
    return NextResponse.json({
      rooms: rooms.map(({ units, ...room }) => ({
        id: room.id,
        name: room.name,
        slug: room.slug,
        price: room.price,
        capacity: room.capacity,
        size: room.size,
        bedType: room.bedType,
        description: room.description,
        activeUnitCount: units.length,
      })),
      checkoutEnabled: isMercadoPagoDevelopmentMockEnabled() || connection?.status === 'connected',
      checkoutMode: isMercadoPagoDevelopmentMockEnabled() ? 'development_mock' : 'mercado_pago',
    })
  } catch {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }
}
