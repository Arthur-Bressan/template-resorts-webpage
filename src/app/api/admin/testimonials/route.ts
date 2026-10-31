import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const items = await db.testimonial.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } })
    return NextResponse.json(items)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const body = await request.json()
    const item = await db.testimonial.create({ data: {
      name: body.name,
      location: body.location,
      avatar: body.avatar,
      text: body.text,
      rating: body.rating,
      sortOrder: body.sortOrder,
      published: body.published,
      tenantId,
    } })
    return NextResponse.json(item, { status: 201 })
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
    const { id } = body
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }
    const data = {
      name: body.name,
      location: body.location,
      avatar: body.avatar,
      text: body.text,
      rating: body.rating,
      sortOrder: body.sortOrder,
      published: body.published,
    }
    const result = await db.testimonial.updateMany({ where: { id, tenantId }, data })
    if (!result.count) return NextResponse.json({ error: 'Depoimento não encontrado' }, { status: 404 })
    const item = await db.testimonial.findFirst({ where: { id, tenantId } })
    return NextResponse.json(item)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
