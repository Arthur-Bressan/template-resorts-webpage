import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const links = await db.navLink.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } })
    return NextResponse.json(links)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const body = await request.json()
    const { links } = body as { links: Array<{ label: string; href: string; sortOrder: number }> }

    await db.$transaction(async (tx) => {
      await tx.navLink.deleteMany({ where: { tenantId } })
      if (Array.isArray(links) && links.length > 0) {
        await tx.navLink.createMany({
          data: links.map((link: { label: string; href: string; sortOrder: number }) => ({
            label: link.label,
            href: link.href,
            sortOrder: link.sortOrder,
            tenantId,
          })),
        })
      }
    })

    const result = await db.navLink.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } })
    return NextResponse.json(result)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
