import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { hasConflict, lockRoom } from '../../reservations/_shared'

const ALLOWED_STATUSES = new Set(['pending', 'confirmed', 'cancelled', 'completed'])

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit
    const status = searchParams.get('status')

    const where = status ? { status } : undefined

    const [items, total] = await Promise.all([
      db.reservation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { room: { select: { id: true, name: true, slug: true } } },
      }),
      db.reservation.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit })
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
    const body = await request.json().catch(() => null)
    const id = typeof body?.id === 'string' ? body.id : ''
    const status = typeof body?.status === 'string' ? body.status : ''
    const notes = body?.notes
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    if (status && !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Status de reserva inválido' }, { status: 400 })
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 2000)) {
      return NextResponse.json({ error: 'Observação inválida' }, { status: 400 })
    }

    const current = await db.reservation.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })

    const result = await db.$transaction(async (tx) => {
      await lockRoom(tx, current.roomId)
      const reservation = await tx.reservation.findUnique({ where: { id } })
      if (!reservation) return { error: 'Reserva não encontrada', status: 404 as const }

      if (status === 'confirmed') {
        const room = await tx.room.findUnique({ where: { id: reservation.roomId }, select: { capacity: true } })
        if (!room || reservation.guests > room.capacity) {
          return { error: 'A quantidade de hóspedes excede a capacidade atual do quarto.', status: 409 as const }
        }
        if (await hasConflict(tx, reservation.roomId, reservation.checkIn, reservation.checkOut, reservation.id)) {
          return { error: 'Há outra reserva ocupando estas datas. Resolva a disponibilidade antes de confirmar.', status: 409 as const }
        }
      }

      const data: { status?: string; notes?: string } = {}
      if (status) data.status = status
      if (notes !== undefined) {
        // Keep checkout expiry metadata intact; overwriting it could turn an
        // expiring hold into a legacy reservation that blocks dates forever.
        let checkout: unknown
        try { checkout = JSON.parse(reservation.notes)?.checkout } catch { /* Existing note is plain text. */ }
        data.notes = checkout ? JSON.stringify({ checkout, adminNote: notes }) : notes
      }
      const item = await tx.reservation.update({ where: { id }, data })
      return { item }
    })

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.item)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
