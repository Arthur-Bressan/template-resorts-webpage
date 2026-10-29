import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Prisma, Reservation } from '@prisma/client'

export const HOLD_MS = 30 * 60 * 1000
export const DAY_MS = 86_400_000

export class ReservationError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

// Calendar dates are stored at UTC midnight, never in the host timezone.
export function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}

export function todayAtProperty() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((p) => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export interface CheckoutNotes { checkout: { expiresAt: string; preferenceId?: string } }

export function checkoutNotes(notes: string): CheckoutNotes | null {
  try {
    const parsed = JSON.parse(notes)
    return typeof parsed?.checkout?.expiresAt === 'string' &&
      Number.isFinite(Date.parse(parsed.checkout.expiresAt)) ? parsed : null
  } catch { return null }
}

export function blocksDates(reservation: Pick<Reservation, 'status' | 'notes' | 'mercadoPagoStatus'>) {
  if (['cancelled', 'expired'].includes(reservation.status)) return false
  // Legacy pending records have no expiry: preserve potentially real bookings.
  const checkout = checkoutNotes(reservation.notes)
  if (reservation.status === 'pending' && checkout &&
      ['checkout_creating', 'checkout_created', 'checkout_uncertain'].includes(reservation.mercadoPagoStatus)) {
    return Date.parse(checkout.checkout.expiresAt) > Date.now()
  }
  return true
}

export async function lockRoom(tx: Prisma.TransactionClient, roomId: string) {
  // SQLite/libSQL serialize writers. Lock BEFORE reading overlapping dates.
  await tx.$executeRaw`UPDATE "Room" SET "id" = "id" WHERE "id" = ${roomId}`
}

export async function hasConflict(tx: Prisma.TransactionClient, roomId: string, checkIn: Date, checkOut: Date, excludeId?: string) {
  const reservations = await tx.reservation.findMany({
    where: { roomId, checkIn: { lt: checkOut }, checkOut: { gt: checkIn },
      ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { status: true, notes: true, mercadoPagoStatus: true },
  })
  return reservations.some(blocksDates)
}

function statusSecret() {
  return process.env.RESERVATION_STATUS_SECRET || process.env.MERCADO_PAGO_ACCESS_TOKEN
}

export function statusToken(reservationId: string) {
  const secret = statusSecret()
  if (!secret) throw new Error('Reservation status secret unavailable')
  return createHmac('sha256', secret).update(`reservation-status:v1:${reservationId}`).digest('hex')
}

export function validStatusToken(reservationId: string, token: string) {
  if (!statusSecret() || !/^[a-f0-9]{64}$/.test(token)) return false
  return timingSafeEqual(Buffer.from(statusToken(reservationId), 'hex'), Buffer.from(token, 'hex'))
}
