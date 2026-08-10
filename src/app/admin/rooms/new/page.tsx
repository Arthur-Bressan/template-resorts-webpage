'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

const ICON_OPTIONS = [
  'BedDouble', 'Bath', 'Wifi', 'Trees', 'Mountain', 'Sparkles', 'AirVent', 'Wine',
  'Flame', 'Dog', 'CookingPot', 'Flower2', 'DoorOpen', 'Sun', 'Shirt', 'TreePine',
  'ShowerHead', 'Coffee', 'Car', 'Shield', 'Baby', 'Recycle', 'Spa', 'Waves',
]

export default function NewRoomPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [price, setPrice] = useState('')
  const [capacity, setCapacity] = useState('')
  const [size, setSize] = useState('')
  const [bedType, setBedType] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionLong, setDescriptionLong] = useState('')
  const [policy, setPolicy] = useState('')
  const [published, setPublished] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')
  const [images, setImages] = useState<Array<{ src: string; alt: string; sortOrder: number }>>([])
  const [amenities, setAmenities] = useState<Array<{ name: string; icon: string; sortOrder: number }>>([])

  const handleNameChange = (v: string) => {
    setName(v)
    setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
  }

  const addImage = () => setImages([...images, { src: '', alt: '', sortOrder: images.length }])
  const removeImage = (i: number) => setImages(images.filter((_, idx) => idx !== i))
  const updateImage = (i: number, field: string, value: string) => {
    setImages(images.map((img, idx) => (idx === i ? { ...img, [field]: value } : img)))
  }

  const addAmenity = () => setAmenities([...amenities, { name: '', icon: 'Sparkles', sortOrder: amenities.length }])
  const removeAmenity = (i: number) => setAmenities(amenities.filter((_, idx) => idx !== i))
  const updateAmenity = (i: number, field: string, value: string) => {
    setAmenities(amenities.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)))
  }

  const handleSave = async () => {
    if (!name || !slug) { toast.error('Nome e slug são obrigatórios'); return }
    setSaving(true)
    try {
      await adminApi.rooms.create({
        name, slug, price: parseFloat(price) || 0, capacity: parseInt(capacity) || 1,
        size: parseInt(size) || 0, bedType, description, descriptionLong, policy,
        published, sortOrder: parseInt(sortOrder) || 0, images, amenities,
      })
      toast.success('Quarto criado!')
      router.push('/admin/rooms')
    } catch {
      toast.error('Erro ao criar quarto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/rooms')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Novo Quarto</h2>
          <p className="text-sm text-gray-500">Preencha os dados da acomodação</p>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardHeader><CardTitle className="text-lg">Informações básicas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => handleNameChange(e.target.value)} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2"><Label>Preço (R$)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="space-y-2"><Label>Capacidade</Label><Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
            <div className="space-y-2"><Label>Tamanho (m²)</Label><Input type="number" value={size} onChange={(e) => setSize(e.target.value)} /></div>
            <div className="space-y-2"><Label>Tipo de Cama</Label><Input value={bedType} onChange={(e) => setBedType(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Descrição curta</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="space-y-2"><Label>Descrição longa</Label><Textarea value={descriptionLong} onChange={(e) => setDescriptionLong(e.target.value)} rows={6} /></div>
          <div className="space-y-2"><Label>Política</Label><Textarea value={policy} onChange={(e) => setPolicy(e.target.value)} rows={3} /></div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Label>Publicado</Label><Switch checked={published} onCheckedChange={setPublished} /></div>
            <div className="space-y-2"><Label>Ordem</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-24" /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Imagens</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addImage}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {images.length === 0 && <p className="text-sm text-gray-400">Nenhuma imagem adicionada</p>}
          {images.map((img, i) => (
            <div key={i} className="flex items-start gap-4 rounded-lg border border-gray-100 p-4">
              <div className="flex-1 space-y-3">
                <ImageUpload value={img.src} onChange={(url) => updateImage(i, 'src', url)} label="Imagem" />
                <div><Label className="text-xs">Texto alternativo</Label><Input value={img.alt} onChange={(e) => updateImage(i, 'alt', e.target.value)} placeholder="Descrição da imagem" /></div>
              </div>
              <Button variant="ghost" size="sm" className="mt-6 text-red-500" onClick={() => removeImage(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Comodidades</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addAmenity}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {amenities.length === 0 && <p className="text-sm text-gray-400">Nenhuma comodidade adicionada</p>}
          {amenities.map((a, i) => (
            <div key={i} className="flex items-center gap-3">
              <select
                value={a.icon}
                onChange={(e) => updateAmenity(i, 'icon', e.target.value)}
                className="h-9 w-40 rounded-md border border-gray-200 bg-white px-3 text-sm"
              >
                {ICON_OPTIONS.map((ic) => (
                  <option key={ic} value={ic}>{ic}</option>
                ))}
              </select>
              <Input value={a.name} onChange={(e) => updateAmenity(i, 'name', e.target.value)} placeholder="Nome da comodidade" className="flex-1" />
              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeAmenity(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/admin/rooms')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Criar Quarto'}</Button>
      </div>
    </div>
  )
}