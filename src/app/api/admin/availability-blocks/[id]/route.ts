import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
    const { id } = await params
    const deleted = await db.availabilityBlock.deleteMany({ where: { id, tenantId } })
    if (!deleted.count) return NextResponse.json({ error: 'Bloqueio não encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
