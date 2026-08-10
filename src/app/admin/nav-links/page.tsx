'use client'

import { useEffect, useState } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

interface NavLink {
  id?: string
  label: string
  href: string
  sortOrder: number
}

export default function NavLinksPage() {
  const [links, setLinks] = useState<NavLink[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminApi.navLinks.get()
      .then((res) => setLinks(res || []))
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [])

  const addLink = () => setLinks([...links, { label: '', href: '', sortOrder: links.length }])
  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i))
  const updateLink = (i: number, field: string, value: string) => {
    setLinks(links.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))
  }

  const moveUp = (i: number) => {
    if (i === 0) return
    const arr = [...links]
    ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
    arr.forEach((l, idx) => { l.sortOrder = idx })
    setLinks(arr)
  }

  const moveDown = (i: number) => {
    if (i === links.length - 1) return
    const arr = [...links]
    ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
    arr.forEach((l, idx) => { l.sortOrder = idx })
    setLinks(arr)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.navLinks.update(links)
      toast.success('Links atualizados!')
    } catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Links de Navegação</h2>
          <p className="text-sm text-gray-500">Ordene e edite o menu do site</p>
        </div>
        <Button onClick={addLink}><Plus className="mr-2 h-4 w-4" /> Adicionar Link</Button>
      </div>

      <Card className="border border-gray-200">
        <CardHeader><CardTitle className="text-lg">Menu principal</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {links.length === 0 && <p className="text-sm text-gray-400">Nenhum link cadastrado</p>}
          {links.map((link, i) => (
            <div key={link.id || i} className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => moveUp(i)} className="text-gray-300 hover:text-gray-500 text-xs" disabled={i === 0}>▲</button>
                <button type="button" onClick={() => moveDown(i)} className="text-gray-300 hover:text-gray-500 text-xs" disabled={i === links.length - 1}>▼</button>
              </div>
              <GripVertical className="h-5 w-5 shrink-0 text-gray-300" />
              <Input value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)} placeholder="Rótulo" className="flex-1" />
              <Input value={link.href} onChange={(e) => updateLink(i, 'href', e.target.value)} placeholder="#secao" className="flex-1" />
              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeLink(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Links'}</Button>
      </div>
    </div>
  )
}
