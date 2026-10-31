'use client'

import { useEffect, useState } from 'react'
import { Search, Mail, MailOpen, CheckCircle, CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'
import { ManualReservationForm, type ReservationLead } from '@/components/admin/reservations/ManualReservationForm'

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  message: string
  consent: boolean
  read: boolean
  status: 'new' | 'contacted' | 'converted' | 'closed'
  checkIn: string | null
  checkOut: string | null
  desiredCategory: string | null
  desiredCategoryId: string | null
  createdAt: string
}

export default function ContactsPage() {
  const [items, setItems] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | Contact['status']>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [convertingLead, setConvertingLead] = useState<ReservationLead | null>(null)

  const handleFilterChange = (f: 'all' | 'unread') => {
    if (filter === f && page === 1) return
    setFilter(f)
    setPage(1)
    setLoading(true)
  }

  useEffect(() => {
    let active = true
    const p = filter === 'unread' ? { unread: true as const } : undefined
    adminApi.contacts.list({ ...p, page, status: statusFilter })
      .then((res) => {
        if (active) {
          const list = res?.items || res?.data || res || []
          setItems(Array.isArray(list) ? list : [])
          setTotal(typeof res?.total === 'number' ? res.total : Array.isArray(list) ? list.length : 0)
        }
      })
      .catch(() => { if (active) toast.error('Erro ao carregar') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filter, statusFilter, page])

  const markRead = async (id: string) => {
    try {
      await adminApi.contacts.markRead(id)
      setItems((prev) => prev.flatMap((c) => c.id !== id ? [c] : filter === 'unread' ? [] : [{ ...c, read: true }]))
      if (filter === 'unread') {
        setTotal((count) => Math.max(0, count - 1))
        if (page > 1 && (page - 1) * 50 >= total - 1) setPage(page - 1)
      }
      toast.success('Marcado como lido')
    } catch { toast.error('Erro') }
  }

  const updateStatus = async (id: string, status: Contact['status']) => {
    if (status === 'converted') {
      toast.error('Converta o contato pela criação de uma reserva para validar disponibilidade.')
      return
    }
    try {
      await adminApi.contacts.updateStatus(id, status)
      setItems((prev) => prev.flatMap((contact) => contact.id !== id ? [contact] : statusFilter !== 'all' && statusFilter !== status ? [] : [{ ...contact, status }]))
      if (statusFilter !== 'all' && statusFilter !== status) {
        setTotal((count) => Math.max(0, count - 1))
        if (page > 1 && (page - 1) * 50 >= total - 1) setPage(page - 1)
      }
      toast.success('Status atualizado')
    } catch { toast.error('Erro ao atualizar status') }
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
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterChange('all')}>Todos</Button>
          <Button variant={filter === 'unread' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterChange('unread')}>Não lidos</Button>
        </div>
        <label className="text-sm text-gray-600">
          Status{' '}
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); setLoading(true) }} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
            <option value="all">Todos</option>
            <option value="new">Novo</option>
            <option value="contacted">Em atendimento</option>
            <option value="converted">Convertido</option>
            <option value="closed">Encerrado</option>
          </select>
        </label>
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
                        {contact.email && <a className="text-sm text-gray-400 hover:text-gray-700" href={`mailto:${contact.email}`}>{contact.email}</a>}
                        {contact.phone && <span className="text-sm text-gray-400">· {contact.phone}</span>}
                      </div>
                      <p className={`mt-1 text-sm ${expandedId === contact.id ? 'text-gray-600' : 'truncate text-gray-500'}`}>{contact.message}</p>
                      <p className="mt-1 text-xs text-gray-400">{new Date(contact.createdAt).toLocaleString('pt-BR')}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>Consentimento: {contact.consent ? 'sim' : 'não'}</span>
                        {contact.checkIn && contact.checkOut && <span>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(contact.checkIn))} – {new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(contact.checkOut))}</span>}
                        {contact.desiredCategory && <span>Categoria: {contact.desiredCategory}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="sr-only" htmlFor={`lead-status-${contact.id}`}>Status de {contact.name}</label>
                    <select id={`lead-status-${contact.id}`} value={contact.status || 'new'} onChange={(event) => updateStatus(contact.id, event.target.value as Contact['status'])} className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700">
                      <option value="new">Novo</option>
                      <option value="contacted">Em atendimento</option>
                      {contact.status === 'converted' && <option value="converted">Convertido</option>}
                      <option value="closed">Encerrado</option>
                    </select>
                    {!contact.read && (
                      <Button variant="outline" size="sm" onClick={() => markRead(contact.id)}>
                        <CheckCircle className="mr-1 h-4 w-4" /> Lido
                      </Button>
                    )}
                    {contact.status !== 'converted' && contact.status !== 'closed' && (
                      <Button variant="outline" size="sm" onClick={() => setConvertingLead({
                        id: contact.id,
                        name: contact.name,
                        email: contact.email,
                        phone: contact.phone,
                        checkIn: contact.checkIn,
                        checkOut: contact.checkOut,
                        desiredCategoryId: contact.desiredCategoryId,
                        desiredCategory: contact.desiredCategory,
                      })}>
                        <CalendarCheck className="mr-1 h-4 w-4" /> Converter
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
      {total > 50 && <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Página {page} de {Math.ceil(total / 50)}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(page - 1); setLoading(true) }}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 50)} onClick={() => { setPage(page + 1); setLoading(true) }}>Próxima</Button>
        </div>
      </div>}
      {convertingLead && <ManualReservationForm
        lead={convertingLead}
        onClose={() => setConvertingLead(null)}
        onCreated={() => setItems((previous) => previous.map((contact) => contact.id === convertingLead.id ? { ...contact, status: 'converted' } : contact))}
      />}
    </div>
  )
}
