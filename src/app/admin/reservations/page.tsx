'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

interface Reservation {
  id: string
  guestName: string
  guestEmail: string
  guestPhone: string
  room: { name: string } | null
  checkIn: string
  checkOut: string
  guests: number
  totalPrice: number
  status: string
  notes: string
  createdAt: string
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmada', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
  completed: { label: 'Concluída', className: 'bg-blue-100 text-blue-700' },
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled']

export default function ReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    adminApi.reservations.list({ status: filter || undefined })
      .then((res) => {
        const list = res?.items || res?.data || res || []
        setItems(Array.isArray(list) ? list : [])
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      await adminApi.reservations.updateStatus(id, status)
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
      toast.success('Status atualizado')
    } catch { toast.error('Erro ao atualizar') }
    finally { setUpdatingId(null) }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Reservas</h2>
        <p className="text-sm text-gray-500">Gerencie as reservas recebidas</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={!filter ? 'default' : 'outline'} size="sm" onClick={() => setFilter('')}>Todas</Button>
        {STATUS_OPTIONS.map((s) => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}>
            {STATUS_MAP[s]?.label || s}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card className="border border-gray-200"><CardContent className="p-12 text-center">
            <CalendarCheck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-gray-400">Nenhuma reserva encontrada</p>
          </CardContent></Card>
        ) : (
          items.map((res) => {
            const statusInfo = STATUS_MAP[res.status] || { label: res.status, className: 'bg-gray-100 text-gray-700' }
            return (
              <Card key={res.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900">{res.guestName}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}>{statusInfo.label}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {res.room?.name || 'Quarto removido'} · {formatDate(res.checkIn)} → {formatDate(res.checkOut)}
                      </p>
                      <p className="text-sm text-gray-500">{res.guests} hóspede(s) · <span className="font-medium text-gray-900">R$ {res.totalPrice?.toFixed(2)}</span></p>
                      {res.notes && <p className="text-sm text-gray-400 italic">{res.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {STATUS_OPTIONS.filter(s => s !== res.status).map((s) => (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          disabled={updatingId === res.id}
                          onClick={() => updateStatus(res.id, s)}
                          className="text-xs"
                        >
                          {STATUS_MAP[s]?.label || s}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}