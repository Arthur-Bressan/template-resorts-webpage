import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyAdminErrorResponse, requireCompanyAdmin } from '@/lib/admin-auth'

const LEAD_STATUSES = ['new', 'contacted', 'converted', 'closed'] as const
type LeadStatus = typeof LEAD_STATUSES[number]

function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && LEAD_STATUSES.includes(value as LeadStatus)
}

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireCompanyAdmin()
    const { searchParams } = new URL(request.url)
    const page = positiveInteger(searchParams.get('page'), 1, 100000)
    const limit = positiveInteger(searchParams.get('limit'), 50, 100)
    const skip = (page - 1) * limit
    const unreadOnly = searchParams.get('unread') === 'true'
    const requestedStatus = searchParams.get('status')
    if (requestedStatus && requestedStatus !== 'all' && !isLeadStatus(requestedStatus)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const where = {
      tenantId,
      ...(unreadOnly ? { read: false } : {}),
      ...(requestedStatus && requestedStatus !== 'all' ? { status: requestedStatus } : {}),
    }

    const [items, total] = await Promise.all([
      db.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.contactSubmission.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit })
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await requireCompanyAdmin({ requireWriteAccess: true })
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
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    const data: { read?: boolean; status?: LeadStatus } = {}
    if (typeof body.read === 'boolean') data.read = body.read
    if (body.status !== undefined) {
      if (body.status === 'converted') return NextResponse.json({ error: 'Lead conversion must create a reservation with availability validation.' }, { status: 409 })
      if (!isLeadStatus(body.status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
      data.status = body.status
    }
    if (!Object.keys(data).length) return NextResponse.json({ error: 'Nenhuma alteração informada' }, { status: 400 })

    const result = await db.contactSubmission.updateMany({
      where: { id, tenantId },
      data,
    })
    if (!result.count) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
    }
    const item = await db.contactSubmission.findFirst({ where: { id, tenantId } })
    return NextResponse.json(item)
  } catch (error) {
    const authResponse = companyAdminErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
