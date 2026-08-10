import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const rooms = await db.room.findMany({
    where: { published: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      capacity: true,
      size: true,
      bedType: true,
      description: true,
    },
  })
  return NextResponse.json(rooms)
}
