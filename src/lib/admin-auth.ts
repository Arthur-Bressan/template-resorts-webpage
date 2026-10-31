import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { assertCompanyWriteAccess, type CompanyWriteAccess } from '@/lib/company-subscription-access'

export class CompanyWriteRestrictedError extends Error {
  readonly code = 'COMPANY_SUBSCRIPTION_RESTRICTED'
  readonly statusCode = 403
  readonly access: CompanyWriteAccess

  constructor(access: CompanyWriteAccess) {
    super('Company subscription does not allow writes')
    this.name = 'CompanyWriteRestrictedError'
    this.access = access
  }
}

export function companyAdminErrorResponse(error: unknown) {
  if (error instanceof CompanyWriteRestrictedError) {
    return NextResponse.json(
      {
        error: 'A assinatura da hospedagem n\u00e3o permite altera\u00e7\u00f5es neste momento.',
        code: error.code,
        subscriptionStatus: error.access.status,
        accessUntilAt: error.access.accessUntilAt?.toISOString() ?? null,
      },
      { status: error.statusCode },
    )
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'N\u00e3o autorizado' }, { status: 401 })
  }
  return null
}

export async function getAdminSession() {
  const headersList = await headers()
  const authorization = headersList.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const payload = verifyToken(authorization.slice('Bearer '.length))
  if (!payload || typeof payload.id !== 'string') return null

  return db.admin.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, name: true, role: true },
  })
}

export async function requireCompanyAdmin(options: { requireWriteAccess?: boolean } = {}) {
  const admin = await getAdminSession()
  if (!admin) throw new Error('Unauthorized')

  const memberships = await db.companyMembership.findMany({
    where: { adminId: admin.id },
    select: {
      tenantId: true,
      role: true,
      tenant: { select: { id: true, name: true, slug: true, status: true } },
    },
  })
  if (memberships.length !== 1 || memberships[0].role !== 'admin') {
    throw new Error('Unauthorized')
  }
  const membership = memberships[0]
  const tenantMembershipCount = await db.companyMembership.count({
    where: { tenantId: membership.tenantId },
  })
  if (tenantMembershipCount !== 1) throw new Error('Unauthorized')

  if (options.requireWriteAccess) {
    try {
      await assertCompanyWriteAccess(membership.tenantId)
    } catch (error) {
      if (error instanceof Error && error.name === 'CompanyWriteRestrictedError' && 'access' in error) {
        throw new CompanyWriteRestrictedError(error.access as CompanyWriteAccess)
      }
      throw error
    }
  }

  return {
    admin,
    tenant: membership.tenant,
    tenantId: membership.tenantId,
  }
}

// Kept as a compatibility boundary for existing admin handlers. New handlers
// should use requireCompanyAdmin() and scope their queries with tenantId.
export async function requireAdmin() {
  const { admin } = await requireCompanyAdmin()
  return admin
}
