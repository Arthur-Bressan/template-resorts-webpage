import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { DAY_MS, HOLD_MS, ReservationError, hasConflict, lockRoom, parseDate, statusToken, todayAtProperty } from '../_shared'

export async function POST(request: NextRequest) {
  try {
    const { success } = rateLimit(`reservation:${getClientIp(request)}`, 3, 60_000)
    if (!success) return NextResponse.json({ error: 'Muitas tentativas. Aguarde um minuto e tente novamente.' }, { status: 429 })
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ReservationError('Dados da reserva inválidos.')
    if (body.website) throw new ReservationError('Não foi possível enviar a reserva.')
    const { roomId, checkIn, checkOut, guests, consent } = body
    const guestName = typeof body.guestName === 'string' ? body.guestName.trim() : ''
    const guestEmail = typeof body.guestEmail === 'string' ? body.guestEmail.trim().toLowerCase() : ''
    const guestPhone = typeof body.guestPhone === 'string' ? body.guestPhone.trim() : ''
    if (typeof roomId !== 'string' || !roomId || roomId.length > 100 || !guestName || guestName.length > 150 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail) || guestEmail.length > 254 ||
        !/^[+\d\s().-]{8,30}$/.test(guestPhone) || guestPhone.replace(/\D/g, '').length < 8) {
      throw new ReservationError('Confira o quarto, nome, e-mail e telefone informados.')
    }
    if (consent !== true) throw new ReservationError('Você precisa aceitar a Política de Privacidade.')
    if (!Number.isInteger(guests) || guests < 1) throw new ReservationError('Número de hóspedes inválido.')
    const checkInDate = parseDate(checkIn)
    const checkOutDate = parseDate(checkOut)
    if (!checkInDate || !checkOutDate) throw new ReservationError('Informe datas válidas.')
    if (checkIn < todayAtProperty()) throw new ReservationError('O check-in não pode ser no passado.')
    if (checkOutDate <= checkInDate) throw new ReservationError('O check-out deve ser pelo menos um dia após o check-in.')
    const nights = (checkOutDate.getTime() - checkInDate.getTime()) / DAY_MS
    if (nights > 365) throw new ReservationError('Para estadias acima de 365 noites, entre em contato com a pousada.')

    // Never create a mock or pending reservation without payment credentials.
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
    if (!accessToken) throw new ReservationError('O pagamento online está temporariamente indisponível. Tente novamente mais tarde ou entre em contato.', 503)
    let baseUrl: URL
    try { baseUrl = new URL(process.env.NEXT_PUBLIC_BASE_URL || '') }
    catch { throw new ReservationError('O pagamento online está temporariamente indisponível.', 503) }
    if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password ||
        (process.env.NODE_ENV === 'production' && baseUrl.protocol !== 'https:')) {
      throw new ReservationError('O pagamento online está temporariamente indisponível.', 503)
    }
    const expiresAt = new Date(Date.now() + HOLD_MS)
    const { reservation, room } = await db.$transaction(async (tx) => {
      await lockRoom(tx, roomId)
      const room = await tx.room.findUnique({ where: { id: roomId } })
      if (!room?.published || room.capacity < 1 || !Number.isFinite(room.price) || Math.round(room.price * 100) <= 0) {
        throw new ReservationError('Quarto não encontrado ou indisponível.', 409)
      }
      if (guests > room.capacity) throw new ReservationError(`Este quarto acomoda até ${room.capacity} hóspedes.`)
      if (await hasConflict(tx, roomId, checkInDate, checkOutDate)) {
        throw new ReservationError('Este quarto já está reservado ou em pagamento nessas datas. Escolha outro período ou acomodação.', 409)
      }
      const reservation = await tx.reservation.create({ data: {
        guestName, guestEmail, guestPhone, roomId, checkIn: checkInDate, checkOut: checkOutDate,
        guests, totalPrice: Math.round(room.price * 100) * nights / 100,
        status: 'pending', mercadoPagoStatus: 'checkout_creating',
        notes: JSON.stringify({ checkout: { expiresAt: expiresAt.toISOString() } }),
      } })
      return { reservation, room }
    })

    const token = statusToken(reservation.id)
    const returnUrl = (path: string) => {
      const url = new URL(path, baseUrl.origin)
      url.searchParams.set('reservationId', reservation.id)
      url.searchParams.set('token', token)
      return url.toString()
    }
    try {
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Idempotency-Key': reservation.id },
        body: JSON.stringify({
          external_reference: reservation.id, metadata: { reservation_id: reservation.id },
          items: [{ title: `Reserva: ${room.name}`, quantity: nights, unit_price: Math.round(room.price * 100) / 100, currency_id: 'BRL' }],
          payer: { name: guestName, email: guestEmail, phone: { number: guestPhone } },
          back_urls: { success: returnUrl('/reservas/sucesso'), failure: returnUrl('/reservas/falha'), pending: returnUrl('/reservas/pendente') },
          notification_url: new URL('/api/reservations/webhook', baseUrl.origin).toString(),
          auto_return: 'approved', expires: true,
          expiration_date_from: new Date().toISOString(), expiration_date_to: expiresAt.toISOString(),
        }),
      })
      if (!response.ok) {
        // A definite rejection cannot produce a payable checkout.
        if (response.status >= 400 && response.status < 500) {
          await db.reservation.updateMany({ where: { id: reservation.id, mercadoPagoStatus: 'checkout_creating' }, data: { status: 'cancelled', mercadoPagoStatus: 'checkout_failed' } })
        }
        throw new Error(`Preference response ${response.status}`)
      }
      const preference = await response.json()
      const checkoutUrl = new URL(preference.init_point)
      if (typeof preference.id !== 'string' || checkoutUrl.protocol !== 'https:' ||
          !/(^|\.)mercadopago\.com(?:\.br)?$/.test(checkoutUrl.hostname)) throw new Error('Invalid checkout response')
      await db.reservation.updateMany({ where: { id: reservation.id, mercadoPagoStatus: 'checkout_creating' }, data: {
        mercadoPagoPaymentId: preference.id, mercadoPagoStatus: 'checkout_created',
        notes: JSON.stringify({ checkout: { expiresAt: expiresAt.toISOString(), preferenceId: preference.id } }),
      } })
      return NextResponse.json({ init_point: checkoutUrl.toString(), reservationId: reservation.id, statusToken: token })
    } catch {
      // A timeout may have created a real preference. Retain its hold until expiry.
      await db.reservation.updateMany({ where: { id: reservation.id, mercadoPagoStatus: 'checkout_creating' }, data: { mercadoPagoStatus: 'checkout_uncertain' } })
      return NextResponse.json({ error: 'Não foi possível abrir o pagamento. Por segurança, o quarto pode ficar reservado por até 30 minutos. Consulte o andamento antes de tentar novamente.',
        statusUrl: returnUrl('/reservas/pendente') }, { status: 503 })
    }
  } catch (error) {
    if (error instanceof ReservationError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Reservation checkout unavailable')
    return NextResponse.json({ error: 'Não foi possível consultar a disponibilidade. Aguarde um momento e tente novamente.' }, { status: 503 })
  }
}
