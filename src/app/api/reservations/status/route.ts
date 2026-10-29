import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { blocksDates, validStatusToken } from '../_shared'

export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }
  const { success } = rateLimit(`reservation-status:${getClientIp(request)}`, 60, 60_000)
  if (!success) return NextResponse.json({ error: 'Aguarde um momento antes de atualizar.' }, { status: 429, headers })
  const id = request.nextUrl.searchParams.get('reservationId') || ''
  const token = request.nextUrl.searchParams.get('token') || ''
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !validStatusToken(id, token)) {
    return NextResponse.json({ error: 'Link de consulta inválido. Entre em contato com a pousada para verificar a reserva.' }, { status: 403, headers })
  }
  try {
    const reservation = await db.reservation.findUnique({ where: { id },
      select: { status: true, notes: true, mercadoPagoStatus: true } })
    if (!reservation) return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404, headers })
    const status = reservation.status === 'confirmed' ? 'confirmed'
      : reservation.status === 'cancelled' ? 'cancelled'
      : reservation.status === 'payment_review' ? 'review'
      : !blocksDates(reservation) ? 'expired' : 'pending'
    // Only the status is public; never guest, stay, room, payment or price data.
    return NextResponse.json({ status }, { headers })
  } catch {
    return NextResponse.json({ error: 'Não foi possível consultar a reserva. Tente novamente.' }, { status: 503, headers })
  }
}
