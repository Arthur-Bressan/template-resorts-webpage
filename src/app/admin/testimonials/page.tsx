'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

interface Testimonial {
  id: string
  name: string
  location: string
  avatar: string
  text: string
  rating: number
  published: boolean
  sortOrder: number
}

export default function TestimonialsListPage() {
  const [items, setItems] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    adminApi.testimonials.list()
      .then((res) => { if (active) setItems(res || []) })
      .catch(() => { if (active) toast.error('Erro ao carregar') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await adminApi.testimonials.delete(deleteId)
      toast.success('Depoimento excluído')
      setItems((prev) => prev.filter((t) => t.id !== deleteId))
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
          <h2 className="text-2xl font-semibold text-gray-900">Depoimentos</h2>
          <p className="text-sm text-gray-500">Gerencie avaliações de hóspedes</p>
        </div>
        <Link href="/admin/testimonials/new"><Button><Plus className="mr-2 h-4 w-4" /> Novo Depoimento</Button></Link>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-400">Nenhum depoimento cadastrado</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
                {item.avatar ? (
                  <img src={item.avatar} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400 text-lg font-medium">
                    {item.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <Badge variant={item.published ? 'default' : 'secondary'}>{item.published ? 'Publicado' : 'Rascunho'}</Badge>
                </div>
                <p className="text-sm text-gray-500">{item.location}</p>
                <div className="mt-1 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < item.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                <p className="mt-1 truncate text-sm text-gray-500">{item.text}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/testimonials/${item.id}`}>
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
            <AlertDialogTitle>Excluir depoimento?</AlertDialogTitle>
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