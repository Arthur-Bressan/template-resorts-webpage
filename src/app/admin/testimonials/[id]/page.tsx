'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

interface TestimonialData {
  id: string
  name: string
  location: string
  avatar: string
  text: string
  rating: number
  published: boolean
  sortOrder: number
}

export default function EditTestimonialPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isNew, setIsNew] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [avatar, setAvatar] = useState('')
  const [text, setText] = useState('')
  const [rating, setRating] = useState(5)
  const [published, setPublished] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')

  useEffect(() => {
    if (id === 'new') {
      setIsNew(true)
      setLoading(false)
      return
    }
    adminApi.testimonials.get(id)
      .then((res: TestimonialData) => {
        if (res) {
          setName(res.name || '')
          setLocation(res.location || '')
          setAvatar(res.avatar || '')
          setText(res.text || '')
          setRating(res.rating ?? 5)
          setPublished(res.published ?? true)
          setSortOrder(String(res.sortOrder ?? 0))
        }
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!name || !text) { toast.error('Nome e texto são obrigatórios'); return }
    setSaving(true)
    const data = { name, location, avatar, text, rating, published, sortOrder: parseInt(sortOrder) || 0 }
    try {
      if (isNew) {
        await adminApi.testimonials.create(data)
        toast.success('Depoimento criado!')
      } else {
        await adminApi.testimonials.update(id, data)
        toast.success('Depoimento atualizado!')
      }
      router.push('/admin/testimonials')
    } catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/testimonials')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{isNew ? 'Novo Depoimento' : 'Editar Depoimento'}</h2>
          <p className="text-sm text-gray-500">{isNew ? 'Adicione uma avaliação' : 'Modifique os dados'}</p>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardHeader><CardTitle className="text-lg">Dados do depoimento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Localização</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="São Paulo, SP" /></div>
          </div>
          <ImageUpload value={avatar} onChange={setAvatar} label="Avatar" />
          <div className="space-y-2"><Label>Texto</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} /></div>
          <div className="space-y-2">
            <Label>Avaliação</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} className="text-2xl">
                  <span className={star <= rating ? 'text-amber-400' : 'text-gray-200'}>★</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Label>Publicado</Label><Switch checked={published} onCheckedChange={setPublished} /></div>
            <div className="space-y-2"><Label>Ordem</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-24" /></div>
          </div>
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/admin/testimonials')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : isNew ? 'Criar' : 'Salvar'}</Button>
      </div>
    </div>
  )
}