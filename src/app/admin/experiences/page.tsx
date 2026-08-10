'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

interface Experience {
  id: string
  title: string
  description: string
  image: string
  duration: string
  difficulty: string
  published: boolean
  sortOrder: number
}

export default function ExperiencesListPage() {
  const [items, setItems] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi.experiences.list()
      .then((res) => { if (!cancelled) setItems(res || []) })
      .catch(() => { if (!cancelled) toast.error('Erro ao carregar') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await adminApi.experiences.delete(deleteId)
      toast.success('Experiência excluída')
      setItems((prev) => prev.filter((e) => e.id !== deleteId))
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
          <h2 className="text-2xl font-semibold text-gray-900">Experiências</h2>
          <p className="text-sm text-gray-500">Gerencie as experiências oferecidas</p>
        </div>
        <Button onClick={() => toast.info('Crie experiências pelo formulário abaixo')}><Plus className="mr-2 h-4 w-4" /> Nova Experiência</Button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-400">Nenhuma experiência cadastrada</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-gray-100">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                ) : <div className="flex h-full w-full items-center justify-center text-gray-300 text-xs">Sem img</div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{item.title}</h3>
                  <Badge variant={item.published ? 'default' : 'secondary'}>{item.published ? 'Publicado' : 'Rascunho'}</Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500">{item.duration} · {item.difficulty}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/experiences/${item.id}`}>
                  <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>
                </Link>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir experiência?</AlertDialogTitle>
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
