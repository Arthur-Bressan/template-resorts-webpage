import { Prisma, PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import { serializableTransaction } from '@/lib/serializable-transaction'

export const RESERVATION_HOLD_TTL_MS = 15 * 60 * 1000

export interface StayDates {
  checkIn: Date | string
  checkOut: Date | string
}

export interface RequestedCategory {
  categoryId: string
  quantity: number
}

export interface CheckAndHoldUnitsInput {
  tenantId: string
  reservationId: string
  dates: StayDates
  requestedCategories: RequestedCategory[]
}

export type AvailabilityClient = PrismaClient | Prisma.TransactionClient

export class AvailabilityError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_INPUT'
      | 'CATEGORY_NOT_FOUND'
      | 'RESERVATION_NOT_FOUND'
      | 'RESERVATION_NOT_PENDING'
      | 'RESERVATION_DATES_MISMATCH'
      | 'RESERVATION_ALREADY_HELD'
      | 'INSUFFICIENT_AVAILABILITY'
      | 'UNIT_HAS_RESERVATION',
    message: string,
  ) {
    super(message)
    this.name = 'AvailabilityError'
  }
}

export function parseStayDates(dates: StayDates): { checkIn: Date; checkOut: Date } {
  const values = dates as unknown as { checkIn?: unknown; checkOut?: unknown } | null
  const toDate = (value: unknown) => {
    if (value instanceof Date) return new Date(value)
    if (typeof value === 'string' && value.trim()) return new Date(value)
    return new Date(Number.NaN)
  }
  const checkIn = toDate(values?.checkIn)
  const checkOut = toDate(values?.checkOut)
  if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime()) || checkOut <= checkIn) {
    throw new AvailabilityError('INVALID_INPUT', 'O período informado é inválido.')
  }
  return { checkIn, checkOut }
}

function normalizeCategories(requestedCategories: RequestedCategory[]) {
  if (!Array.isArray(requestedCategories) || requestedCategories.length === 0) {
    throw new AvailabilityError('INVALID_INPUT', 'Informe ao menos uma categoria.')
  }

  const quantities = new Map<string, number>()
  for (const request of requestedCategories) {
    const categoryId = typeof request?.categoryId === 'string' ? request.categoryId.trim() : ''
    if (!categoryId || !Number.isSafeInteger(request.quantity) || request.quantity < 1) {
      throw new AvailabilityError('INVALID_INPUT', 'Categoria ou quantidade inválida.')
    }
    const quantity = (quantities.get(categoryId) || 0) + request.quantity
    if (!Number.isSafeInteger(quantity)) {
      throw new AvailabilityError('INVALID_INPUT', 'Quantidade solicitada inválida.')
    }
    quantities.set(categoryId, quantity)
  }
  return [...quantities].map(([categoryId, quantity]) => ({ categoryId, quantity }))
}

/**
 * Tests an active reservation item for a semi-open interval overlap. Pending
 * holds stop occupying inventory at their 15-minute deadline; confirmed
 * reservations remain active even after that deadline.
 */
export async function findActiveReservationItemConflict(
  input: { tenantId: string; roomUnitId: string; dates: StayDates; excludeReservationId?: string },
  client: AvailabilityClient = db,
  now = new Date(),
) {
  const dates = parseStayDates(input.dates)
  return client.reservationItem.findFirst({
    where: {
      tenantId: input.tenantId,
      roomUnitId: input.roomUnitId,
      ...(input.excludeReservationId ? { reservationId: { not: input.excludeReservationId } } : {}),
      status: { notIn: ['cancelled', 'expired'] },
      checkIn: { lt: dates.checkOut },
      checkOut: { gt: dates.checkIn },
      reservation: {
        is: {
          tenantId: input.tenantId,
          status: { notIn: ['cancelled', 'expired'] },
        },
      },
      OR: [
        { status: { notIn: ['pending', 'cancellation_requested'] } },
        { reservation: { is: { status: { not: 'pending' } } } },
        { holdExpiresAt: { gt: now } },
      ],
    },
    select: { id: true, reservationId: true, roomUnitId: true },
  })
}

export async function findFutureActiveReservationItem(
  input: { tenantId: string; roomUnitId: string },
  client: AvailabilityClient = db,
  now = new Date(),
) {
  return client.reservationItem.findFirst({
    where: {
      tenantId: input.tenantId,
      roomUnitId: input.roomUnitId,
      status: { notIn: ['cancelled', 'expired'] },
      checkOut: { gt: now },
      reservation: {
        is: {
          tenantId: input.tenantId,
          status: { notIn: ['cancelled', 'expired'] },
        },
      },
      OR: [
        { status: { notIn: ['pending', 'cancellation_requested'] } },
        { reservation: { is: { status: { not: 'pending' } } } },
        { holdExpiresAt: { gt: now } },
      ],
    },
    select: { id: true, reservationId: true, roomUnitId: true },
  })
}

/**
 * Finds category-level reservations created before unit assignment existed.
 * Because no specific unit is known, these reservations make every block in
 * that category unsafe for the overlapping period. Pending legacy holds use
 * Reservation.createdAt as their 15-minute expiry reference.
 */
export async function findLegacyReservationConflicts(
  input: { tenantId: string; categoryId: string; dates: StayDates },
  client: AvailabilityClient = db,
  now = new Date(),
) {
  const dates = parseStayDates(input.dates)
  const pendingCutoff = new Date(now.getTime() - RESERVATION_HOLD_TTL_MS)
  return client.reservation.findMany({
    where: {
      tenantId: input.tenantId,
      roomId: input.categoryId,
      room: { is: { tenantId: input.tenantId } },
      items: { none: {} },
      checkIn: { lt: dates.checkOut },
      checkOut: { gt: dates.checkIn },
      OR: [
        { status: { notIn: ['pending', 'cancelled', 'expired'] } },
        { status: 'pending', createdAt: { gt: pendingCutoff } },
      ],
    },
    select: { id: true },
  })
}

async function holdUnitsInTransaction(
  input: CheckAndHoldUnitsInput,
  tx: Prisma.TransactionClient,
) {
  const tenantId = typeof input.tenantId === 'string' ? input.tenantId.trim() : ''
  const reservationId = typeof input.reservationId === 'string' ? input.reservationId.trim() : ''
  if (!tenantId || !reservationId) {
    throw new AvailabilityError('INVALID_INPUT', 'Empresa e reserva são obrigatórias.')
  }

  const dates = parseStayDates(input.dates)
  const categories = normalizeCategories(input.requestedCategories)
  const categoryIds = categories.map((category) => category.categoryId)

  const reservation = await tx.reservation.findFirst({
    where: {
      id: reservationId,
      tenantId,
      room: { is: { tenantId } },
    },
    select: {
      id: true,
      status: true,
      checkIn: true,
      checkOut: true,
      _count: { select: { items: true } },
    },
  })
  if (!reservation) {
    throw new AvailabilityError('RESERVATION_NOT_FOUND', 'Reserva não encontrada nesta empresa.')
  }
  if (reservation.status !== 'pending') {
    throw new AvailabilityError('RESERVATION_NOT_PENDING', 'A reserva precisa estar pendente para reter unidades.')
  }
  if (reservation.checkIn.getTime() !== dates.checkIn.getTime() || reservation.checkOut.getTime() !== dates.checkOut.getTime()) {
    throw new AvailabilityError('RESERVATION_DATES_MISMATCH', 'As datas da reserva e da retenção devem ser iguais.')
  }
  if (reservation._count.items > 0) {
    throw new AvailabilityError('RESERVATION_ALREADY_HELD', 'Esta reserva já possui unidades vinculadas.')
  }

  // Publication is a public-discovery rule. The shared inventory service also
  // serves manual reservations, so public checkout validates `published`
  // before calling while this service validates tenant ownership only.
  const categoriesInTenant = await tx.room.findMany({
    where: { tenantId, id: { in: categoryIds } },
    select: { id: true },
  })
  if (categoriesInTenant.length !== categoryIds.length) {
    throw new AvailabilityError('CATEGORY_NOT_FOUND', 'Uma ou mais categorias não pertencem a esta empresa.')
  }

  const now = new Date()
  const holdExpiresAt = new Date(now.getTime() + RESERVATION_HOLD_TTL_MS)
  const allocations: Array<{ categoryId: string; roomUnitId: string }> = []

  for (const category of categories) {
    const units = await tx.roomUnit.findMany({
      where: { tenantId, roomId: category.categoryId, isActive: true },
      orderBy: [{ identifier: 'asc' }, { id: 'asc' }],
      select: { id: true },
    })

    const blockedUnits = await tx.availabilityBlock.findMany({
      where: {
        tenantId,
        roomUnitId: { in: units.map((unit) => unit.id) },
        checkIn: { lt: dates.checkOut },
        checkOut: { gt: dates.checkIn },
      },
      select: { roomUnitId: true },
    })
    const occupiedItems = await tx.reservationItem.findMany({
      where: {
        tenantId,
        roomId: category.categoryId,
        roomUnitId: { in: units.map((unit) => unit.id) },
        status: { notIn: ['cancelled', 'expired'] },
        checkIn: { lt: dates.checkOut },
        checkOut: { gt: dates.checkIn },
        reservation: {
          is: {
            tenantId,
            status: { notIn: ['cancelled', 'expired'] },
          },
        },
        OR: [
          { status: { notIn: ['pending', 'cancellation_requested'] } },
          { reservation: { is: { status: { not: 'pending' } } } },
          { holdExpiresAt: { gt: now } },
        ],
      },
      select: { roomUnitId: true },
    })

    // Older reservations have no physical-unit item. Treat each overlapping
    // confirmed reservation, or still-valid pending reservation, as occupying
    // one unit until Task 5/6 moves it into the unit-based lifecycle.
    const legacyReservations = await findLegacyReservationConflicts(
      { tenantId, categoryId: category.categoryId, dates },
      tx,
      now,
    )

    const unavailable = new Set([
      ...blockedUnits.map((block) => block.roomUnitId),
      ...occupiedItems.map((item) => item.roomUnitId),
    ])
    const availableUnits = units.filter((unit) => !unavailable.has(unit.id))
    const legacyOccupiedCount = Math.min(legacyReservations.length, availableUnits.length)
    const candidates = availableUnits.slice(legacyOccupiedCount)

    if (candidates.length < category.quantity) {
      throw new AvailabilityError(
        'INSUFFICIENT_AVAILABILITY',
        `Não há unidades suficientes disponíveis na categoria ${category.categoryId}.`,
      )
    }

    allocations.push(...candidates.slice(0, category.quantity).map((unit) => ({
      categoryId: category.categoryId,
      roomUnitId: unit.id,
    })))
  }

  const createdItems = []
  for (const allocation of allocations) {
    createdItems.push(await tx.reservationItem.create({
      data: {
        tenantId,
        reservationId,
        roomId: allocation.categoryId,
        roomUnitId: allocation.roomUnitId,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        holdExpiresAt,
        status: 'pending',
      },
    }))
  }
  return createdItems
}

/**
 * Creates physical-unit holds. Pass the caller's Prisma transaction client
 * when creating a reservation so the reservation and all its holds commit or
 * roll back together. Without a transaction client, this function opens one.
 */
export async function checkAndHoldUnits(
  input: CheckAndHoldUnitsInput,
  client?: Prisma.TransactionClient,
) {
  if (!client) {
    return serializableTransaction((tx) => holdUnitsInTransaction(input, tx))
  }
  return holdUnitsInTransaction(input, client)
}
