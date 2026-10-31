import { NextRequest, NextResponse } from 'next/server'
import { AvailabilityError, parseStayDates } from '@/lib/availability'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { createGuestReservationToken, escapeEmailHtml, getGuestReservationUrl } from '@/lib/guest-reservation-link'
import { createNotification } from '@/lib/notifications'
import { createReservationWithHold } from '@/lib/reservation-service'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'

class ManualReservationInputError extends Error {}

function normalizeCategories(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    throw new ManualReservationInputError('Informe ao menos uma categoria.')
  }
  const quantities = new Map<string, number>()
  for (const entry of value) {
    const row = entry as { categoryId?: unknown; quantity?: unknown } | null
    const categoryId = typeof row?.categoryId === 'string' ? row.categoryId.trim() : ''
    const quantity = row?.quantity
    if (!categoryId || typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new ManualReservationInputError('Categoria ou quantidade inválida.')
    }
    quantities.set(categoryId, (quantities.get(categoryId) || 0) + quantity)
  }
  return [...quantities].map(([categoryId, quantity]) => ({ categoryId, quantity }))
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: NextRequest) {
  try {
    const { tenant, tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    let body: Record<string, unknown>
    try {
      const parsed = await request.json()
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
      body = parsed as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    const guestName = typeof body.guestName === 'string' ? body.guestName.trim() : ''
    const guestEmail = typeof body.guestEmail === 'string' ? body.guestEmail.trim().toLowerCase() : ''
    const guestPhone = typeof body.guestPhone === 'string' ? body.guestPhone.trim() : ''
    const guests = body.guests
    if (guestName.length < 2 || guestName.length > 120 || !isValidEmail(guestEmail) || guestPhone.length > 30 ||
      typeof guests !== 'number' || !Number.isSafeInteger(guests) || guests < 1 || guests > 50) {
      return NextResponse.json({ error: 'Confira o nome, e-mail e número de hóspedes.' }, { status: 400 })
    }

    const dates = parseStayDates({ checkIn: body.checkIn as string, checkOut: body.checkOut as string })
    const nights = (dates.checkOut.getTime() - dates.checkIn.getTime()) / 86400000
    if (!Number.isSafeInteger(nights) || nights < 1) return NextResponse.json({ error: 'A estadia deve ter ao menos uma noite.' }, { status: 400 })
    const requestedCategories = normalizeCategories(body.requestedCategories)
    const contactId = typeof body.contactId === 'string' ? body.contactId.trim() : ''
    const { token, tokenHash } = createGuestReservationToken()
    const manageUrl = getGuestReservationUrl(token, tenant.slug)
    if (!manageUrl) {
      return NextResponse.json({ error: 'Configure PLATFORM_BASE_DOMAIN antes de registrar reservas com link de hóspede.' }, { status: 503 })
    }

    const created = await serializableTransaction(async (tx) => {
      const categories = await tx.room.findMany({
        where: { tenantId, id: { in: requestedCategories.map((item) => item.categoryId) } },
        select: { id: true, name: true, price: true, capacity: true },
      })
      if (categories.length !== requestedCategories.length) throw new ManualReservationInputError('Uma categoria não pertence a esta hospedagem.')
      const byId = new Map(categories.map((category) => [category.id, category]))
      const lines = requestedCategories.map((line) => {
        const category = byId.get(line.categoryId)
        if (!category || !Number.isFinite(category.price) || category.price < 0) throw new ManualReservationInputError('Uma categoria não tem tarifa válida.')
        return { ...line, name: category.name, capacity: category.capacity, unitPricePerNight: roundMoney(category.price), totalPrice: roundMoney(category.price * nights) }
      })
      if (guests > lines.reduce((total, line) => total + line.capacity * line.quantity, 0)) {
        throw new ManualReservationInputError('A capacidade das unidades selecionadas é menor que o número de hóspedes.')
      }
      const totalPrice = roundMoney(lines.reduce((total, line) => total + line.totalPrice * line.quantity, 0))
      const reservation = await createReservationWithHold({
        tenantId,
        reservation: {
          guestName,
          guestEmail,
          guestPhone,
          roomId: lines[0].categoryId,
          guests,
          totalPrice,
          mercadoPagoPaymentId: '',
          mercadoPagoStatus: '',
          notes: '',
          bookingSource: 'manual',
          manageTokenHash: tokenHash,
        },
        dates,
        requestedCategories: lines.map(({ categoryId, quantity }) => ({ categoryId, quantity })),
      }, tx)

      for (const line of lines) {
        await tx.reservationItem.updateMany({
          where: { tenantId, reservationId: reservation.reservation.id, roomId: line.categoryId },
          data: { unitPricePerNight: line.unitPricePerNight, totalPrice: line.totalPrice },
        })
      }

      if (contactId) {
        const converted = await tx.contactSubmission.updateMany({
          where: { id: contactId, tenantId, status: { in: ['new', 'contacted'] } },
          data: { status: 'converted' },
        })
        if (!converted.count) throw new ManualReservationInputError('Este contato já foi convertido ou não pertence a esta hospedagem.')
      }

      const holdExpiresAt = reservation.items[0]?.holdExpiresAt
      await createNotification(tenantId, 'reservation.created', {
        eventKey: `reservation.created:${reservation.reservation.id}`,
        title: 'Reserva presencial aguardando confirmação',
        message: `${guestName} foi cadastrado como reserva manual. Confirme a operação dentro de 15 minutos.`,
        href: '/admin/reservations',
        data: { reservationId: reservation.reservation.id, totalPrice, bookingSource: 'manual' },
      }, tx)

      return { reservationId: reservation.reservation.id, totalPrice, holdExpiresAt }
    })

    const setting = await db.siteSetting.findFirst({ where: { tenantId }, select: { email: true, name: true } })
    const expiryText = created.holdExpiresAt ? created.holdExpiresAt.toLocaleString('pt-BR') : ''
    const escapedName = escapeEmailHtml(guestName)
    let guestManageEmailSent = false
    if (manageUrl) {
      const emailResult = await sendTransactionalEmail({
        to: guestEmail,
        fromName: setting?.name || tenant.name,
        subject: `Reserva registrada em ${setting?.name || tenant.name}`,
        html: `<p>Olá, ${escapedName}.</p><p>A equipe registrou sua reserva em ${escapeEmailHtml(setting?.name || tenant.name)}. A confirmação operacional será concluída pela pousada.</p><p>As unidades ficam retidas até ${escapeEmailHtml(expiryText)} enquanto a equipe conclui a confirmação.</p><p><a href="${escapeEmailHtml(manageUrl)}">Consultar ou cancelar sua reserva</a></p>`,
        text: `Olá, ${guestName}. A equipe registrou sua reserva em ${setting?.name || tenant.name}. A confirmação operacional será concluída pela pousada. As unidades ficam retidas até ${expiryText}. Consulte ou cancele: ${manageUrl}`,
      })
      guestManageEmailSent = emailResult.sent
    }
    if (setting?.email) {
      await sendTransactionalEmail({
        to: setting.email,
        fromName: setting.name || tenant.name,
        subject: 'Nova reserva presencial aguardando confirmação',
        html: `<p>Nova reserva manual para ${escapeEmailHtml(guestName)}. Confirme no painel antes do fim da retenção de 15 minutos.</p><p>Reserva: ${created.reservationId}. Total operacional: ${created.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.</p>`,
        text: `Nova reserva manual para ${guestName}. Confirme no painel antes do fim da retenção de 15 minutos. Reserva: ${created.reservationId}. Total: ${created.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
      })
    }
    return NextResponse.json({ id: created.reservationId, status: 'pending', holdExpiresAt: created.holdExpiresAt, manageEmailSent: guestManageEmailSent }, { status: 201 })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    if (isSerializationConflict(error)) return NextResponse.json({ error: 'A disponibilidade mudou durante o cadastro. Atualize as datas e tente novamente.' }, { status: 409 })
    if (error instanceof ManualReservationInputError) return NextResponse.json({ error: error.message }, { status: 400 })
    if (error instanceof AvailabilityError) {
      const status = error.code === 'INSUFFICIENT_AVAILABILITY' || error.code === 'UNIT_HAS_RESERVATION' ? 409 : 400
      return NextResponse.json({ error: error.message }, { status })
    }
    return NextResponse.json({ error: 'Não foi possível registrar a reserva.' }, { status: 500 })
  }
}
