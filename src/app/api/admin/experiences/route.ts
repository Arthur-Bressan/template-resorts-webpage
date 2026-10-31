import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const items = await db.experience.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } })
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
    const item = await db.experience.create({ data: {
      title: body.title,
      description: body.description,
      image: body.image,
      duration: body.duration,
      difficulty: body.difficulty,
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
      title: body.title,
      description: body.description,
      image: body.image,
      duration: body.duration,
      difficulty: body.difficulty,
      sortOrder: body.sortOrder,
      published: body.published,
    }
    const result = await db.experience.updateMany({ where: { id, tenantId }, data })
    if (!result.count) return NextResponse.json({ error: 'Experiência não encontrada' }, { status: 404 })
    const item = await db.experience.findFirst({ where: { id, tenantId } })
    return NextResponse.json(item)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
