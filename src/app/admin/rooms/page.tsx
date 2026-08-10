'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

interface Room {
  id: string
  name: string
  slug: string
  price: number
  capacity: number
  size: number
  bedType: string
  published: boolean
  images: Array<{ src: string; alt: string }>
}

export default function RoomsListPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi.rooms
      .list()
      .then((res) => { if (!cancelled) setRooms(res || []) })
      .catch(() => { if (!cancelled) toast.error('Erro ao carregar quartos') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await adminApi.rooms.delete(deleteId)
      toast.success('Quarto excluído')
      setRooms((prev) => prev.filter((r) => r.id !== deleteId))
    } catch {
      toast.error('Erro ao excluir')
    }
    setDeleteId(null)
  }

  const togglePublished = async (room: Room) => {
    try {
      await adminApi.rooms.update(room.id, { published: !room.published })
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, published: !r.published } : r))
      )
      toast.success(room.published ? 'Quarto despublicado' : 'Quarto publicado')
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Quartos</h2>
          <p className="text-sm text-gray-500">Gerencie as acomodações</p>
        </div>
        <Link href="/admin/rooms/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Novo Quarto</Button>
        </Link>
      </div>

      <div className="space-y-3">
        {rooms.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-400">Nenhum quarto cadastrado</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-gray-100">
                {room.images?.[0]?.src ? (
                  <img src={room.images[0].src} alt={room.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <Eye className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{room.name}</h3>
                  <Badge variant={room.published ? 'default' : 'secondary'}>
                    {room.published ? 'Publicado' : 'Rascunho'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  R$ {room.price.toFixed(2)} · {room.capacity} hóspedes · {room.size}m² · {room.bedType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {room.published ? <Eye className="h-4 w-4 text-gray-400" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                  <Switch checked={room.published} onCheckedChange={() => togglePublished(room)} />
                </div>
                <Link href={`/admin/rooms/${room.id}`}>
                  <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>
                </Link>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(room.id)}>
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
            <AlertDialogTitle>Excluir quarto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O quarto e todas as imagens e comodidades associadas serão removidos.</AlertDialogDescription>
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
