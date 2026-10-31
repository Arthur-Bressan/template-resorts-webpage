import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireCompanyAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const [rooms, experiences, testimonials, newsletter, contacts, reservations] = await Promise.all([
      db.room.count({ where: { tenantId, published: true } }),
      db.experience.count({ where: { tenantId, published: true } }),
      db.testimonial.count({ where: { tenantId, published: true } }),
      db.newsletterSubscriber.count({ where: { tenantId } }),
      db.contactSubmission.count({ where: { tenantId } }),
      db.reservation.count({ where: { tenantId } }),
    ])

    const [contactsUnread, reservationsPending] = await Promise.all([
      db.contactSubmission.count({ where: { tenantId, read: false } }),
      db.reservation.count({ where: { tenantId, status: 'pending' } }),
    ])

    const recentContacts = await db.contactSubmission.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    return NextResponse.json({
      rooms,
      experiences,
      testimonials,
      newsletter,
      contacts,
      contactsUnread,
      reservations,
      reservationsPending,
      recentContacts,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
