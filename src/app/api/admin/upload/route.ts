import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import crypto from 'crypto'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo: 5MB.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${crypto.randomUUID()}.${ext}`

    // Vercel Blob: works in production (serverless)
    // Local filesystem: works in dev mode
    const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN

    if (useBlob) {
      // ── Vercel Blob (production) ──
      const blob = await put(`uploads/${filename}`, buffer, {
        contentType: file.type,
        access: 'public',
      })
      return NextResponse.json({ url: blob.url, filename })
    } else {
      // ── Local filesystem (development) ──
      const uploadDir = join(process.cwd(), 'public', 'images', 'uploads')
      await mkdir(uploadDir, { recursive: true })
      await writeFile(join(uploadDir, filename), buffer)

      const publicUrl = `/images/uploads/${filename}`
      return NextResponse.json({ url: publicUrl, filename })
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[UPLOAD ERROR]', msg)
    return NextResponse.json({ error: 'Erro no upload', debug: msg }, { status: 500 })
  }
}
