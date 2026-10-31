import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const databaseUrl = process.env.DATABASE_URL || 'file:./db/custom.db'
const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

function parseLibsqlUrl(url: string): { url: string; authToken?: string } {
  const match = url.match(/\?(?:auth_token|authToken)=([^&]+)/)
  if (match) return { url: url.split('?')[0], authToken: match[1] }
  return { url }
}

function createPrismaClient() {
  if (tursoUrl) {
    return new PrismaClient({ adapter: new PrismaLibSQL({ url: tursoUrl, authToken: tursoToken }) })
  }
  if (databaseUrl.startsWith('libsql://')) {
    const { url, authToken } = parseLibsqlUrl(databaseUrl)
    return new PrismaClient({ adapter: new PrismaLibSQL({ url, authToken }) })
  }
  return new PrismaClient()
}

const prisma = createPrismaClient()

/**
 * Add one active physical unit to each tenant-owned legacy category that has
 * no units yet. Existing categories, units, reservations, and content are
 * never rewritten or deleted; repeated runs leave populated categories alone.
 */
async function migrateRoomUnits() {
  const result = await prisma.$transaction(async (tx) => {
    const rooms = await tx.room.findMany({
      where: { tenantId: { not: null } },
      select: { id: true, tenantId: true },
      orderBy: { id: 'asc' },
    })

    let createdCategories = 0
    let skippedCategories = 0
    for (const room of rooms) {
      if (!room.tenantId) {
        skippedCategories += 1
        continue
      }
      const existingUnit = await tx.roomUnit.findFirst({
        where: { tenantId: room.tenantId, roomId: room.id },
        select: { id: true },
      })
      if (existingUnit) {
        skippedCategories += 1
        continue
      }

      await tx.roomUnit.upsert({
        where: {
          tenantId_roomId_identifier: {
            tenantId: room.tenantId,
            roomId: room.id,
            identifier: '1',
          },
        },
        update: {},
        create: {
          tenantId: room.tenantId,
          roomId: room.id,
          identifier: '1',
          isActive: true,
        },
      })
      createdCategories += 1
    }

    const unownedCategories = await tx.room.count({ where: { tenantId: null } })
    return { createdCategories, skippedCategories, unownedCategories }
  })

  console.log(
    `Backfill concluído: ${result.createdCategories} categorias receberam uma unidade; ` +
      `${result.skippedCategories} já tinham unidades; ${result.unownedCategories} sem tenant foram ignoradas.`,
  )
}

migrateRoomUnits()
  .catch(() => {
    console.error('Falha ao criar unidades físicas para categorias sem inventário.')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
