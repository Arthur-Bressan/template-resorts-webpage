import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdmin()
    const [rooms, experiences, testimonials, newsletter, contacts, reservations] = await Promise.all([
      db.room.count({ where: { published: true } }),
      db.experience.count({ where: { published: true } }),
      db.testimonial.count({ where: { published: true } }),
      db.newsletterSubscriber.count(),
      db.contactSubmission.count(),
      db.reservation.count(),
    ])

    const [contactsUnread, reservationsPending] = await Promise.all([
      db.contactSubmission.count({ where: { read: false } }),
      db.reservation.count({ where: { status: 'pending' } }),
    ])

    const recentContacts = await db.contactSubmission.findMany({
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
