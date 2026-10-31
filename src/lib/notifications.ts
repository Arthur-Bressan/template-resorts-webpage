import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

type NotificationClient = Pick<Prisma.TransactionClient, 'notification'>

/** Event names shared by leads and the reservation/subscription workflows. */
export type NotificationEvent =
  | 'lead.created'
  | 'reservation.created'
  | 'reservation.payment_approved'
  | 'reservation.payment_failed'
  | 'reservation.expired'
  | 'reservation.cancelled'
  | 'reservation.refund_recorded'
  | 'subscription.trial_ending'
  | 'subscription.first_charge_scheduled'
  | 'subscription.status_changed'
  | 'subscription.payment_method_required'
  | 'subscription.payment_failed'
  | 'subscription.overdue'
  | 'subscription.reactivated'
  | 'subscription.cancelled'
  | (string & {})

export interface NotificationPayload {
  /**
   * Stable key for one event occurrence, including its event name. Examples:
   * `lead.created:<leadId>` or `reservation.payment_failed:<paymentEventId>`.
   * Payment attempts and subscription renewals must use their occurrence ID,
   * payment status/event ID where needed, not only the reservation or
   * subscription ID.
   */
  eventKey: string
  title: string
  message: string
  href?: string
  data?: Record<string, string | number | boolean | null>
}

/**
 * Create a tenant inbox item once per occurrence key. Repeated delivery of the
 * same occurrence returns the original item; later attempts/renewals must have
 * their own event key. A transaction client lets callers atomically persist
 * the source record and its inbox item.
 */
export async function createNotification(
  tenantId: string,
  event: NotificationEvent,
  payload: NotificationPayload,
  client: NotificationClient = db,
) {
  if (!tenantId.trim()) throw new Error('tenantId is required')
  const eventKey = payload.eventKey.trim()
  if (!eventKey.startsWith(`${event}:`) || eventKey.length <= event.length + 1) {
    throw new Error('eventKey must identify an occurrence of the supplied event')
  }

  const notificationPayload = {
    title: payload.title,
    message: payload.message,
    ...(payload.href ? { href: payload.href } : {}),
    ...(payload.data ? { data: payload.data } : {}),
  }

  return client.notification.upsert({
    where: { tenantId_eventKey: { tenantId, eventKey } },
    create: {
      tenantId,
      event,
      eventKey,
      payload: JSON.stringify(notificationPayload),
    },
    update: {},
  })
}
