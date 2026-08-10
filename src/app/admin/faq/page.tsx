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

interface FAQItem {
  id: string
  question: string
  answer: string
  published: boolean
  sortOrder: number
}

export default function FAQListPage() {
  const [items, setItems] = useState<FAQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    adminApi.faq.list()
      .then((res) => { if (active) setItems(res || []) })
      .catch(() => { if (active) toast.error('Erro ao carregar') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await adminApi.faq.delete(deleteId)
      toast.success('FAQ excluída')
      setItems((prev) => prev.filter((f) => f.id !== deleteId))
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
          <h2 className="text-2xl font-semibold text-gray-900">Perguntas Frequentes</h2>
          <p className="text-sm text-gray-500">Gerencie o FAQ do site</p>
        </div>
        <Link href="/admin/faq/new"><Button><Plus className="mr-2 h-4 w-4" /> Nova Pergunta</Button></Link>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-400">Nenhuma pergunta cadastrada</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{item.question}</h3>
                  <Badge variant={item.published ? 'default' : 'secondary'}>{item.published ? 'Publicado' : 'Rascunho'}</Badge>
                </div>
                <p className="mt-1 truncate text-sm text-gray-500">{item.answer}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/faq/${item.id}`}>
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
            <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
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