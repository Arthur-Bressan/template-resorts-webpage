import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'

function parsePayload(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return { title: 'Notificação', message: '' }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const { searchParams } = new URL(request.url)
    const parsedPage = Number.parseInt(searchParams.get('page') || '', 10)
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1
    const unreadOnly = searchParams.get('unread') === 'true'
    const where = { tenantId, ...(unreadOnly ? { readAt: null } : {}) }

    const [items, total, unreadCount] = await Promise.all([
      db.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 100, take: 100 }),
      db.notification.count({ where }),
      db.notification.count({ where: { tenantId, readAt: null } }),
    ])

    return NextResponse.json({
      items: items.map(({ payload, ...item }) => ({ ...item, payload: parsePayload(payload) })),
      total,
      page,
      unreadCount,
    })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await requireCompanyAdmin()
    let body: Record<string, unknown>
    try {
      const parsed = await request.json()
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
      }
      body = parsed as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const read = body.read === undefined ? true : body.read === true
    if (!id || (body.read !== undefined && typeof body.read !== 'boolean')) {
      return NextResponse.json({ error: 'Informe uma notificação e um estado de leitura válidos' }, { status: 400 })
    }

    const result = await db.notification.updateMany({
      where: { id, tenantId },
      data: { readAt: read ? new Date() : null },
    })
    if (!result.count) return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 })

    const item = await db.notification.findFirst({ where: { id, tenantId } })
    return NextResponse.json(item ? { ...item, payload: parsePayload(item.payload) } : null)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
