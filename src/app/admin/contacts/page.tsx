'use client'

import { useEffect, useState } from 'react'
import { Search, Mail, MailOpen, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  message: string
  read: boolean
  createdAt: string
}

export default function ContactsPage() {
  const [items, setItems] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleFilterChange = (f: 'all' | 'unread') => {
    setFilter(f)
    setLoading(true)
  }

  useEffect(() => {
    let active = true
    const p = filter === 'unread' ? { unread: true as const } : undefined
    adminApi.contacts.list(p)
      .then((res) => {
        if (active) {
          const list = res?.items || res?.data || res || []
          setItems(Array.isArray(list) ? list : [])
        }
      })
      .catch(() => { if (active) toast.error('Erro ao carregar') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filter])

  const markRead = async (id: string) => {
    try {
      await adminApi.contacts.markRead(id)
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, read: true } : c)))
      toast.success('Marcado como lido')
    } catch { toast.error('Erro') }
  }

  const filtered = search
    ? items.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
    : items

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Contatos</h2>
        <p className="text-sm text-gray-500">Mensagens recebidas pelo formulário</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterChange('all')}>Todos ({items.length})</Button>
          <Button variant={filter === 'unread' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterChange('unread')}>Não lidos ({items.filter(c => !c.read).length})</Button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border border-gray-200"><CardContent className="p-12 text-center"><p className="text-gray-400">Nenhum contato</p></CardContent></Card>
        ) : (
          filtered.map((contact) => (
            <Card key={contact.id} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5">
                      {contact.read ? <MailOpen className="h-5 w-5 text-gray-300" /> : <Mail className="h-5 w-5 text-[var(--color-primary)]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900">{contact.name}</h3>
                        <span className="text-sm text-gray-400">{contact.email}</span>
                        {contact.phone && <span className="text-sm text-gray-400">· {contact.phone}</span>}
                      </div>
                      <p className={`mt-1 text-sm ${expandedId === contact.id ? 'text-gray-600' : 'truncate text-gray-500'}`}>{contact.message}</p>
                      <p className="mt-1 text-xs text-gray-400">{new Date(contact.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!contact.read && (
                      <Button variant="outline" size="sm" onClick={() => markRead(contact.id)}>
                        <CheckCircle className="mr-1 h-4 w-4" /> Lido
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}>
                      {expandedId === contact.id ? 'Recolher' : 'Ver mais'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
