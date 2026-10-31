import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireCompanyAdmin } from '@/lib/admin-auth'

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback
}

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? parsed : null
}

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'expired', 'manual_review']

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const { searchParams } = new URL(request.url)
    const page = positiveInteger(searchParams.get('page'), 1, 100000)
    const limit = positiveInteger(searchParams.get('limit'), 100, 200)
    const skip = (page - 1) * limit
    const status = searchParams.get('status')
    if (status && !VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })

    const from = parseDate(searchParams.get('from'))
    const to = parseDate(searchParams.get('to'))
    const validRange = from && to && to > from
    const where = {
      tenantId,
      room: { is: { tenantId } },
      ...(status ? { status } : {}),
      ...(validRange ? { checkIn: { lt: to! }, checkOut: { gt: from! } } : {}),
    }

    const [items, total, blocks] = await Promise.all([
      db.reservation.findMany({
        where,
        orderBy: [{ checkIn: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          room: { select: { id: true, name: true, slug: true, cancellationWindowHours: true } },
          items: {
            where: { tenantId },
            orderBy: [{ room: { name: 'asc' } }, { roomUnit: { identifier: 'asc' } }],
            include: {
              room: { select: { id: true, name: true, price: true, cancellationWindowHours: true } },
              roomUnit: { select: { id: true, identifier: true } },
              cancellationEvents: { orderBy: { createdAt: 'desc' } },
            },
          },
          payments: { select: { id: true, status: true, amount: true, currencyId: true, approvedAt: true } },
        },
      }),
      db.reservation.count({ where }),
      validRange ? db.availabilityBlock.findMany({
        where: { tenantId, checkIn: { lt: to! }, checkOut: { gt: from! } },
        orderBy: [{ checkIn: 'asc' }],
        include: { roomUnit: { select: { id: true, identifier: true, room: { select: { id: true, name: true } } } } },
      }) : Promise.resolve([]),
    ])

    return NextResponse.json({ items, blocks, total, page, limit })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
