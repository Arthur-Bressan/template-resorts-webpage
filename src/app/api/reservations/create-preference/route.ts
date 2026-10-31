import { NextRequest, NextResponse } from 'next/server'
import { AvailabilityError } from '@/lib/availability'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { createGuestReservationToken, getGuestReservationUrl } from '@/lib/guest-reservation-link'
import { createReservationWithHold } from '@/lib/reservation-service'
import {
  getMercadoPagoAccessToken,
  isMercadoPagoDevelopmentMockEnabled,
  MercadoPagoTemporaryUnavailableError,
} from '@/lib/mercadopago'
import { getTenantFromHost, getPlatformBaseDomain } from '@/lib/tenant-context'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'
import { assertCompanyWriteAccess } from '@/lib/company-subscription-access'

type RequestedCategoryInput = { categoryId: string; quantity: number }

class CheckoutInputError extends Error {}

function normalizeRequestedCategories(value: unknown, legacyRoomId?: unknown) {
  const input = Array.isArray(value)
    ? value
    : typeof legacyRoomId === 'string' && legacyRoomId.trim()
      ? [{ categoryId: legacyRoomId, quantity: 1 }]
      : null
  if (!input || input.length === 0 || input.length > 20) {
    throw new CheckoutInputError('Selecione ao menos uma categoria de acomodação.')
  }

  const quantities = new Map<string, number>()
  for (const entry of input) {
    const request = entry as Partial<RequestedCategoryInput> | null
    const categoryId = typeof request?.categoryId === 'string' ? request.categoryId.trim() : ''
    const quantity = request?.quantity
    if (!categoryId || typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1) {
      throw new CheckoutInputError('Categoria ou quantidade inválida.')
    }
    const nextQuantity = (quantities.get(categoryId) || 0) + quantity
    if (!Number.isSafeInteger(nextQuantity)) throw new CheckoutInputError('Quantidade inválida.')
    quantities.set(categoryId, nextQuantity)
  }
  return [...quantities].map(([categoryId, quantity]) => ({ categoryId, quantity }))
}

function parseDateOnly(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}

function brazilToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function safePublicUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.username || url.password || url.hash) return null
    if (url.protocol === 'https:') return url
    if (process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1'].includes(url.hostname)) return url
    return null
  } catch {
    return null
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character)
}

export async function POST(request: NextRequest) {
  let reservationId = ''
  try {
    let body: Record<string, unknown>
    try {
      const parsed = await request.json()
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
      }
      body = parsed as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    if (body.website) return NextResponse.json({ ok: true })
    const { success } = rateLimit(getClientIp(request), 3, 60_000)
    if (!success) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um momento e tente novamente.' }, { status: 429 })
    }

    const tenant = await getTenantFromHost(request.headers.get('host'))
    if (!tenant) return NextResponse.json({ error: 'Hospedagem não encontrada.' }, { status: 404 })
    await assertCompanyWriteAccess(tenant.id)

    const requestedCategories = normalizeRequestedCategories(body.requestedCategories, body.roomId)
    const checkIn = parseDateOnly(body.checkIn)
    const checkOut = parseDateOnly(body.checkOut)
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      return NextResponse.json({ error: 'Informe datas válidas para a estadia.' }, { status: 400 })
    }
    if (typeof body.checkIn !== 'string' || body.checkIn < brazilToday()) {
      return NextResponse.json({ error: 'A data de check-in não pode estar no passado.' }, { status: 400 })
    }
    if (body.consent !== true) {
      return NextResponse.json({ error: 'Você precisa aceitar a Política de Privacidade.' }, { status: 400 })
    }

    const guestName = typeof body.guestName === 'string' ? body.guestName.trim() : ''
    const guestEmail = typeof body.guestEmail === 'string' ? body.guestEmail.trim().toLowerCase() : ''
    const guestPhone = typeof body.guestPhone === 'string' ? body.guestPhone.trim() : ''
    const guests = body.guests
    if (
      guestName.length < 2 || guestName.length > 120 ||
      guestEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail) ||
      guestPhone.length < 7 || guestPhone.length > 30 ||
      typeof guests !== 'number' || !Number.isSafeInteger(guests) || guests < 1 || guests > 10
    ) {
      return NextResponse.json({ error: 'Confira os dados do responsável pela reserva.' }, { status: 400 })
    }

    const nights = (checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000)
    if (!Number.isSafeInteger(nights) || nights < 1) {
      return NextResponse.json({ error: 'A reserva precisa ter pelo menos uma noite.' }, { status: 400 })
    }

    const useDevelopmentMock = isMercadoPagoDevelopmentMockEnabled()
    const mpAccount = useDevelopmentMock ? null : await getMercadoPagoAccessToken(tenant.id)
    if (!useDevelopmentMock && !mpAccount) {
      return NextResponse.json(
        { error: 'Esta hospedagem ainda não conectou uma conta Mercado Pago.' },
        { status: 503 },
      )
    }

    const publicBase = safePublicUrl(process.env.NEXT_PUBLIC_BASE_URL || '')
    const tenantDomain = getPlatformBaseDomain()
    if (!useDevelopmentMock && !publicBase) {
      return NextResponse.json({ error: 'Checkout temporariamente indisponível.' }, { status: 503 })
    }
    if (!tenantDomain) return NextResponse.json({ error: 'Checkout temporariamente indisponível.' }, { status: 503 })
    const tenantOrigin = `https://${tenant.slug}.${tenantDomain}`
    const now = new Date()
    const { token: guestManageToken, tokenHash: guestManageTokenHash } = createGuestReservationToken()

    const booking = await serializableTransaction(async (tx) => {
      const categoryIds = requestedCategories.map((item) => item.categoryId)
      const categories = await tx.room.findMany({
        where: { tenantId: tenant.id, id: { in: categoryIds }, published: true },
        select: { id: true, name: true, price: true, capacity: true },
      })
      if (categories.length !== categoryIds.length) {
        throw new CheckoutInputError('Uma ou mais categorias não estão disponíveis nesta hospedagem.')
      }

      const byId = new Map(categories.map((category) => [category.id, category]))
      const lineItems = requestedCategories.map(({ categoryId, quantity }) => {
        const category = byId.get(categoryId)
        if (!category || !Number.isFinite(category.price) || category.price <= 0) {
          throw new CheckoutInputError('Uma categoria não tem tarifa válida para o período.')
        }
        return {
          categoryId,
          name: category.name,
          quantity,
          capacity: category.capacity,
          unitPricePerNight: roundMoney(category.price),
          unitStayPrice: roundMoney(roundMoney(category.price) * nights),
        }
      })
      const capacity = lineItems.reduce((total, item) => total + item.capacity * item.quantity, 0)
      if (guests > capacity) {
        throw new CheckoutInputError('A capacidade das acomodações selecionadas é menor que o número de hóspedes.')
      }
      const totalPrice = roundMoney(lineItems.reduce((total, item) => total + item.unitStayPrice * item.quantity, 0))
      if (!Number.isFinite(totalPrice) || totalPrice <= 0) throw new CheckoutInputError('O valor da reserva é inválido.')

      const created = await createReservationWithHold({
        tenantId: tenant.id,
        reservation: {
          guestName,
          guestEmail,
          guestPhone,
          roomId: lineItems[0].categoryId,
          guests,
          totalPrice,
          mercadoPagoPaymentId: '',
          mercadoPagoStatus: useDevelopmentMock ? 'mock_pending' : 'pending',
          notes: '',
          bookingSource: 'online',
          manageTokenHash: guestManageTokenHash,
        },
        dates: { checkIn, checkOut },
        requestedCategories: requestedCategories.map(({ categoryId, quantity }) => ({ categoryId, quantity })),
      }, tx)

      const holdExpiresAt = created.items[0]?.holdExpiresAt
      if (!holdExpiresAt) throw new Error('Reservation hold was not created')
      for (const line of lineItems) {
        await tx.reservationItem.updateMany({
          where: { tenantId: tenant.id, reservationId: created.reservation.id, roomId: line.categoryId },
          data: { unitPricePerNight: line.unitPricePerNight, totalPrice: line.unitStayPrice },
        })
      }

      return {
        id: created.reservation.id,
        totalPrice,
        lineItems,
        holdExpiresAt,
        tenantName: tenant.name,
        manageToken: guestManageToken,
      }
    })
    reservationId = booking.id

    if (useDevelopmentMock) {
      await serializableTransaction(async (tx) => {
        const updated = await tx.reservation.updateMany({
          where: { id: booking.id, tenantId: tenant.id, status: 'pending' },
          data: { mercadoPagoStatus: 'mock_pending' },
        })
        if (!updated.count) throw new Error('Reservation hold expired before mock checkout')
        await createNotification(tenant.id, 'reservation.created', {
          eventKey: `reservation.created:${booking.id}`,
          title: 'Nova reserva em modo de desenvolvimento',
          message: `Reserva de ${guestName} aguarda pagamento simulado.`,
          href: '/admin/reservations',
          data: { reservationId: booking.id, totalPrice: booking.totalPrice },
        }, tx)
      })
      const manageUrl = getGuestReservationUrl(booking.manageToken, tenant.slug)
      if (manageUrl) {
        await sendTransactionalEmail({
          to: guestEmail,
          subject: `Link seguro da reserva ${booking.id}`,
          fromName: booking.tenantName,
          html: `<p>Use este link para consultar ou cancelar sua reserva: <a href="${escapeHtml(manageUrl)}">Gerenciar reserva</a>.</p>`,
          text: `Consulte ou cancele sua reserva: ${manageUrl}`,
        })
      }
      return NextResponse.json({
        init_point: `/reservas/pendente?reservationId=${encodeURIComponent(booking.id)}&mock=1`,
        reservationId: booking.id,
        mock: true,
      })
    }

    const notificationUrl = new URL('/api/reservations/webhook', publicBase!).toString()
    const preferenceData = {
      external_reference: booking.id,
      items: booking.lineItems.map((line) => ({
        title: `${line.name} — ${nights} ${nights === 1 ? 'noite' : 'noites'}`,
        quantity: line.quantity,
        unit_price: line.unitStayPrice,
        currency_id: 'BRL',
      })),
      payer: {
        name: guestName,
        email: guestEmail,
        phone: { number: guestPhone },
      },
      back_urls: {
        success: `${tenantOrigin}/reservas/sucesso?reservationId=${encodeURIComponent(booking.id)}`,
        failure: `${tenantOrigin}/reservas/falha?reservationId=${encodeURIComponent(booking.id)}`,
        pending: `${tenantOrigin}/reservas/pendente?reservationId=${encodeURIComponent(booking.id)}`,
      },
      notification_url: notificationUrl,
      auto_return: 'approved',
      expires: true,
      expiration_date_from: now.toISOString(),
      expiration_date_to: booking.holdExpiresAt.toISOString(),
    }

    let preference: { id?: unknown; init_point?: unknown; sandbox_init_point?: unknown }
    try {
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mpAccount!.accessToken}`,
          'X-Idempotency-Key': `reservation-preference-${booking.id}`,
        },
        body: JSON.stringify(preferenceData),
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Preference request failed')
      preference = await response.json()
    } catch {
      await serializableTransaction(async (tx) => {
        await tx.reservation.updateMany({
          where: { id: booking.id, tenantId: tenant.id, status: 'pending' },
          data: { status: 'cancelled', mercadoPagoStatus: 'preference_error' },
        })
        await tx.reservationItem.updateMany({
          where: { tenantId: tenant.id, reservationId: booking.id, status: 'pending' },
          data: { status: 'cancelled' },
        })
      })
      return NextResponse.json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' }, { status: 502 })
    }

    const preferenceId = typeof preference.id === 'string' ? preference.id : String(preference.id || '')
    const checkoutUrl = typeof preference.init_point === 'string'
      ? preference.init_point
      : process.env.NODE_ENV === 'development' && typeof preference.sandbox_init_point === 'string'
        ? preference.sandbox_init_point
        : ''
    const checkoutUrlIsMercadoPago = (() => {
      try {
        const parsed = new URL(checkoutUrl)
        return parsed.protocol === 'https:' && /(^|\.)mercadopago\.com(\.br)?$/i.test(parsed.hostname)
      } catch {
        return false
      }
    })()
    if (!preferenceId || !checkoutUrlIsMercadoPago) {
      await serializableTransaction(async (tx) => {
        await tx.reservation.updateMany({
          where: { id: booking.id, tenantId: tenant.id, status: 'pending' },
          data: { status: 'cancelled', mercadoPagoStatus: 'preference_error' },
        })
        await tx.reservationItem.updateMany({
          where: { tenantId: tenant.id, reservationId: booking.id, status: 'pending' },
          data: { status: 'cancelled' },
        })
      })
      return NextResponse.json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' }, { status: 502 })
    }

    const preferenceSave = await serializableTransaction(async (tx) => {
      const savedAt = new Date()
      const updated = await tx.reservation.updateMany({
        where: {
          id: booking.id,
          tenantId: tenant.id,
          status: 'pending',
          items: {
            some: {},
            every: { status: 'pending', holdExpiresAt: { gt: savedAt } },
          },
        },
        data: { mercadoPagoPreferenceId: preferenceId, mercadoPagoStatus: 'pending' },
      })
      if (updated.count) {
        await createNotification(tenant.id, 'reservation.created', {
          eventKey: `reservation.created:${booking.id}`,
          title: 'Nova reserva aguardando pagamento',
          message: `Reserva de ${guestName} aguarda confirmação do pagamento.`,
          href: '/admin/reservations',
          data: { reservationId: booking.id, totalPrice: booking.totalPrice },
        }, tx)
        return { saved: true, expired: false }
      }

      // Preference creation can outlive the 15-minute unit hold. If it did,
      // release every still-held unit here and never return the provider link.
      const pendingReservation = await tx.reservation.findFirst({
        where: { id: booking.id, tenantId: tenant.id, status: 'pending' },
        select: { id: true, items: { select: { status: true, holdExpiresAt: true } } },
      })
      const invalidItems = pendingReservation !== null && (
        pendingReservation.items.length === 0 || pendingReservation.items.some((item) =>
          item.status !== 'pending' || item.holdExpiresAt <= savedAt,
        )
      )
      if (!pendingReservation || !invalidItems) return { saved: false, expired: false }

      const expired = await tx.reservation.updateMany({
        where: {
          id: booking.id,
          tenantId: tenant.id,
          status: 'pending',
          OR: [
            { items: { none: {} } },
            {
              items: {
                some: {
                  OR: [
                    { status: { not: 'pending' } },
                    { holdExpiresAt: { lte: savedAt } },
                  ],
                },
              },
            },
          ],
        },
        data: { status: 'expired', mercadoPagoStatus: 'expired' },
      })
      if (!expired.count) return { saved: false, expired: false }

      await tx.reservationItem.updateMany({
        where: { tenantId: tenant.id, reservationId: booking.id, status: 'pending' },
        data: { status: 'expired' },
      })
      const pendingHoldDates = pendingReservation.items
        .filter((item) => item.status === 'pending')
        .map((item) => item.holdExpiresAt.getTime())
      const holdExpiry = pendingHoldDates.length
        ? new Date(Math.min(...pendingHoldDates))
        : booking.holdExpiresAt
      await createNotification(tenant.id, 'reservation.expired', {
        eventKey: `reservation.expired:${booking.id}:${holdExpiry.toISOString()}`,
        title: 'Retenção de reserva expirada',
        message: `A retenção da reserva de ${guestName} expirou; as unidades voltaram à disponibilidade.`,
        href: '/admin/reservations',
        data: { reservationId: booking.id, holdExpiresAt: holdExpiry.toISOString() },
      }, tx)
      return { saved: false, expired: true }
    })
    if (!preferenceSave.saved) {
      if (preferenceSave.expired) {
        await sendTransactionalEmail({
          to: guestEmail,
          subject: `Prazo de pagamento da reserva ${booking.id} encerrado`,
          fromName: booking.tenantName,
          html: `<p>Olá, ${escapeHtml(guestName)}.</p><p>O prazo para concluir o pagamento da reserva de ${escapeHtml(booking.tenantName)} terminou. As unidades foram liberadas.</p><p>Para reservar novamente, escolha as datas e acomodações disponíveis no site.</p>`,
          text: `Olá, ${guestName}. O prazo para concluir o pagamento da reserva de ${booking.tenantName} terminou. As unidades foram liberadas. Para reservar novamente, escolha as datas e acomodações disponíveis no site.`,
        })
      }
      return NextResponse.json({ error: 'O prazo de retenção da reserva terminou. Selecione as datas novamente.' }, { status: 409 })
    }

    await sendTransactionalEmail({
      to: guestEmail,
      subject: `Pagamento da reserva ${booking.id}`,
      fromName: booking.tenantName,
      html: `<p>Olá, ${escapeHtml(guestName)}.</p><p>Finalize o pagamento integral de ${escapeHtml(booking.tenantName)} no Mercado Pago para confirmar sua reserva.</p><p>Total: ${booking.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p><p><a href="${escapeHtml(checkoutUrl)}">Continuar pagamento</a></p>`,
      text: `Olá, ${guestName}. Finalize o pagamento integral de ${booking.tenantName} no Mercado Pago para confirmar sua reserva. Total: ${booking.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Continuar pagamento: ${checkoutUrl}`,
    })

    const guestManageUrl = getGuestReservationUrl(booking.manageToken, tenant.slug)
    if (guestManageUrl) {
      await sendTransactionalEmail({
        to: guestEmail,
        subject: `Link seguro da reserva ${booking.id}`,
        fromName: booking.tenantName,
        html: `<p>Use este link para consultar ou cancelar sua reserva: <a href="${escapeHtml(guestManageUrl)}">Gerenciar reserva</a>.</p>`,
        text: `Consulte ou cancele sua reserva: ${guestManageUrl}`,
      })
    }
    return NextResponse.json({ init_point: checkoutUrl, reservationId: booking.id })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'COMPANY_SUBSCRIPTION_RESTRICTED') {
      const access = 'access' in error && error.access && typeof error.access === 'object'
        ? error.access as { status?: unknown; accessUntilAt?: unknown }
        : null
      return NextResponse.json({
        error: 'Esta hospedagem não está aceitando novas reservas no momento.',
        code: 'COMPANY_SUBSCRIPTION_RESTRICTED',
        subscriptionStatus: typeof access?.status === 'string' ? access.status : 'restricted',
        accessUntilAt: access?.accessUntilAt instanceof Date ? access.accessUntilAt.toISOString() : null,
      }, { status: 403 })
    }
    if (isSerializationConflict(error)) {
      return NextResponse.json({ error: 'A disponibilidade mudou durante o checkout. Revise as datas e tente novamente.' }, { status: 409 })
    }
    if (error instanceof MercadoPagoTemporaryUnavailableError) {
      return NextResponse.json(
        { error: 'Checkout temporariamente indisponível. Tente novamente em instantes.' },
        { status: 503 },
      )
    }
    if (error instanceof CheckoutInputError) return NextResponse.json({ error: error.message }, { status: 400 })
    if (error instanceof AvailabilityError) {
      const status = error.code === 'INSUFFICIENT_AVAILABILITY' || error.code === 'UNIT_HAS_RESERVATION' ? 409 : 400
      return NextResponse.json({ error: error.message }, { status })
    }
    return NextResponse.json(
      { error: reservationId ? 'Não foi possível iniciar o pagamento. Tente novamente.' : 'Não foi possível processar a reserva.' },
      { status: reservationId ? 502 : 500 },
    )
  }
}
