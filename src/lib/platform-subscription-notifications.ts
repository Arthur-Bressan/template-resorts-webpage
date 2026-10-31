import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email'
import { createNotification, type NotificationEvent } from '@/lib/notifications'

type NoticeInput = {
  tenantId: string
  event: NotificationEvent
  eventKey: string
  title: string
  message: string
  href?: string
  data?: Record<string, string | number | boolean | null>
}

type NotificationTransaction = Pick<Prisma.TransactionClient, 'notification'>

/** Inserts one tenant inbox notice per stable billing occurrence key. */
export async function createCompanySubscriptionNotice(
  input: NoticeInput,
  client: NotificationTransaction = db,
) {
  const existing = await client.notification.findUnique({
    where: { tenantId_eventKey: { tenantId: input.tenantId, eventKey: input.eventKey } },
    select: { id: true },
  })
  if (existing) return false

  await createNotification(input.tenantId, input.event, {
    eventKey: input.eventKey,
    title: input.title,
    message: input.message,
    ...(input.href ? { href: input.href } : {}),
    ...(input.data ? { data: input.data } : {}),
  }, client)
  return true
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character)
}

/** Sends the persisted inbox event to the company admin and internal team. */
export async function emailCompanySubscriptionNotice(input: {
  tenantId: string
  title: string
  message: string
}) {
  const [company, teamEmail] = await Promise.all([
    db.company.findUnique({
      where: { id: input.tenantId },
      select: {
        name: true,
        memberships: { take: 1, select: { admin: { select: { email: true } } } },
      },
    }),
    Promise.resolve(process.env.NOTIFICATION_EMAIL?.trim() || ''),
  ])

  const companyEmail = company?.memberships[0]?.admin.email.trim() || ''
  const recipients = [...new Set([companyEmail, teamEmail].filter(Boolean))]
  if (!recipients.length) return

  const safeCompanyName = escapeHtml(company?.name || 'hospedagem')
  const safeTitle = escapeHtml(input.title)
  const safeMessage = escapeHtml(input.message)
  await Promise.all(recipients.map((to) => sendTransactionalEmail({
    to,
    fromName: 'Plataforma',
    subject: `${input.title} - ${company?.name || 'hospedagem'}`,
    html: `<p>Atualização da assinatura de <strong>${safeCompanyName}</strong>.</p><p><strong>${safeTitle}</strong></p><p>${safeMessage}</p>`,
    text: `Atualização da assinatura de ${company?.name || 'hospedagem'}: ${input.title}. ${input.message}`,
  })))
}
