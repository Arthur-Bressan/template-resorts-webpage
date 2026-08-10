import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function fetchPaymentDetails(paymentId: string) {
  const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN
  if (!MP_ACCESS_TOKEN) return null

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}?access_token=${MP_ACCESS_TOKEN}`
  )
  if (!response.ok) return null
  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const paymentId = body?.data?.id

    if (!paymentId) {
      return NextResponse.json({ ok: true, message: 'No payment ID' })
    }

    const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN
    if (!MP_ACCESS_TOKEN) {
      // Mock mode — just acknowledge
      console.log(`[Mock Webhook] Payment ID: ${paymentId}`)
      return NextResponse.json({ ok: true })
    }

    // Fetch payment details from MP
    const payment = await fetchPaymentDetails(String(paymentId))
    if (!payment) {
      return NextResponse.json({ ok: true, message: 'Could not fetch payment' })
    }

    const externalReference = payment.external_reference
    const mpStatus = payment.status

    if (!externalReference) {
      return NextResponse.json({ ok: true, message: 'No external reference' })
    }

    // Map MP status to our status
    let newStatus: string
    switch (mpStatus) {
      case 'approved':
        newStatus = 'confirmed'
        break
      case 'rejected':
        newStatus = 'cancelled'
        break
      case 'pending':
        newStatus = 'pending'
        break
      case 'cancelled':
        newStatus = 'cancelled'
        break
      default:
        newStatus = 'pending'
    }

    // Update reservation
    await db.reservation.update({
      where: { id: externalReference },
      data: {
        status: newStatus,
        mercadoPagoPaymentId: String(paymentId),
        mercadoPagoStatus: mpStatus,
      },
    })

    console.log(`[Webhook] Reservation ${externalReference} updated: ${mpStatus} → ${newStatus}`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}
