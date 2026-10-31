import { NextResponse } from 'next/server'
import { requireCompanyAdmin } from '@/lib/admin-auth'
import { getMercadoPagoConnectionStatus, isMercadoPagoDevelopmentMockEnabled } from '@/lib/mercadopago'

export async function GET() {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const connection = await getMercadoPagoConnectionStatus(tenantId)
    return NextResponse.json({
      ...connection,
      developmentMockEnabled: isMercadoPagoDevelopmentMockEnabled(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
