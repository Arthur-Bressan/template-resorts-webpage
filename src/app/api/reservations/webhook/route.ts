import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { getMercadoPagoAccessToken, MercadoPagoTemporaryUnavailableError } from '@/lib/mercadopago'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

const KNOWN_PAYMENT_STATUSES = new Set([
  'pending', 'in_process', 'authorized', 'approved', 'rejected', 'cancelled',
  'refunded', 'charged_back',
])
const NON_FINAL_PAYMENT_STATUSES = new Set(['pending', 'in_process', 'authorized', 'rejected', 'cancelled'])

type MercadoPagoPayment = {
  id?: unknown
  status?: unknown
  external_reference?: unknown
  preference_id?: unknown
  collector_id?: unknown
  application_id?: unknown
  transaction_amount?: unknown
  currency_id?: unknown
}

function validateWebhookSignature(request: NextRequest, dataId: string) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
  const signature = request.headers.get('x-signature')
  const requestId = request.headers.get('x-request-id')
  if (!secret || !signature || !requestId) return false

  const parts = new Map<string, string>()
  for (const part of signature.split(',')) {
    const separator = part.indexOf('=')
    if (separator >= 0) {
      parts.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim())
    }
  }
  const timestamp = parts.get('ts')
  const receivedHash = parts.get('v1')
  if (!timestamp || !/^\d+$/.test(timestamp) || !receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
    return false
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`
  const expectedHash = createHmac('sha256', secret).update(manifest).digest()
  const suppliedHash = Buffer.from(receivedHash, 'hex')
  return suppliedHash.length === expectedHash.length && timingSafeEqual(suppliedHash, expectedHash)
}

function cents(value: number) {
  return Math.round((value + Number.EPSILON) * 100)
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character)
}

function hasPrismaCode(error: unknown, code: string) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

export async function POST(request: NextRequest) {
  const dataId = request.nextUrl.searchParams.get('data.id') || ''
  if (!dataId || !/^\d+$/.test(dataId)) {
    return NextResponse.json({ error: 'Notificação inválida.' }, { status: 400 })
  }
  if (!process.env.MERCADO_PAGO_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 })
  }
  if (!validateWebhookSignature(request, dataId)) {
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    const parsed = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Notificação inválida.' }, { status: 400 })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Notificação inválida.' }, { status: 400 })
  }

  const credentialsClientId = process.env.MERCADO_PAGO_CLIENT_ID?.trim()
  if (!credentialsClientId) return NextResponse.json({ error: 'Integração Mercado Pago não configurada.' }, { status: 503 })
  if (String(body.application_id || '') !== credentialsClientId) return NextResponse.json({ ok: true })

  const sellerId = typeof body.user_id === 'string' || typeof body.user_id === 'number'
    ? String(body.user_id)
    : ''
  if (!/^\d+$/.test(sellerId)) return NextResponse.json({ ok: true })

  if (body.type === 'mp-connect') {
    if (body.action === 'application.deauthorized') {
      await db.mercadoPagoConnection.updateMany({
        where: { mpUserId: sellerId, status: 'connected' },
        data: { status: 'disconnected' },
      })
    }
    return NextResponse.json({ ok: true })
  }
  if (body.type !== 'payment') return NextResponse.json({ ok: true })

  const connection = await db.mercadoPagoConnection.findUnique({
    where: { mpUserId: sellerId },
    select: { tenantId: true, mpUserId: true, status: true, tenant: { select: { name: true } } },
  })
  if (!connection) return NextResponse.json({ ok: true })
  if (connection.status !== 'connected') {
    return NextResponse.json({ error: 'Conta Mercado Pago desconectada.' }, { status: 503 })
  }

  let mpAccount: { accessToken: string; mpUserId: string } | null
  try {
    mpAccount = await getMercadoPagoAccessToken(connection.tenantId)
  } catch (error) {
    if (error instanceof MercadoPagoTemporaryUnavailableError) {
      return NextResponse.json(
        { error: 'Conta Mercado Pago temporariamente indisponível para validação.' },
        { status: 503 },
      )
    }
    throw error
  }
  if (!mpAccount) return NextResponse.json({ error: 'Conta Mercado Pago indisponível para validação.' }, { status: 503 })
  if (mpAccount.mpUserId !== sellerId) return NextResponse.json({ ok: true })

  let paymentResponse: Response
  try {
    paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
      headers: { Authorization: `Bearer ${mpAccount.accessToken}` },
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'Pagamento indisponível para validação.' }, { status: 503 })
  }
  if (!paymentResponse.ok) return NextResponse.json({ error: 'Pagamento indisponível para validação.' }, { status: 503 })

  let payment: MercadoPagoPayment
  try {
    payment = await paymentResponse.json() as MercadoPagoPayment
  } catch {
    return NextResponse.json({ error: 'Resposta de pagamento inválida.' }, { status: 502 })
  }

  const paymentId = String(payment.id || '')
  const status = typeof payment.status === 'string' ? payment.status : ''
  const externalReference = typeof payment.external_reference === 'string' ? payment.external_reference : ''
  const preferenceId = typeof payment.preference_id === 'string' ? payment.preference_id : ''
  const paymentSellerId = String(payment.collector_id || '')
  const paymentApplicationId = String(payment.application_id || '')
  const amount = typeof payment.transaction_amount === 'number' ? payment.transaction_amount : Number.NaN

  if (
    paymentId !== dataId ||
    !KNOWN_PAYMENT_STATUSES.has(status) ||
    paymentSellerId !== sellerId ||
    paymentApplicationId !== credentialsClientId ||
    !externalReference || !preferenceId ||
    !Number.isFinite(amount) ||
    payment.currency_id !== 'BRL'
  ) {
    return NextResponse.json({ ok: true })
  }

  let notice: null | { kind: 'approved' | 'review'; guestName: string; guestEmail: string; totalPrice: number; checkIn: Date; checkOut: Date; tenantName: string } = null

  try {
    const outcome = await serializableTransaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: {
          id: externalReference,
          tenantId: connection.tenantId,
          room: { is: { tenantId: connection.tenantId } },
        },
        select: {
          id: true,
          tenantId: true,
          guestName: true,
          guestEmail: true,
          totalPrice: true,
          status: true,
          mercadoPagoPreferenceId: true,
          mercadoPagoPaymentId: true,
          checkIn: true,
          checkOut: true,
          items: { select: { status: true, holdExpiresAt: true } },
        },
      })
      if (
        !reservation ||
        !reservation.mercadoPagoPreferenceId ||
        reservation.mercadoPagoPreferenceId !== preferenceId ||
        cents(reservation.totalPrice) !== cents(amount)
      ) return null

      const priorPayment = await tx.reservationPayment.findUnique({
        where: { tenantId_paymentId: { tenantId: connection.tenantId, paymentId } },
      })
      if (priorPayment && (
        priorPayment.reservationId !== reservation.id ||
        priorPayment.preferenceId !== preferenceId ||
        cents(priorPayment.amount) !== cents(amount)
      )) return null

      const providerEventId = typeof body.id === 'string' || typeof body.id === 'number'
        ? String(body.id)
        : `${paymentId}:${status}`
      await tx.mercadoPagoWebhookEvent.create({
        data: { tenantId: connection.tenantId, providerEventId, paymentId, status },
      })

      const wasApproved = priorPayment?.status === 'approved'
      const wasTerminal = ['approved', 'rejected', 'cancelled', 'refunded', 'charged_back'].includes(priorPayment?.status || '')
      if (!wasTerminal || status === 'approved' || status === 'refunded' || status === 'charged_back') {
        await tx.reservationPayment.upsert({
          where: { tenantId_paymentId: { tenantId: connection.tenantId, paymentId } },
          create: {
            tenantId: connection.tenantId,
            reservationId: reservation.id,
            paymentId,
            preferenceId,
            status,
            amount,
            currencyId: 'BRL',
            approvedAt: status === 'approved' ? new Date() : null,
          },
          update: {
            status,
            amount,
            currencyId: 'BRL',
            ...(status === 'approved' ? { approvedAt: new Date() } : {}),
          },
        })
      }

      const now = new Date()
      if (status === 'approved') {
        if (reservation.status === 'confirmed') {
          if (reservation.mercadoPagoPaymentId === paymentId) return null
          await tx.reservation.updateMany({
            where: { id: reservation.id, tenantId: connection.tenantId, status: 'confirmed' },
            data: { paymentReviewRequired: true },
          })
          await tx.reservationPayment.update({
            where: { tenantId_paymentId: { tenantId: connection.tenantId, paymentId } },
            data: { reviewRequired: true },
          })
          await createNotification(connection.tenantId, 'reservation.payment_review', {
            eventKey: `reservation.payment_review:${paymentId}`,
            title: 'Pagamento adicional aprovado',
            message: `Um pagamento aprovado para a reserva ${reservation.id} exige análise manual.`,
            href: '/admin/reservations',
            data: { reservationId: reservation.id, paymentId },
          }, tx)
          return priorPayment?.reviewRequired ? null : {
            kind: 'review' as const,
            guestName: reservation.guestName,
            guestEmail: reservation.guestEmail,
            totalPrice: reservation.totalPrice,
            checkIn: reservation.checkIn,
            checkOut: reservation.checkOut,
          }
        }

        const holdIsActive = reservation.status === 'pending' && reservation.items.length > 0 &&
          reservation.items.every((item) => item.status === 'pending' && item.holdExpiresAt > now)
        if (holdIsActive) {
          const otherApprovedPayment = await tx.reservationPayment.findFirst({
            where: {
              tenantId: connection.tenantId,
              reservationId: reservation.id,
              paymentId: { not: paymentId },
              status: 'approved',
            },
            select: { id: true },
          })
          if (!otherApprovedPayment) {
            const confirmed = await tx.reservation.updateMany({
              where: { id: reservation.id, tenantId: connection.tenantId, status: 'pending' },
              data: {
                status: 'confirmed',
                mercadoPagoPaymentId: paymentId,
                mercadoPagoStatus: 'approved',
                paymentReviewRequired: false,
              },
            })
            if (confirmed.count === 1) {
              await tx.reservationItem.updateMany({
                where: { tenantId: connection.tenantId, reservationId: reservation.id, status: 'pending' },
                data: { status: 'confirmed' },
              })
              await createNotification(connection.tenantId, 'reservation.payment_approved', {
                eventKey: `reservation.payment_approved:${paymentId}`,
                title: 'Pagamento aprovado',
                message: `A reserva ${reservation.id} foi confirmada após pagamento aprovado.`,
                href: '/admin/reservations',
                data: { reservationId: reservation.id, paymentId, totalPrice: reservation.totalPrice },
              }, tx)
              return {
                kind: 'approved' as const,
                guestName: reservation.guestName,
                guestEmail: reservation.guestEmail,
                totalPrice: reservation.totalPrice,
                checkIn: reservation.checkIn,
                checkOut: reservation.checkOut,
              }
            }
          }
        }

        await tx.reservation.updateMany({
          where: { id: reservation.id, tenantId: connection.tenantId, status: { not: 'confirmed' } },
          data: {
            status: 'manual_review',
            mercadoPagoPaymentId: paymentId,
            mercadoPagoStatus: 'approved',
            paymentReviewRequired: true,
          },
        })
        await tx.reservationItem.updateMany({
          where: { tenantId: connection.tenantId, reservationId: reservation.id, status: 'pending' },
          data: { status: 'expired' },
        })
        await tx.reservationPayment.update({
          where: { tenantId_paymentId: { tenantId: connection.tenantId, paymentId } },
          data: { reviewRequired: true },
        })
        await createNotification(connection.tenantId, 'reservation.payment_review', {
          eventKey: `reservation.payment_review:${paymentId}`,
          title: 'Pagamento aprovado após o prazo',
          message: `O pagamento da reserva ${reservation.id} foi aprovado depois que a retenção expirou e exige análise manual.`,
          href: '/admin/reservations',
          data: { reservationId: reservation.id, paymentId },
        }, tx)
        return priorPayment?.reviewRequired ? null : {
          kind: 'review' as const,
          guestName: reservation.guestName,
          guestEmail: reservation.guestEmail,
          totalPrice: reservation.totalPrice,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
        }
      }

      if (status === 'refunded' || status === 'charged_back') {
        await tx.reservation.updateMany({
          where: { id: reservation.id, tenantId: connection.tenantId },
          data: { paymentReviewRequired: true, mercadoPagoStatus: status },
        })
        await tx.reservationPayment.update({
          where: { tenantId_paymentId: { tenantId: connection.tenantId, paymentId } },
          data: { reviewRequired: true },
        })
        await createNotification(connection.tenantId, 'reservation.payment_review', {
          eventKey: `reservation.payment_review:${paymentId}:${status}`,
          title: 'Pagamento exige análise',
          message: `O pagamento da reserva ${reservation.id} mudou para ${status}.`,
          href: '/admin/reservations',
          data: { reservationId: reservation.id, paymentId, status },
        }, tx)
        return null
      }

      if (!wasTerminal && NON_FINAL_PAYMENT_STATUSES.has(status) && reservation.status === 'pending') {
        await tx.reservation.updateMany({
          where: { id: reservation.id, tenantId: connection.tenantId, status: 'pending' },
          data: { mercadoPagoPaymentId: paymentId, mercadoPagoStatus: status },
        })
      }
      if (!wasTerminal && (status === 'rejected' || status === 'cancelled')) {
        await createNotification(connection.tenantId, 'reservation.payment_failed', {
          eventKey: `reservation.payment_failed:${paymentId}:${status}:${providerEventId}`,
          title: 'Pagamento não aprovado',
          message: `O pagamento da reserva ${reservation.id} está com status ${status}. A retenção segue até o prazo informado.`,
          href: '/admin/reservations',
          data: { reservationId: reservation.id, paymentId, status },
        }, tx)
      }
      return null
    })

    if (outcome) notice = { ...outcome, tenantName: connection.tenant.name }
  } catch (error) {
    if (isSerializationConflict(error)) return NextResponse.json({ error: 'O estado da reserva mudou durante a confirmação do pagamento.' }, { status: 409 })
    if (hasPrismaCode(error, 'P2002')) return NextResponse.json({ ok: true, duplicate: true })
    return NextResponse.json({ error: 'Notificação não pôde ser processada.' }, { status: 500 })
  }

  if (notice) {
    const dates = `${notice.checkIn.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${notice.checkOut.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
    const isApproved = notice.kind === 'approved'
    await sendTransactionalEmail({
      to: notice.guestEmail,
      subject: isApproved ? `Reserva ${dataId} confirmada` : `Pagamento da reserva ${dataId} em análise`,
      fromName: notice.tenantName,
      html: isApproved
        ? `<p>Olá, ${escapeHtml(notice.guestName)}.</p><p>O pagamento foi aprovado e sua reserva está confirmada.</p><p>Período: ${dates}</p><p>Total pago: ${notice.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>`
        : `<p>Olá, ${escapeHtml(notice.guestName)}.</p><p>Recebemos um pagamento aprovado para sua reserva, mas ele precisa de análise manual antes de confirmarmos a hospedagem. A equipe da ${escapeHtml(notice.tenantName)} entrará em contato.</p>`,
      text: isApproved
        ? `Olá, ${notice.guestName}. O pagamento foi aprovado e sua reserva está confirmada. Período: ${dates}. Total pago: ${notice.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
        : `Olá, ${notice.guestName}. Recebemos um pagamento aprovado para sua reserva, mas ele precisa de análise manual antes de confirmarmos a hospedagem. A equipe da ${notice.tenantName} entrará em contato.`,
    })
  }

  return NextResponse.json({ ok: true })
}
