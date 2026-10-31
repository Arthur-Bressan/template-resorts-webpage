import { Prisma } from '@prisma/client'
import { findFutureActiveReservationItem } from '@/lib/availability'

export interface RoomUnitDraft {
  id?: string
  identifier: string
  isActive?: boolean
}

export class RoomUnitInputError extends Error {
  constructor(
    public readonly code: 'INVALID_UNITS' | 'UNIT_NOT_FOUND' | 'UNIT_HAS_RESERVATION',
    message: string,
  ) {
    super(message)
    this.name = 'RoomUnitInputError'
  }
}

export function parseRoomUnitDrafts(value: unknown): RoomUnitDraft[] {
  if (!Array.isArray(value)) {
    throw new RoomUnitInputError('INVALID_UNITS', 'A lista de unidades é inválida.')
  }

  const identifiers = new Set<string>()
  const ids = new Set<string>()
  return value.map((item) => {
    const identifier = typeof item?.identifier === 'string' ? item.identifier.trim() : ''
    const id = typeof item?.id === 'string' ? item.id.trim() : undefined
    if (!identifier || identifier.length > 100 || (item?.isActive !== undefined && typeof item.isActive !== 'boolean')) {
      throw new RoomUnitInputError('INVALID_UNITS', 'Informe um identificador válido para cada unidade.')
    }
    const normalizedIdentifier = identifier.toLocaleLowerCase('pt-BR')
    if (identifiers.has(normalizedIdentifier)) {
      throw new RoomUnitInputError('INVALID_UNITS', 'Os identificadores das unidades não podem se repetir.')
    }
    identifiers.add(normalizedIdentifier)
    if (id) {
      if (ids.has(id)) throw new RoomUnitInputError('INVALID_UNITS', 'Uma unidade foi informada mais de uma vez.')
      ids.add(id)
    }
    return {
      ...(id ? { id } : {}),
      identifier,
      ...(typeof item?.isActive === 'boolean' ? { isActive: item.isActive } : {}),
    }
  })
}

export async function saveRoomUnitDrafts(
  tx: Prisma.TransactionClient,
  input: { tenantId: string; roomId: string; drafts: RoomUnitDraft[] },
) {
  const existing = await tx.roomUnit.findMany({
    where: { tenantId: input.tenantId, roomId: input.roomId },
    select: { id: true, identifier: true, isActive: true },
  })
  const existingById = new Map(existing.map((unit) => [unit.id, unit]))

  for (const draft of input.drafts) {
    if (draft.id && !existingById.has(draft.id)) {
      throw new RoomUnitInputError('UNIT_NOT_FOUND', 'Uma unidade não pertence a esta categoria.')
    }
  }

  const finalIdentifiers = new Set<string>()
  const submittedIds = new Set(input.drafts.flatMap((draft) => draft.id ? [draft.id] : []))
  const untouched = existing.filter((unit) => !submittedIds.has(unit.id))
  for (const identifier of [
    ...untouched.map((unit) => unit.identifier),
    ...input.drafts.map((draft) => draft.identifier),
  ]) {
    const normalized = identifier.toLocaleLowerCase('pt-BR')
    if (finalIdentifiers.has(normalized)) {
      throw new RoomUnitInputError('INVALID_UNITS', 'Os identificadores das unidades não podem se repetir.')
    }
    finalIdentifiers.add(normalized)
  }

  for (const draft of input.drafts) {
    if (draft.id) {
      const current = existingById.get(draft.id)!
      if (current.isActive && draft.isActive === false) {
        const conflict = await findFutureActiveReservationItem(
          { tenantId: input.tenantId, roomUnitId: draft.id },
          tx,
        )
        if (conflict) {
          throw new RoomUnitInputError('UNIT_HAS_RESERVATION', 'Não é possível inativar uma unidade com reserva ativa.')
        }
      }
    }
  }

  // Free identifiers that are being renamed before applying the final names;
  // this permits two units to swap identifiers within the same transaction.
  for (const draft of input.drafts) {
    if (draft.id && existingById.get(draft.id)!.identifier !== draft.identifier) {
      await tx.roomUnit.updateMany({
        where: { id: draft.id, tenantId: input.tenantId, roomId: input.roomId },
        data: { identifier: `__unit_sync_${crypto.randomUUID()}__` },
      })
    }
  }

  for (const draft of input.drafts) {
    if (draft.id) {
      await tx.roomUnit.updateMany({
        where: { id: draft.id, tenantId: input.tenantId, roomId: input.roomId },
        data: { identifier: draft.identifier, isActive: draft.isActive ?? existingById.get(draft.id)!.isActive },
      })
    } else {
      await tx.roomUnit.create({
        data: {
          tenantId: input.tenantId,
          roomId: input.roomId,
          identifier: draft.identifier,
          isActive: draft.isActive !== false,
        },
      })
    }
  }

  return tx.roomUnit.findMany({
    where: { tenantId: input.tenantId, roomId: input.roomId },
    orderBy: [{ identifier: 'asc' }, { id: 'asc' }],
  })
}
