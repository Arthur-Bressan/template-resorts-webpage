'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  event: string
  payload: { title?: string; message?: string; href?: string }
  readAt: string | null
  createdAt: string
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    adminApi.notifications.list(page)
      .then((response) => {
        if (active) {
          setItems(Array.isArray(response?.items) ? response.items : [])
          setUnreadCount(typeof response?.unreadCount === 'number' ? response.unreadCount : 0)
          setTotal(typeof response?.total === 'number' ? response.total : 0)
        }
      })
      .catch(() => { if (active) toast.error('Erro ao carregar notificações') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page])

  const markRead = async (id: string) => {
    try {
      const item = await adminApi.notifications.markRead(id)
      setItems((previous) => previous.map((entry) => entry.id === id ? { ...entry, readAt: item?.readAt || new Date().toISOString() } : entry))
      setUnreadCount((count) => Math.max(0, count - 1))
    } catch {
      toast.error('Erro ao atualizar a notificação')
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Notificações</h2>
        <p className="text-sm text-gray-500">Avisos da sua hospedagem · {unreadCount} não lida(s)</p>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card className="border border-gray-200"><CardContent className="p-12 text-center"><Bell className="mx-auto mb-3 h-6 w-6 text-gray-300" /><p className="text-gray-400">Nenhuma notificação</p></CardContent></Card>
        ) : items.map((item) => {
          const href = item.payload?.href?.startsWith('/admin') ? item.payload.href : null
          return (
            <Card key={item.id} className={`border border-gray-200 ${item.readAt ? 'bg-white' : 'bg-blue-50/40'}`}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Bell className={`mt-0.5 h-5 w-5 shrink-0 ${item.readAt ? 'text-gray-300' : 'text-[var(--color-primary)]'}`} />
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900">{item.payload?.title || 'Notificação'}</h3>
                    <p className="mt-1 text-sm text-gray-600">{item.payload?.message || ''}</p>
                    <p className="mt-2 text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('pt-BR')}</p>
                    {href && <Link href={href} className="mt-2 inline-block text-sm text-[var(--color-primary)] hover:underline">Abrir</Link>}
                  </div>
                </div>
                {!item.readAt && <Button variant="outline" size="sm" onClick={() => markRead(item.id)}><Check className="mr-1 h-4 w-4" />Lida</Button>}
              </CardContent>
            </Card>
          )
        })}
      </div>
      {total > 100 && <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Página {page} de {Math.ceil(total / 100)}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(page - 1); setLoading(true) }}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 100)} onClick={() => { setPage(page + 1); setLoading(true) }}>Próxima</Button>
        </div>
      </div>}
    </div>
  )
}
