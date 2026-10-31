import { Prisma } from '@prisma/client'
import { serializableTransaction } from '@/lib/serializable-transaction'
import {
  checkAndHoldUnits,
  parseStayDates,
  type RequestedCategory,
  type StayDates,
} from '@/lib/availability'

export type ReservationDraft = Pick<
  Prisma.ReservationUncheckedCreateInput,
  | 'guestName'
  | 'guestEmail'
  | 'guestPhone'
  | 'roomId'
  | 'guests'
  | 'totalPrice'
  | 'mercadoPagoPaymentId'
  | 'mercadoPagoStatus'
  | 'notes'
> & Partial<Pick<Prisma.ReservationUncheckedCreateInput, 'bookingSource' | 'manageTokenHash'>>

export interface CreateReservationWithHoldInput {
  tenantId: string
  reservation: ReservationDraft
  dates: StayDates
  requestedCategories: RequestedCategory[]
}

/**
 * Composition point for online, manual, and lead-converted bookings. The
 * authenticated/host-resolved tenant is supplied by the server caller; it is
 * never read from reservation data or a browser request body. This shared
 * service intentionally accepts unpublished categories for internal/manual
 * bookings. Public checkout must confirm every requested category is
 * published for the host tenant before calling it.
 */
export async function createReservationWithHold(
  input: CreateReservationWithHoldInput,
  client?: Prisma.TransactionClient,
) {
  const createInTransaction = async (tx: Prisma.TransactionClient) => {
    const tenantId = input.tenantId.trim()
    if (!tenantId) throw new Error('tenantId is required')
    const dates = parseStayDates(input.dates)

    const primaryCategory = await tx.room.findFirst({
      where: { id: input.reservation.roomId, tenantId },
      select: { id: true },
    })
    if (!primaryCategory) throw new Error('Reservation category does not belong to this company')

    const reservation = await tx.reservation.create({
      data: {
        ...input.reservation,
        tenantId,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        status: 'pending',
      },
    })
    const items = await checkAndHoldUnits({
      tenantId,
      reservationId: reservation.id,
      dates,
      requestedCategories: input.requestedCategories,
    }, tx)

    return { reservation, items }
  }

  if (client) return createInTransaction(client)
  return serializableTransaction(createInTransaction)
}
