import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkoutNotes, hasConflict, lockRoom } from '../_shared'

function validSignature(request: NextRequest, paymentId: string, secret: string) {
  const signature = request.headers.get('x-signature') || ''
  const parts = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=')))
  const requestId = request.headers.get('x-request-id')
  const dataId = request.nextUrl.searchParams.get('data.id')
  if (!requestId || !dataId || dataId !== paymentId || !/^\d+$/.test(parts.ts || '') || !/^[a-f0-9]{64}$/i.test(parts.v1 || '')) return false
  const expected = createHmac('sha256', secret)
    .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`).digest('hex')
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(parts.v1, 'hex'))
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
    if (!accessToken) return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 })
    const body = await request.json().catch(() => null)
    if (body?.type && body.type !== 'payment') return NextResponse.json({ ok: true })
    const paymentId = String(body?.data?.id || request.nextUrl.searchParams.get('data.id') || '')
    if (!/^\d{1,30}$/.test(paymentId)) return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
    const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
    if (webhookSecret && !validSignature(request, paymentId, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    // Never trust the callback payload or status query: retrieve the authenticated
    // account's payment directly from the provider, even when signature is enabled.
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return NextResponse.json({ error: 'Payment lookup unavailable' }, { status: 502 })
    const payment = await response.json()
    const reference = payment.external_reference
    if (String(payment.id) !== paymentId || typeof reference !== 'string' || reference.length > 100) {
      return NextResponse.json({ error: 'Invalid payment reference' }, { status: 400 })
    }
    const existing = await db.reservation.findUnique({ where: { id: reference } })
    if (!existing) return NextResponse.json({ ok: true })
    if (payment.currency_id !== 'BRL' || typeof payment.transaction_amount !== 'number' ||
        Math.round(payment.transaction_amount * 100) !== Math.round(existing.totalPrice * 100) ||
        (payment.metadata?.reservation_id && payment.metadata.reservation_id !== existing.id)) {
      console.error('Reservation payment validation failed')
      return NextResponse.json({ error: 'Payment does not match reservation' }, { status: 400 })
    }
    const checkout = checkoutNotes(existing.notes)
    // For new checkouts, also validate the preference through the merchant order
    // whenever the payment exposes an order ID. Legacy records remain supported.
    if (checkout?.checkout.preferenceId && payment.order?.id && payment.order?.type === 'mercadopago') {
      const orderResponse = await fetch(`https://api.mercadopago.com/merchant_orders/${encodeURIComponent(String(payment.order.id))}`, {
        headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(10_000),
      })
      if (!orderResponse.ok) return NextResponse.json({ error: 'Order lookup unavailable' }, { status: 502 })
      const order = await orderResponse.json()
      if (order.preference_id !== checkout.checkout.preferenceId) return NextResponse.json({ error: 'Payment preference mismatch' }, { status: 400 })
    }
    const mpStatus = payment.status
    if (!['approved', 'pending', 'in_process', 'authorized', 'rejected', 'cancelled', 'refunded', 'charged_back'].includes(mpStatus)) {
      return NextResponse.json({ ok: true })
    }
    await db.$transaction(async (tx) => {
      await lockRoom(tx, existing.roomId)
      const reservation = await tx.reservation.findUnique({ where: { id: reference } })
      if (!reservation) return
      const reversal = ['refunded', 'charged_back'].includes(mpStatus)
      // An old rejection/pending or another payment must not undo approval.
      if (reservation.status === 'confirmed' && (!reversal || reservation.mercadoPagoPaymentId !== paymentId)) return
      // Repeated approved notifications must not revive a refunded payment.
      if (['refunded', 'charged_back'].includes(reservation.mercadoPagoStatus) &&
          reservation.mercadoPagoPaymentId === paymentId && !reversal) return
      if (reservation.status === 'payment_review' && reservation.mercadoPagoStatus === 'approved' &&
          (mpStatus !== 'approved' && (!reversal || reservation.mercadoPagoPaymentId !== paymentId))) return
      let status = ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(mpStatus) ? 'cancelled' : 'pending'
      if (mpStatus === 'approved') status = 'confirmed'
      if (['confirmed', 'pending'].includes(status) &&
          await hasConflict(tx, reservation.roomId, reservation.checkIn, reservation.checkOut, reservation.id)) {
        // An approval after hold expiration is never allowed to double-book.
        // Staff must reconcile/refund this real payment; it is not confirmed.
        status = 'payment_review'
      }
      if (reservation.status === status && reservation.mercadoPagoStatus === mpStatus && reservation.mercadoPagoPaymentId === paymentId) return
      await tx.reservation.update({ where: { id: reference }, data: {
        status, mercadoPagoPaymentId: paymentId, mercadoPagoStatus: mpStatus,
      } })
    })
    return NextResponse.json({ ok: true })
  } catch {
    console.error('Reservation webhook processing unavailable')
    // Non-2xx tells the provider to retry; never silently lose a confirmation.
    return NextResponse.json({ error: 'Payment update unavailable' }, { status: 503 })
  }
}
