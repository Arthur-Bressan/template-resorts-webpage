import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

const SERIALIZABLE_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const

export function serializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return db.$transaction(operation, SERIALIZABLE_TRANSACTION_OPTIONS)
}

export function isSerializationConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034'
}
