import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const { id } = await params
    const item = await db.faq.findFirst({ where: { id, tenantId } })
    if (!item) {
      return NextResponse.json({ error: 'FAQ não encontrada' }, { status: 404 })
    }
    return NextResponse.json(item)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const deleted = await db.faq.deleteMany({ where: { id, tenantId } })
    if (!deleted.count) return NextResponse.json({ error: 'FAQ não encontrada' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
