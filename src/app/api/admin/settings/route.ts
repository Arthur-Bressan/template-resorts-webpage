import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'
import { getDefaultSiteSettings } from '@/lib/data'

const editableFields = [
  'name', 'tagline', 'description', 'phone', 'whatsapp', 'email', 'address', 'lat', 'lng',
  'instagram', 'facebook', 'tripadvisor', 'logo', 'heroImage', 'ogImage', 'metaTitle',
  'metaDescription', 'googleAnalyticsId', 'googleMapsApiKey',
] as const

export async function GET() {
  try {
    const { tenant, tenantId } = await requireCompanyAdmin()
    const settings = await db.siteSetting.findFirst({ where: { tenantId } })
    return NextResponse.json(settings || getDefaultSiteSettings(tenant.name, tenantId))
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenant, tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const body = await request.json()
    const data = Object.fromEntries(
      editableFields.flatMap((field) => field in body ? [[field, body[field]]] : []),
    )
    const existing = await db.siteSetting.findFirst({ where: { tenantId }, select: { id: true } })
    let settings
    if (existing) {
      const updated = await db.siteSetting.updateMany({ where: { id: existing.id, tenantId }, data })
      if (!updated.count) return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 })
      settings = await db.siteSetting.findFirst({ where: { id: existing.id, tenantId } })
    } else {
      const { id: defaultId, updatedAt: defaultUpdatedAt, ...defaults } = getDefaultSiteSettings(tenant.name)
      void defaultId
      void defaultUpdatedAt
      settings = await db.siteSetting.create({
        data: { ...defaults, ...data, tenantId },
      })
    }
    return NextResponse.json(settings)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
