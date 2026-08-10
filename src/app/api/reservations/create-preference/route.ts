import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

async function createMercadoPagoPreference(data: Record<string, unknown>) {
  const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN
  if (!MP_ACCESS_TOKEN) return null

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Mercado Pago API error ${response.status}: ${text}`)
  }
  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    // 1. Honeypot check — silent 200 if filled
    const body = await request.json()
    if (body.website) {
      return NextResponse.json({ ok: true })
    }

    // 2. Rate limit: 3 req/min per IP
    const ip = getClientIp(request)
    const { success } = rateLimit(ip, 3, 60_000)
    if (!success) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde um momento e tente novamente.' },
        { status: 429 }
      )
    }

    // 3. Validate inputs
    const { roomId, checkIn, checkOut, guestName, guestEmail, guestPhone, guests, consent } = body

    if (!roomId || !checkIn || !checkOut || !guestName || !guestEmail || !guestPhone || !guests) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }

    if (!consent) {
      return NextResponse.json({ error: 'Você precisa aceitar a Política de Privacidade.' }, { status: 400 })
    }

    if (guests < 1 || guests > 10) {
      return NextResponse.json({ error: 'Número de hóspedes inválido.' }, { status: 400 })
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ error: 'Datas inválidas.' }, { status: 400 })
    }

    if (checkInDate < today) {
      return NextResponse.json({ error: 'A data de check-in não pode ser no passado.' }, { status: 400 })
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json({ error: 'O check-out deve ser após o check-in.' }, { status: 400 })
    }

    // 4. Check room exists and is published
    const room = await db.room.findUnique({ where: { id: roomId } })
    if (!room || !room.published) {
      return NextResponse.json({ error: 'Quarto não encontrado ou indisponível.' }, { status: 400 })
    }

    // 5. Calculate total
    const diffMs = checkOutDate.getTime() - checkInDate.getTime()
    const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (nights < 1) {
      return NextResponse.json({ error: 'A reserva deve ter pelo menos 1 noite.' }, { status: 400 })
    }
    const totalPrice = room.price * nights

    // 6. Create pending reservation
    const reservation = await db.reservation.create({
      data: {
        guestName,
        guestEmail,
        guestPhone,
        roomId: room.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: Number(guests),
        totalPrice,
        status: 'pending',
      },
    })

    // 7. Create Mercado Pago preference (or mock)
    const preferenceData = {
      external_reference: reservation.id,
      items: [{
        title: `Reserva: ${room.name}`,
        quantity: nights,
        unit_price: room.price,
        currency_id: 'BRL',
      }],
      payer: {
        name: guestName,
        email: guestEmail,
        phone: { number: guestPhone },
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/reservas/sucesso`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/reservas/falha`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/reservas/pendente`,
      },
      auto_return: 'approved',
    }

    const mpResult = await createMercadoPagoPreference(preferenceData)

    if (mpResult) {
      // Real Mercado Pago — update reservation with preference ID
      await db.reservation.update({
        where: { id: reservation.id },
        data: { mercadoPagoPaymentId: mpResult.id },
      })
      return NextResponse.json({
        init_point: mpResult.init_point,
        sandbox_init_point: mpResult.sandbox_init_point,
        reservationId: reservation.id,
      })
    }

    // Mock mode (no MP token)
    await db.reservation.update({
      where: { id: reservation.id },
      data: { mercadoPagoPaymentId: `mock_${reservation.id}` },
    })

    return NextResponse.json({
      init_point: '/reservas/pendente?reservationId=' + reservation.id,
      sandbox_init_point: '/reservas/pendente?reservationId=' + reservation.id,
      reservationId: reservation.id,
      mock: true,
    })
  } catch (error) {
    console.error('Create preference error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar sua reserva. Tente novamente.' },
      { status: 500 }
    )
  }
}
