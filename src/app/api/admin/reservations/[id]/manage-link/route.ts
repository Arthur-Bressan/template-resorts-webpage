import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { createGuestReservationToken, escapeEmailHtml, getGuestReservationUrl } from '@/lib/guest-reservation-link'
import { createNotification } from '@/lib/notifications'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenant, tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const reservation = await db.reservation.findFirst({
      where: { id, tenantId, room: { is: { tenantId } } },
      include: {
        items: { where: { tenantId }, select: { id: true }, take: 1 },
        tenant: { select: { siteSetting: { select: { name: true } } } },
      },
    })
    if (!reservation) return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
    if (!reservation.items.length) return NextResponse.json({ error: 'Esta reserva não possui unidades físicas registradas. Reconcilie a reserva com unidades antes de rotacionar o token ou enviar um link de gestão.' }, { status: 409 })
    const guestEmail = reservation.guestEmail.trim()
    if (!guestEmail) return NextResponse.json({ error: 'Esta reserva não tem e-mail de hóspede cadastrado.' }, { status: 409 })

    const { token, tokenHash } = createGuestReservationToken()
    const manageUrl = getGuestReservationUrl(token, tenant.slug)
    if (!manageUrl) return NextResponse.json({ error: 'Configure PLATFORM_BASE_DOMAIN antes de enviar links de gestão.' }, { status: 503 })

    const replaced = await db.reservation.updateMany({
      where: { id, tenantId, manageTokenHash: reservation.manageTokenHash },
      data: { manageTokenHash: tokenHash },
    })
    if (!replaced.count) return NextResponse.json({ error: 'A reserva foi alterada por outra ação. Atualize e tente novamente.' }, { status: 409 })

    const propertyName = reservation.tenant?.siteSetting?.name || tenant.name
    const emailResult = await sendTransactionalEmail({
      to: guestEmail,
      fromName: propertyName,
      subject: `Link seguro da reserva ${reservation.id}`,
      html: `<p>Olá, ${escapeEmailHtml(reservation.guestName)}.</p><p>Use este link seguro para consultar ou solicitar o cancelamento da sua reserva em ${escapeEmailHtml(propertyName)}:</p><p><a href="${escapeEmailHtml(manageUrl)}">Gerenciar minha reserva</a></p><p>Se não reconhece esta reserva, entre em contato diretamente com a pousada.</p>`,
      text: `Olá, ${reservation.guestName}. Consulte ou solicite o cancelamento da sua reserva em ${propertyName}: ${manageUrl}. Se não reconhece esta reserva, entre em contato diretamente com a pousada.`,
    })
    if (!emailResult.sent) {
      await db.reservation.updateMany({
        where: { id, tenantId, manageTokenHash: tokenHash },
        data: { manageTokenHash: reservation.manageTokenHash },
      })
      return NextResponse.json({ error: 'O e-mail não foi enviado. Confira a configuração do serviço de e-mail e tente novamente.' }, { status: 503 })
    }

    await createNotification(tenantId, 'reservation.manage_link_sent', {
      eventKey: `reservation.manage_link_sent:${id}:${randomUUID()}`,
      title: 'Link seguro da reserva enviado',
      message: `Um link de gestão foi enviado para ${guestEmail}.`,
      href: '/admin/reservations',
      data: { reservationId: id },
    })
    return NextResponse.json({ ok: true, rotated: Boolean(reservation.manageTokenHash) })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Não foi possível enviar o link de gestão.' }, { status: 500 })
  }
}
