import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const image = await db.uploadedImage.findUnique({
      where: { id },
      select: { data: true, mimeType: true, filename: true, size: true },
    })

    if (!image) {
      return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 })
    }

    const buffer = Buffer.from(image.data, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': image.mimeType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${image.filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar imagem' }, { status: 500 })
  }
}
