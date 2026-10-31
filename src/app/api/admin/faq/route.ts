import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const items = await db.faq.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } })
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
    const item = await db.faq.create({ data: {
      question: body.question,
      answer: body.answer,
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
      question: body.question,
      answer: body.answer,
      sortOrder: body.sortOrder,
      published: body.published,
    }
    const result = await db.faq.updateMany({ where: { id, tenantId }, data })
    if (!result.count) return NextResponse.json({ error: 'FAQ não encontrada' }, { status: 404 })
    const item = await db.faq.findFirst({ where: { id, tenantId } })
    return NextResponse.json(item)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
