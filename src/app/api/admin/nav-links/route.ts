import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdmin()
    const links = await db.navLink.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json(links)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { links } = body as { links: Array<{ label: string; href: string; sortOrder: number }> }

    await db.$transaction(async (tx) => {
      await tx.navLink.deleteMany()
      if (links && links.length > 0) {
        await tx.navLink.createMany({ data: links })
      }
    })

    const result = await db.navLink.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
