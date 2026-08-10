'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

const ICON_OPTIONS = [
  'Coffee', 'Waves', 'Wifi', 'Dog', 'Car', 'TreePine', 'Spa', 'Flame',
  'Wine', 'Shield', 'Baby', 'Recycle', 'BedDouble', 'Bath', 'Mountain', 'Sparkles',
]

interface AboutData {
  amenities: Array<{ id?: string; icon: string; label: string; desc: string; sortOrder: number }>
  distances: Array<{ id?: string; place: string; distance: string; time: string; sortOrder: number }>
  directions: Array<{ id?: string; city: string; route: string; type: string; sortOrder: number }>
  sensory: { title: string; paragraphs: string[] }
  stats: Array<{ id?: string; value: number; suffix: string; label: string; sortOrder: number }>
}

const defaultAbout: AboutData = {
  amenities: [],
  distances: [],
  directions: [],
  sensory: { title: '', paragraphs: [] },
  stats: [],
}

export default function AboutEditorPage() {
  const [data, setData] = useState<AboutData>(defaultAbout)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminApi.about.get()
      .then((res) => { if (res) setData(res) })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.about.update(data)
      toast.success('Página Sobre atualizada!')
    } catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  const updateAmenities = (val: AboutData['amenities']) => setData({ ...data, amenities: val })
  const updateDistances = (val: AboutData['distances']) => setData({ ...data, distances: val })
  const updateDirections = (val: AboutData['directions']) => setData({ ...data, directions: val })
  const updateSensory = (val: AboutData['sensory']) => setData({ ...data, sensory: val })
  const updateStats = (val: AboutData['stats']) => setData({ ...data, stats: val })

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Página Sobre</h2>
        <p className="text-sm text-gray-500">Edite o conteúdo da página &quot;Sobre a Pousada&quot;</p>
      </div>

      <Tabs defaultValue="amenities">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="amenities">Comodidades</TabsTrigger>
          <TabsTrigger value="distances">Distâncias</TabsTrigger>
          <TabsTrigger value="directions">Direções</TabsTrigger>
          <TabsTrigger value="sensory">Sensorial</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="amenities">
          <Card className="border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Comodidades</CardTitle>
              <Button size="sm" variant="outline" onClick={() => updateAmenities([...data.amenities, { icon: 'Sparkles', label: '', desc: '', sortOrder: data.amenities.length }])}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.amenities.length === 0 && <p className="text-sm text-gray-400">Nenhuma comodidade</p>}
              {data.amenities.map((a, i) => (
                <div key={a.id || i} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
                  <select
                    value={a.icon}
                    onChange={(e) => { const n = [...data.amenities]; n[i] = { ...n[i], icon: e.target.value }; updateAmenities(n) }}
                    className="h-9 w-36 shrink-0 rounded-md border border-gray-200 bg-white px-3 text-sm"
                  >
                    {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <div className="flex-1 space-y-2">
                    <Input value={a.label} onChange={(e) => { const n = [...data.amenities]; n[i] = { ...n[i], label: e.target.value }; updateAmenities(n) }} placeholder="Rótulo" />
                    <Input value={a.desc} onChange={(e) => { const n = [...data.amenities]; n[i] = { ...n[i], desc: e.target.value }; updateAmenities(n) }} placeholder="Descrição" />
                  </div>
                  <Button variant="ghost" size="sm" className="mt-1 text-red-500" onClick={() => updateAmenities(data.amenities.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distances">
          <Card className="border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Distâncias</CardTitle>
              <Button size="sm" variant="outline" onClick={() => updateDistances([...data.distances, { place: '', distance: '', time: '', sortOrder: data.distances.length }])}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.distances.length === 0 && <p className="text-sm text-gray-400">Nenhuma distância</p>}
              {data.distances.map((d, i) => (
                <div key={d.id || i} className="flex items-center gap-3">
                  <Input value={d.place} onChange={(e) => { const n = [...data.distances]; n[i] = { ...n[i], place: e.target.value }; updateDistances(n) }} placeholder="Local" className="flex-1" />
                  <Input value={d.distance} onChange={(e) => { const n = [...data.distances]; n[i] = { ...n[i], distance: e.target.value }; updateDistances(n) }} placeholder="12 km" className="w-28" />
                  <Input value={d.time} onChange={(e) => { const n = [...data.distances]; n[i] = { ...n[i], time: e.target.value }; updateDistances(n) }} placeholder="20 min" className="w-28" />
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => updateDistances(data.distances.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directions">
          <Card className="border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Como Chegar</CardTitle>
              <Button size="sm" variant="outline" onClick={() => updateDirections([...data.directions, { city: '', route: '', type: 'carro', sortOrder: data.directions.length }])}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.directions.length === 0 && <p className="text-sm text-gray-400">Nenhuma direção</p>}
              {data.directions.map((d, i) => (
                <div key={d.id || i} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="w-36 space-y-2">
                    <Input value={d.city} onChange={(e) => { const n = [...data.directions]; n[i] = { ...n[i], city: e.target.value }; updateDirections(n) }} placeholder="Cidade" />
                    <select
                      value={d.type}
                      onChange={(e) => { const n = [...data.directions]; n[i] = { ...n[i], type: e.target.value }; updateDirections(n) }}
                      className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                    >
                      <option value="carro">Carro</option>
                      <option value="ônibus">Ônibus</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <Textarea value={d.route} onChange={(e) => { const n = [...data.directions]; n[i] = { ...n[i], route: e.target.value }; updateDirections(n) }} placeholder="Rota" rows={2} />
                  </div>
                  <Button variant="ghost" size="sm" className="mt-1 text-red-500" onClick={() => updateDirections(data.directions.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensory">
          <Card className="border border-gray-200">
            <CardHeader><CardTitle className="text-lg">Experiência Sensorial</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Título</Label><Input value={data.sensory.title} onChange={(e) => updateSensory({ ...data.sensory, title: e.target.value })} /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Parágrafos</Label>
                  <Button size="sm" variant="outline" onClick={() => updateSensory({ ...data.sensory, paragraphs: [...data.sensory.paragraphs, ''] })}>
                    <Plus className="mr-1 h-4 w-4" /> Parágrafo
                  </Button>
                </div>
                {data.sensory.paragraphs.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Textarea value={p} onChange={(e) => { const n = [...data.sensory.paragraphs]; n[i] = e.target.value; updateSensory({ ...data.sensory, paragraphs: n }) }} rows={3} className="flex-1" />
                    <Button variant="ghost" size="sm" className="mt-1 text-red-500" onClick={() => updateSensory({ ...data.sensory, paragraphs: data.sensory.paragraphs.filter((_, idx) => idx !== i) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Estatísticas</CardTitle>
              <Button size="sm" variant="outline" onClick={() => updateStats([...data.stats, { value: 0, suffix: '', label: '', sortOrder: data.stats.length }])}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.stats.length === 0 && <p className="text-sm text-gray-400">Nenhuma estatística</p>}
              {data.stats.map((s, i) => (
                <div key={s.id || i} className="flex items-center gap-3">
                  <Input type="number" value={s.value} onChange={(e) => { const n = [...data.stats]; n[i] = { ...n[i], value: parseInt(e.target.value) || 0 }; updateStats(n) }} className="w-24" />
                  <Input value={s.suffix} onChange={(e) => { const n = [...data.stats]; n[i] = { ...n[i], suffix: e.target.value }; updateStats(n) }} placeholder="%" className="w-16" />
                  <Input value={s.label} onChange={(e) => { const n = [...data.stats]; n[i] = { ...n[i], label: e.target.value }; updateStats(n) }} placeholder="Rótulo" className="flex-1" />
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => updateStats(data.stats.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Tudo'}</Button>
      </div>
    </div>
  )
}