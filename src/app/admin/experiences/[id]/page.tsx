'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
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

interface ExpData {
  id: string
  title: string
  description: string
  image: string
  duration: string
  difficulty: string
  published: boolean
  sortOrder: number
}

export default function EditExperiencePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isNew, setIsNew] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const [duration, setDuration] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [published, setPublished] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')

  useEffect(() => {
    if (id === 'new') {
      setIsNew(true)
      setLoading(false)
      return
    }
    adminApi.experiences.get(id)
      .then((res: ExpData) => {
        if (res) {
          setTitle(res.title || '')
          setDescription(res.description || '')
          setImage(res.image || '')
          setDuration(res.duration || '')
          setDifficulty(res.difficulty || '')
          setPublished(res.published ?? true)
          setSortOrder(String(res.sortOrder ?? 0))
        }
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!title) { toast.error('Título é obrigatório'); return }
    setSaving(true)
    const data = { title, description, image, duration, difficulty, published, sortOrder: parseInt(sortOrder) || 0 }
    try {
      if (isNew) {
        await adminApi.experiences.create(data)
        toast.success('Experiência criada!')
      } else {
        await adminApi.experiences.update(id, data)
        toast.success('Experiência atualizada!')
      }
      router.push('/admin/experiences')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/experiences')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{isNew ? 'Nova Experiência' : 'Editar Experiência'}</h2>
          <p className="text-sm text-gray-500">{isNew ? 'Crie uma nova experiência' : 'Modifique os dados'}</p>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardHeader><CardTitle className="text-lg">Dados da experiência</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} /></div>
          <ImageUpload value={image} onChange={setImage} label="Imagem" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Duração</Label><Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="2-4 horas" /></div>
            <div className="space-y-2"><Label>Dificuldade</Label><Input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="Fácil a Moderado" /></div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Label>Publicado</Label><Switch checked={published} onCheckedChange={setPublished} /></div>
            <div className="space-y-2"><Label>Ordem</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-24" /></div>
          </div>
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/admin/experiences')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : isNew ? 'Criar' : 'Salvar'}</Button>
      </div>
    </div>
  )
}
