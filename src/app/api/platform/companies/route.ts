import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPlatformBaseDomain, isValidTenantSlug } from '@/lib/tenant-context'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { sendTransactionalEmail } from '@/lib/email'

const DEFAULT_NAV_LINKS = [
  { label: 'Sobre', href: '/sobre', sortOrder: 0 },
  { label: 'Acomodações', href: '#rooms', sortOrder: 1 },
  { label: 'Experiências', href: '#experiences', sortOrder: 2 },
  { label: 'Galeria', href: '#gallery', sortOrder: 3 },
  { label: 'Localização', href: '#location', sortOrder: 4 },
  { label: 'Depoimentos', href: '#testimonials', sortOrder: 5 },
  { label: 'FAQ', href: '#faq', sortOrder: 6 },
]

class ProvisioningError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/g, '')
}

function hashInvitationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function invitationUrl(token: string, baseDomain: string): string {
  const protocol = baseDomain === 'localhost' ? 'http' : 'https'
  const port = baseDomain === 'localhost' ? ':3000' : ''
  const url = new URL(`${protocol}://${baseDomain}${port}/admin/login`)
  url.searchParams.set('invite', token)
  return url.toString()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function newInvitationToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

async function deliverInvitation(input: {
  email: string
  companyName: string
  token: string
  baseDomain: string
}): Promise<boolean> {
  const url = invitationUrl(input.token, input.baseDomain)
  const safeName = escapeHtml(input.companyName)
  const result = await sendTransactionalEmail({
    to: input.email,
    subject: 'Defina a senha do seu acesso à plataforma',
    text: `Olá! Use este link para definir a senha de administrador de ${input.companyName}. O convite expira em 48 horas: ${url}`,
    html: `<p>Olá!</p><p>Use o link abaixo para definir a senha de administrador de <strong>${safeName}</strong>. O convite expira em 48 horas.</p><p><a href="${url}">Definir senha</a></p>`,
  })
  return result.sent
}

export async function GET() {
  try {
    await requirePlatformAdmin()
    const companies = await db.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: {
          include: { admin: { select: { name: true, email: true } } },
        },
      },
    })
    return NextResponse.json({
      companies: companies.map((company) => ({
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status,
        createdAt: company.createdAt,
        admin: company.memberships[0]?.admin ?? null,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const baseDomain = getPlatformBaseDomain()
  if (!baseDomain) {
    return NextResponse.json(
      { error: 'Configure PLATFORM_BASE_DOMAIN com um domínio válido antes de cadastrar empresas' },
      { status: 503 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const adminName = typeof body.adminName === 'string' ? body.adminName.trim() : ''
  if (
    !name ||
    name.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(name) ||
    adminName.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(adminName) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    return NextResponse.json({ error: 'Informe nome da empresa e e-mail válido do administrador' }, { status: 400 })
  }

  const explicitSlug = typeof body.slug === 'string' && body.slug.trim().length > 0
  const requestedSlug = slugify(explicitSlug ? String(body.slug) : name)
  if (!isValidTenantSlug(requestedSlug)) {
    return NextResponse.json({ error: 'O subdomínio informado não é válido ou está reservado' }, { status: 400 })
  }

  const token = newInvitationToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  try {
    const provisioned = await db.$transaction(async (tx) => {
      const existingAdmin = await tx.admin.findUnique({ where: { email } })
      if (existingAdmin) {
        const adminMemberships = await tx.companyMembership.findMany({
          where: { adminId: existingAdmin.id },
          include: { tenant: true },
        })
        if (adminMemberships.length !== 1 || adminMemberships[0].role !== 'admin') {
          throw new ProvisioningError('Este e-mail já está cadastrado', 409)
        }
        const membership = adminMemberships[0]
        const tenantMemberships = await tx.companyMembership.findMany({
          where: { tenantId: membership.tenantId },
          select: { adminId: true },
        })
        if (tenantMemberships.length !== 1 || tenantMemberships[0].adminId !== existingAdmin.id) {
          throw new ProvisioningError('A associação da empresa precisa de revisão', 409)
        }

        if (existingAdmin.password) {
          await tx.adminInvitation.updateMany({
            where: { adminId: existingAdmin.id, usedAt: null, revokedAt: null },
            data: { revokedAt: now },
          })
          return {
            company: membership.tenant,
            admin: existingAdmin,
            inviteToken: null as string | null,
            created: false,
          }
        }

        await tx.adminInvitation.updateMany({
          where: { adminId: existingAdmin.id, usedAt: null, revokedAt: null },
          data: { revokedAt: now },
        })
        await tx.adminInvitation.create({
          data: {
            adminId: existingAdmin.id,
            tenantId: membership.tenantId,
            tokenHash: hashInvitationToken(token),
            expiresAt,
          },
        })
        return {
          company: membership.tenant,
          admin: existingAdmin,
          inviteToken: token,
          created: false,
        }
      }

      let slug = requestedSlug
      if (explicitSlug) {
        const slugOwner = await tx.company.findUnique({ where: { slug } })
        if (slugOwner) throw new ProvisioningError('Este subdomínio já está em uso', 409)
      } else {
        let suffix = 2
        while (await tx.company.findUnique({ where: { slug } })) {
          const suffixText = `-${suffix}`
          slug = `${requestedSlug.slice(0, 63 - suffixText.length).replace(/-+$/g, '')}${suffixText}`
          suffix += 1
        }
      }

      const company = await tx.company.create({
        data: { name, slug, status: 'active' },
      })
      await tx.siteSetting.create({
        data: {
          tenantId: company.id,
          name,
          tagline: 'Uma hospedagem feita para receber bem',
          description: '',
          email: '',
          phone: '',
          whatsapp: '',
          address: '',
          lat: 0,
          lng: 0,
          logo: '/logo.svg',
          heroImage: '/images/hero.jpg',
          ogImage: '/logo.svg',
          metaTitle: name,
          metaDescription: '',
        },
      })
      await tx.navLink.createMany({
        data: DEFAULT_NAV_LINKS.map((link) => ({ ...link, tenantId: company.id })),
      })

      const admin = await tx.admin.create({
        data: {
          email,
          name: adminName || email.split('@')[0],
          password: null,
          role: 'admin',
        },
      })
      const [adminMemberships, tenantMemberships] = await Promise.all([
        tx.companyMembership.findMany({ where: { adminId: admin.id }, select: { id: true } }),
        tx.companyMembership.findMany({ where: { tenantId: company.id }, select: { id: true } }),
      ])
      if (adminMemberships.length > 0 || tenantMemberships.length > 0) {
        throw new ProvisioningError('O perfil ou a empresa já possui uma associação', 409)
      }
      await tx.companyMembership.create({
        data: { adminId: admin.id, tenantId: company.id, role: 'admin' },
      })
      await tx.adminInvitation.create({
        data: {
          adminId: admin.id,
          tenantId: company.id,
          tokenHash: hashInvitationToken(token),
          expiresAt,
        },
      })

      return { company, admin, inviteToken: token, created: true }
    })

    let invitationSent = false
    if (provisioned.inviteToken) {
      invitationSent = await deliverInvitation({
        email,
        companyName: provisioned.company.name,
        token: provisioned.inviteToken,
        baseDomain,
      })
      if (!invitationSent) {
        console.warn('[PLATFORM] O convite foi criado, mas o provedor de e-mail não confirmou o envio')
      }
    }

    return NextResponse.json(
      {
        company: {
          id: provisioned.company.id,
          name: provisioned.company.name,
          slug: provisioned.company.slug,
          status: provisioned.company.status,
        },
        invitationSent,
        created: provisioned.created,
      },
      { status: provisioned.created ? 201 : 200 },
    )
  } catch (error) {
    if (error instanceof ProvisioningError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PLATFORM] Não foi possível provisionar a empresa')
    return NextResponse.json({ error: 'Não foi possível cadastrar a empresa' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id : ''
  const slug = typeof body.slug === 'string' ? slugify(body.slug) : ''
  if (!id || !isValidTenantSlug(slug)) {
    return NextResponse.json({ error: 'Empresa ou subdomínio inválido' }, { status: 400 })
  }

  try {
    const company = await db.company.update({
      where: { id },
      data: { slug },
      select: { id: true, name: true, slug: true, status: true },
    })
    return NextResponse.json({ company })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Este subdomínio já está em uso' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Não foi possível atualizar o subdomínio' }, { status: 404 })
  }
}
