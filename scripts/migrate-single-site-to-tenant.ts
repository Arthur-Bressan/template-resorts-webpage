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
 * Additively associates the existing single-site records with the Refúgio tenant.
 * Run only after deploying the Prisma schema. This script does not delete or
 * rewrite business content and is safe to rerun.
 */
async function migrate() {
  const legacyAdminEmail = (process.env.REFUGIO_ADMIN_EMAIL || 'admin@refugio.com')
    .trim()
    .toLowerCase()

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.company.upsert({
      where: { slug: 'refugio-mata-atlantica' },
      update: {},
      create: {
        name: 'Refúgio Mata Atlântica',
        slug: 'refugio-mata-atlantica',
        status: 'active',
      },
    })

    const legacySettings = await tx.siteSetting.findUnique({ where: { id: 'main' } })
    if (!legacySettings) {
      await tx.siteSetting.create({
        data: {
          id: 'main',
          tenantId: tenant.id,
          name: 'Refúgio Mata Atlântica',
          tagline: 'Onde a natureza abraça o descanso',
        },
      })
    }

    await Promise.all([
      tx.siteSetting.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.navLink.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.room.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.experience.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.galleryImage.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.testimonial.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.faq.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.aboutAmenity.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.distance.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.direction.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.sensoryConfig.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.stat.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.uploadedImage.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.newsletterSubscriber.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.contactSubmission.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
      tx.reservation.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
    ])

    const admin = await tx.admin.findUnique({ where: { email: legacyAdminEmail } })
    let membershipCreated = false
    if (admin) {
      const [adminMemberships, tenantMemberships] = await Promise.all([
        tx.companyMembership.findMany({ where: { adminId: admin.id }, select: { id: true } }),
        tx.companyMembership.findMany({ where: { tenantId: tenant.id }, select: { id: true } }),
      ])
      if (adminMemberships.length === 0 && tenantMemberships.length === 0) {
        await tx.companyMembership.create({
          data: { adminId: admin.id, tenantId: tenant.id, role: 'admin' },
        })
        membershipCreated = true
      }
    }

    return { tenantId: tenant.id, membershipCreated, legacyAdminFound: Boolean(admin) }
  })

  console.log(
    `Tenant Refúgio associado. Perfil legado ${result.legacyAdminFound ? 'encontrado' : 'não encontrado'}; ` +
      `novo vínculo ${result.membershipCreated ? 'criado' : 'não necessário'}.`,
  )
}

migrate()
  .catch(() => {
    console.error('Falha ao associar os dados existentes ao tenant Refúgio.')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
