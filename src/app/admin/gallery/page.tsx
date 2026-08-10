'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, GripVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

interface GalleryItem {
  id: string
  src: string
  alt: string
  span: string
  published: boolean
  sortOrder: number
}

const SPAN_OPTIONS = [
  { value: 'col-span-1 row-span-1', label: 'Padrão' },
  { value: 'col-span-2 row-span-1', label: 'Larga (2 col)' },
  { value: 'col-span-1 row-span-2', label: 'Alta (2 lin)' },
  { value: 'col-span-2 row-span-2', label: 'Larga + Alta (2x2)' },
]

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<Partial<GalleryItem> | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    adminApi.gallery.list()
      .then((res) => { if (active) setItems(res || []) })
      .catch(() => { if (active) toast.error('Erro ao carregar') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const openCreate = () => {
    setEditItem({ src: '', alt: '', span: 'col-span-1 row-span-1', published: true, sortOrder: items.length })
    setIsCreating(true)
  }

  const openEdit = (item: GalleryItem) => {
    setEditItem(item)
    setIsCreating(false)
  }

  const handleSave = async () => {
    if (!editItem?.src) { toast.error('Imagem é obrigatória'); return }
    try {
      if (isCreating) {
        await adminApi.gallery.create(editItem)
        toast.success('Imagem adicionada!')
      } else if (editItem.id) {
        await adminApi.gallery.update(editItem.id, editItem)
        toast.success('Imagem atualizada!')
      }
      setEditItem(null)
      adminApi.gallery.list().then((res) => setItems(res || [])).catch(() => {})
    } catch { toast.error('Erro ao salvar') }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await adminApi.gallery.delete(deleteId)
      toast.success('Imagem excluída')
      setItems((prev) => prev.filter((i) => i.id !== deleteId))
    } catch { toast.error('Erro ao excluir') }
    setDeleteId(null)
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Galeria</h2>
          <p className="text-sm text-gray-500">Gerencie as imagens da galeria</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Adicionar Imagem</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-full rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-400">Nenhuma imagem na galeria</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="aspect-video overflow-hidden bg-gray-100">
                <img src={item.src} alt={item.alt} className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center justify-between p-3">
                <p className="truncate text-sm text-gray-600">{item.alt || 'Sem descrição'}</p>
                <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{SPAN_OPTIONS.find(s => s.value === item.span)?.label || 'Padrão'}</span>
              </div>
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="secondary" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => setDeleteId(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Nova Imagem' : 'Editar Imagem'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ImageUpload value={editItem?.src || ''} onChange={(url) => setEditItem({ ...editItem!, src: url })} label="Imagem" />
            <div className="space-y-2"><Label>Texto alternativo</Label><Input value={editItem?.alt || ''} onChange={(e) => setEditItem({ ...editItem!, alt: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Tamanho</Label>
              <select
                value={editItem?.span || 'col-span-1 row-span-1'}
                onChange={(e) => setEditItem({ ...editItem!, span: e.target.value })}
                className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
              >
                {SPAN_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            {editItem && (
              <div className="flex items-center gap-2">
                <Label>Publicado</Label>
                <Switch checked={editItem.published ?? true} onCheckedChange={(v) => setEditItem({ ...editItem, published: v })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imagem?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}