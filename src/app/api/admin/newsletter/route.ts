import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireCompanyAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const { searchParams } = new URL(request.url)
    const parsedPage = Number.parseInt(searchParams.get('page') || '', 10)
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '', 10)
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 50
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      db.newsletterSubscriber.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.newsletterSubscriber.count({ where: { tenantId } }),
    ])

    return NextResponse.json({ items, total, page, limit })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
