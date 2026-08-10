'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'
import { Upload, X, ImageIcon } from 'lucide-react'

// ─── Hero Image Upload (large banner preview) ───
function HeroImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [mode, setMode] = useState<'url' | 'file'>('url')
  const [urlInput, setUrlInput] = useState(value || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim())
      setError('')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const res = await adminApi.upload(file)
      const url = res?.url || res?.src || ''
      if (url) {
        onChange(url)
        setUrlInput(url)
      } else {
        setError('Upload retornou sem URL')
      }
    } catch {
      setError('Falha no upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Large banner preview */}
      {value ? (
        <div className="relative group overflow-hidden rounded-xl border border-gray-200">
          <div className="relative w-full aspect-[16/7] bg-gray-100">
            <img
              src={value}
              alt="Preview do Hero"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs text-white">
                Mata Atlântica — Cunha, SP
              </span>
            </div>
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <label className="cursor-pointer rounded-lg bg-white/90 backdrop-blur-sm p-1.5 text-gray-700 hover:bg-white shadow-sm">
                <Upload className="h-4 w-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
              </label>
              <button
                type="button"
                onClick={() => { onChange(''); setUrlInput('') }}
                className="rounded-lg bg-red-500/90 backdrop-blur-sm p-1.5 text-white hover:bg-red-600 shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full aspect-[16/7] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors">
          <ImageIcon className="h-8 w-8 text-gray-400" />
          <span className="text-sm text-gray-500">Nenhuma imagem de hero definida</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button type="button" variant={mode === 'url' ? 'default' : 'outline'} size="sm" onClick={() => setMode('url')}>
          URL
        </Button>
        <Button type="button" variant={mode === 'file' ? 'default' : 'outline'} size="sm" onClick={() => setMode('file')}>
          <Upload className="mr-1 h-3 w-3" />
          Upload
        </Button>
      </div>

      {mode === 'url' ? (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://exemplo.com/imagem-hero.jpg"
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button type="button" size="sm" onClick={handleUrlSubmit}>Aplicar</Button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 p-3 hover:border-gray-400 transition-colors">
          <ImageIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-500">
            {uploading ? 'Enviando...' : 'Clique para selecionar uma imagem (recomendado: 1344×768)'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

interface SiteSettings {
  id: string
  name: string
  tagline: string
  description: string
  phone: string
  whatsapp: string
  email: string
  address: string
  lat: number
  lng: number
  instagram: string
  facebook: string
  tripadvisor: string
  logo: string
  heroImage: string
  ogImage: string
  metaTitle: string
  metaDescription: string
  googleAnalyticsId: string
  googleMapsApiKey: string
}

const defaults: SiteSettings = {
  id: 'main', name: '', tagline: '', description: '', phone: '', whatsapp: '',
  email: '', address: '', lat: -23.18, lng: -44.92, instagram: '', facebook: '',
  tripadvisor: '', logo: '', heroImage: '', ogImage: '', metaTitle: '', metaDescription: '',
  googleAnalyticsId: '', googleMapsApiKey: '',
}

export default function SettingsPage() {
  const [data, setData] = useState<SiteSettings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminApi.settings.get()
      .then((res) => { if (res) setData(res) })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.settings.update(data)
      toast.success('Configurações salvas!')
    } catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  const set = (field: keyof SiteSettings, value: string | number) => setData({ ...data, [field]: value })

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Configurações</h2>
        <p className="text-sm text-gray-500">Configurações gerais do site</p>
      </div>

      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="brand">Marca</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card className="border border-gray-200">
            <CardHeader><CardTitle className="text-lg">Informações Básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Nome do site</Label><Input value={data.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div className="space-y-2"><Label>Tagline</Label><Input value={data.tagline} onChange={(e) => set('tagline', e.target.value)} /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={data.description} onChange={(e) => set('description', e.target.value)} rows={3} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card className="border border-gray-200">
            <CardHeader><CardTitle className="text-lg">Informações de Contato</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Telefone</Label><Input value={data.phone} onChange={(e) => set('phone', e.target.value)} /></div>
                <div className="space-y-2"><Label>WhatsApp</Label><Input value={data.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={data.email} onChange={(e) => set('email', e.target.value)} /></div>
              <div className="space-y-2"><Label>Endereço</Label><Input value={data.address} onChange={(e) => set('address', e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Latitude</Label><Input type="number" step="any" value={data.lat} onChange={(e) => set('lat', parseFloat(e.target.value) || 0)} /></div>
                <div className="space-y-2"><Label>Longitude</Label><Input type="number" step="any" value={data.lng} onChange={(e) => set('lng', parseFloat(e.target.value) || 0)} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card className="border border-gray-200">
            <CardHeader><CardTitle className="text-lg">Redes Sociais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Instagram</Label><Input value={data.instagram} onChange={(e) => set('instagram', e.target.value)} /></div>
              <div className="space-y-2"><Label>Facebook</Label><Input value={data.facebook} onChange={(e) => set('facebook', e.target.value)} /></div>
              <div className="space-y-2"><Label>TripAdvisor</Label><Input value={data.tripadvisor} onChange={(e) => set('tripadvisor', e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand">
          <Card className="border border-gray-200">
            <CardHeader><CardTitle className="text-lg">Marca</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <ImageUpload value={data.logo} onChange={(url) => set('logo', url)} label="Logo" />
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Imagem do Hero
                  <span className="ml-1 text-xs font-normal text-gray-400">(banner principal do topo do site)</span>
                </p>
                <HeroImageUpload value={data.heroImage} onChange={(url) => set('heroImage', url)} />
              </div>
              <Separator />
              <ImageUpload value={data.ogImage} onChange={(url) => set('ogImage', url)} label="Imagem OG (compartilhamento)" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card className="border border-gray-200">
            <CardHeader><CardTitle className="text-lg">SEO e Analytics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Meta Title</Label><Input value={data.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} /></div>
              <div className="space-y-2"><Label>Meta Description</Label><Textarea value={data.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} rows={3} /></div>
              <div className="space-y-2"><Label>Google Analytics ID</Label><Input value={data.googleAnalyticsId} onChange={(e) => set('googleAnalyticsId', e.target.value)} placeholder="G-XXXXXXXXXX" /></div>
              <div className="space-y-2"><Label>Google Maps API Key</Label><Input value={data.googleMapsApiKey} onChange={(e) => set('googleMapsApiKey', e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Configurações'}</Button>
      </div>
    </div>
  )
}